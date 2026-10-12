-- Notificaciones: cada aviso guarda qué registros cambiaron, para que al tocarlo la app abra
-- la sección, muestre ese registro y lo remarque un momento.
-- Requiere 20261013_notificaciones_activos.sql. Se puede correr varias veces sin problema.

alter table public.notificaciones add column if not exists ids text[];

-- Bandeja: ahora devuelve también los registros del movimiento.
drop function if exists public.mis_notificaciones(int);
create or replace function public.mis_notificaciones(p_limite int default 40)
returns table (id bigint, modulo text, tabla text, operacion text, n int, razones text[], actor_nombre text,
               fecha timestamptz, nueva boolean, ids text[])
language sql stable security definer set search_path = public as $$
  select x.id, x.modulo, x.tabla, x.operacion, x.n, x.razones, x.actor_nombre, x.actualizado,
         x.actualizado > p.visto, x.ids
  from notificaciones x
  join notif_perfiles p on p.user_id = auth.uid()
  where x.actualizado > now() - interval '30 days'
    and x.actor is distinct from auth.uid()
    and (x.actor_usuario is null or p.username is null or x.actor_usuario <> p.username)
    and notif_le_toca(p.rol, p.razones, p.vistas, x.modulo, x.razones)
  order by x.actualizado desc
  limit least(greatest(coalesce(p_limite, 40), 1), 200)
$$;
revoke all on function public.mis_notificaciones(int) from public, anon;
grant execute on function public.mis_notificaciones(int) to authenticated;

-- Disparador: igual que antes y además guarda los id de los registros (hasta 30 por aviso).
create or replace function public.notif_movimiento()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare
  v_n int;
  v_razones text[];
  v_ids text[];
  v_cols text[];
  v_partes text[] := '{}';
  v_col text;
  v_modulo text;
  v_actor uuid := auth.uid();
  v_nombre text;
  v_usuario text;
  v_id bigint;
  v_url text;
  v_secreto text;
  v_solo_estado boolean := (TG_TABLE_NAME = 'inventarios' and TG_OP = 'UPDATE');
begin
  -- Inventarios de activos: al modificar, solo cuenta el cambio de estado (no cada guardado del conteo).
  if v_solo_estado then
    execute 'select count(*) from cambios c join antes a on a.id = c.id where c.estado is distinct from a.estado' into v_n;
  else
    execute 'select count(*) from cambios' into v_n;
  end if;
  if v_n = 0 then return null; end if;

  select array_agg(column_name::text) into v_cols
  from information_schema.columns
  where table_schema = 'public' and table_name = TG_TABLE_NAME
    and column_name in ('id', 'razon', 'razon_aviso', 'razon_social', 'centro_id', 'destino_id', 'origen_id');
  v_cols := coalesce(v_cols, '{}');

  -- Registros del cambio.
  if 'id' = any (v_cols) then
    if v_solo_estado then
      execute 'select array_agg(x) from (select c.id::text as x from cambios c join antes a on a.id = c.id '
              'where c.estado is distinct from a.estado limit 30) q' into v_ids;
    else
      execute 'select array_agg(x) from (select id::text as x from cambios limit 30) q' into v_ids;
    end if;
  end if;

  -- Razones del cambio: columnas de razón en claro (un valor cifrado no pasa el filtro de letras y
  -- números) y, en Activos, la razón de la sucursal del registro.
  foreach v_col in array v_cols loop
    if v_col in ('razon', 'razon_aviso', 'razon_social') then
      v_partes := v_partes || format('select %I::text as r from cambios', v_col);
    elsif v_col in ('centro_id', 'destino_id', 'origen_id') and to_regclass('public.centros') is not null then
      v_partes := v_partes || format('select ce.razon_social::text as r from cambios c join public.centros ce on ce.id::text = c.%I::text', v_col);
    end if;
  end loop;
  if array_length(v_partes, 1) > 0 then
    execute 'select array_agg(distinct r order by r) from (select upper(btrim(r)) as r from ('
            || array_to_string(v_partes, ' union all ') || ') u) x where r ~ ''^[A-Z0-9]{2,10}$''' into v_razones;
  end if;

  v_modulo := case TG_TABLE_NAME
    when 'tareas_finalizadas' then 'finalizadas'
    when 'archivo_documentos' then 'archivero'
    when 'movimientos' then 'activos'
    when 'inventarios' then 'activos'
    when 'solicitudes_baja' then 'activos'
    else TG_TABLE_NAME end;

  -- Quién lo hizo: perfil del Monitor o, si no lo tiene, su cuenta de Activos (usuarios2).
  select usuario, username into v_nombre, v_usuario from notif_perfiles where user_id = v_actor;
  if v_nombre is null and v_actor is not null and to_regclass('public.usuarios2') is not null then
    begin
      execute 'select nombre_completo::text, lower(btrim(username::text)) from public.usuarios2 where id = $1'
        into v_nombre, v_usuario using v_actor;
    exception when others then
      v_nombre := null; v_usuario := null;
    end;
  end if;

  update notificaciones x
     set n = x.n + v_n,
         actualizado = now(),
         ids = (select array_agg(distinct y) from (
                  select y from unnest(coalesce(x.ids, '{}') || coalesce(v_ids, '{}')) y limit 60) q)
  where x.id = (select id from notificaciones
                where tabla = TG_TABLE_NAME and operacion = TG_OP
                  and actor is not distinct from v_actor
                  and razones is not distinct from v_razones
                  and actualizado > now() - interval '90 seconds'
                order by id desc limit 1)
  returning x.id into v_id;
  if v_id is not null then return null; end if;

  insert into notificaciones (modulo, tabla, operacion, n, razones, actor, actor_nombre, actor_usuario, ids)
  values (v_modulo, TG_TABLE_NAME, TG_OP, v_n, v_razones, v_actor, nullif(btrim(v_nombre), ''), nullif(v_usuario, ''), v_ids)
  returning id into v_id;

  select valor into v_url from push_config where clave = 'url';
  select valor into v_secreto from push_config where clave = 'secreto';
  if v_url is not null then
    perform net.http_post(
      url := v_url,
      body := jsonb_build_object('id', v_id),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-aviso', v_secreto)
    );
  end if;
  return null;
exception when others then
  return null;
end $$;
