-- Notificaciones: integración completa del módulo de Activos.
-- Requiere 20261012_notificaciones_bandeja.sql. Se puede correr varias veces sin problema.
--   - Razón social de activos, movimientos, inventarios y solicitudes de baja: sale de la columna
--     razon_social o de la sucursal (centro_id / destino_id / origen_id -> centros.razon_social).
--   - Quién hizo el movimiento: en Activos la sesión es otra cuenta (usuarios2), así que el nombre
--     sale de ahí y el usuario se compara por nombre de usuario para no avisarle de lo suyo.
--   - Solicitudes de baja también avisan.
--   - Inventarios: avisa al crear y al cambiar de estado (p. ej. al finalizar), no en cada
--     guardado mientras se está contando.
--   - La bandeja devuelve la tabla del movimiento para que el texto diga "activo", "movimiento de
--     activos", "inventario de activos" o "solicitud de baja".
--   - Rol sistemas: además del archivero recibe los avisos de activos (módulo que sí ve).

alter table public.notif_perfiles add column if not exists username text;
alter table public.notificaciones add column if not exists actor_usuario text;

-- Regla de a quién le toca cada aviso (igual que antes; sistemas ahora también recibe activos).
create or replace function public.notif_le_toca(p_rol text, p_razones text[], p_vistas text[],
                                                 p_modulo text, p_raz text[])
returns boolean language sql immutable as $$
  select
    case
      when p_rol in ('admin', 'admin_auditor') then true
      when p_rol = 'sistemas' then p_modulo in ('archivero', 'activos')
      when p_modulo in ('archivero', 'activos') then p_rol = 'auditor'
      when p_rol = 'auditor' and p_modulo = 'finalizadas' then coalesce(p_modulo = any (p_vistas), false)
      when p_rol in ('auditor', 'viewer') then p_vistas is null or p_modulo = any (p_vistas)
      else false
    end
    and
    case
      when p_rol in ('admin', 'viewer') or p_razones is null then true
      when p_raz is null then p_modulo = 'activos'
      else p_razones && p_raz
    end
$$;

-- Perfil del usuario con sesión: ahora guarda también su nombre de usuario.
drop function if exists public.notif_perfil(text, text, text[], text[]);
create or replace function public.notif_perfil(p_usuario text, p_rol text, p_razones text[], p_vistas text[],
                                                p_username text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_razones text[];
begin
  if auth.uid() is null or coalesce(p_rol, '') = '' then return; end if;
  select array_agg(distinct upper(btrim(r))) into v_razones from unnest(p_razones) r where btrim(r) <> '';
  insert into notif_perfiles (user_id, usuario, rol, razones, vistas, username)
  values (auth.uid(), p_usuario, p_rol, v_razones, nullif(p_vistas, '{}'::text[]), nullif(lower(btrim(p_username)), ''))
  on conflict (user_id) do update
    set usuario = excluded.usuario, rol = excluded.rol, razones = excluded.razones,
        vistas = excluded.vistas, username = coalesce(excluded.username, notif_perfiles.username),
        actualizado = now();
  delete from notificaciones where creado < now() - interval '60 days';
end $$;

-- Bandeja: agrega la tabla del movimiento y no muestra lo que el propio usuario hizo en Activos.
drop function if exists public.mis_notificaciones(int);
create or replace function public.mis_notificaciones(p_limite int default 40)
returns table (id bigint, modulo text, tabla text, operacion text, n int, razones text[], actor_nombre text,
               fecha timestamptz, nueva boolean)
language sql stable security definer set search_path = public as $$
  select x.id, x.modulo, x.tabla, x.operacion, x.n, x.razones, x.actor_nombre, x.actualizado, x.actualizado > p.visto
  from notificaciones x
  join notif_perfiles p on p.user_id = auth.uid()
  where x.actualizado > now() - interval '30 days'
    and x.actor is distinct from auth.uid()
    and (x.actor_usuario is null or p.username is null or x.actor_usuario <> p.username)
    and notif_le_toca(p.rol, p.razones, p.vistas, x.modulo, x.razones)
  order by x.actualizado desc
  limit least(greatest(coalesce(p_limite, 40), 1), 200)
$$;

create or replace function public.notif_tokens(p_id bigint)
returns table (token text)
language sql stable security definer set search_path = public as $$
  select d.token
  from notificaciones x
  join push_dispositivos d on d.user_id is distinct from x.actor
  join notif_perfiles p on p.user_id = d.user_id
  where x.id = p_id
    and (x.actor_usuario is null or p.username is null or x.actor_usuario <> p.username)
    and notif_le_toca(p.rol, p.razones, p.vistas, x.modulo, x.razones)
$$;

revoke all on function public.notif_perfil(text, text, text[], text[], text) from public, anon;
revoke all on function public.mis_notificaciones(int) from public, anon;
revoke all on function public.notif_tokens(bigint) from public, anon, authenticated;
grant execute on function public.notif_perfil(text, text, text[], text[], text) to authenticated;
grant execute on function public.mis_notificaciones(int) to authenticated;
grant execute on function public.notif_tokens(bigint) to service_role;

-- Disparador: registra el movimiento y avisa a la Edge Function.
create or replace function public.notif_movimiento()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare
  v_n int;
  v_razones text[];
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
begin
  -- Inventarios de activos: al modificar, solo cuenta el cambio de estado (no cada guardado del conteo).
  if TG_TABLE_NAME = 'inventarios' and TG_OP = 'UPDATE' then
    execute 'select count(*) from cambios c join antes a on a.id = c.id where c.estado is distinct from a.estado' into v_n;
  else
    execute 'select count(*) from cambios' into v_n;
  end if;
  if v_n = 0 then return null; end if;

  -- Razones del cambio: columnas de razón en claro (un valor cifrado no pasa el filtro de letras y
  -- números) y, en Activos, la razón de la sucursal del registro.
  select array_agg(column_name::text) into v_cols
  from information_schema.columns
  where table_schema = 'public' and table_name = TG_TABLE_NAME
    and column_name in ('razon', 'razon_aviso', 'razon_social', 'centro_id', 'destino_id', 'origen_id');
  foreach v_col in array coalesce(v_cols, '{}') loop
    if v_col in ('razon', 'razon_aviso', 'razon_social') then
      v_partes := v_partes || format('select %I::text as r from cambios', v_col);
    elsif to_regclass('public.centros') is not null then
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

  -- Quién lo hizo: perfil del Monitor o, si el cambio viene de Activos, su cuenta de usuarios2.
  select usuario, username into v_nombre, v_usuario from notif_perfiles where user_id = v_actor;
  if v_nombre is null and v_actor is not null and to_regclass('public.usuarios2') is not null then
    begin
      execute 'select nombre_completo::text, lower(btrim(username::text)) from public.usuarios2 where id = $1'
        into v_nombre, v_usuario using v_actor;
    exception when others then
      v_nombre := null; v_usuario := null;
    end;
  end if;

  update notificaciones set n = n + v_n, actualizado = now()
  where id = (select id from notificaciones
              where tabla = TG_TABLE_NAME and operacion = TG_OP
                and actor is not distinct from v_actor
                and razones is not distinct from v_razones
                and actualizado > now() - interval '90 seconds'
              order by id desc limit 1)
  returning id into v_id;
  if v_id is not null then return null; end if;

  insert into notificaciones (modulo, tabla, operacion, n, razones, actor, actor_nombre, actor_usuario)
  values (v_modulo, TG_TABLE_NAME, TG_OP, v_n, v_razones, v_actor, nullif(btrim(v_nombre), ''), nullif(v_usuario, ''))
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

-- Disparadores en las tablas que existan (ahora también solicitudes_baja).
do $$
declare t text;
begin
  foreach t in array array['tareas', 'tareas_finalizadas', 'auditorias', 'actividades', 'ajustes', 'mermas',
                           'archivo_documentos', 'activos', 'movimientos', 'inventarios', 'solicitudes_baja'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists push_insertar on public.%I', t);
      execute format('drop trigger if exists push_actualizar on public.%I', t);
      execute format('drop trigger if exists notif_insertar on public.%I', t);
      execute format('drop trigger if exists notif_actualizar on public.%I', t);
      execute format('drop trigger if exists notif_eliminar on public.%I', t);
      execute format('create trigger notif_insertar after insert on public.%I referencing new table as cambios '
                     'for each statement execute function public.notif_movimiento()', t);
      execute format('create trigger notif_actualizar after update on public.%I referencing old table as antes new table as cambios '
                     'for each statement execute function public.notif_movimiento()', t);
      execute format('create trigger notif_eliminar after delete on public.%I referencing old table as cambios '
                     'for each statement execute function public.notif_movimiento()', t);
      raise notice 'Notificaciones activadas en %', t;
    end if;
  end loop;
end $$;
