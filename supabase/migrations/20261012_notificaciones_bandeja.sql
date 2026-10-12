-- Bandeja de notificaciones (web y app) con filtro por rol y razón social.
-- Cada movimiento en tareas, auditorías, actividades, ajustes, mermas, finalizadas, archivero o
-- activos queda registrado en public.notificaciones. Con ese registro:
--   - la campanita del Monitor (js/app-notificaciones.js) muestra a cada usuario lo que le toca,
--   - la Edge Function "notificar-push" avisa a los teléfonos de esos mismos usuarios.
-- Sustituye a los disparadores de 20261005_notificaciones_push.sql. No hace falta haber corrido
-- esa migración: aquí se crea también lo que necesita de ella (sección 0).
-- Se puede correr varias veces sin problema.

-- 0) Base del push (lo mismo que crea 20261005_notificaciones_push.sql, sin sus disparadores).
create extension if not exists pg_net with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- Teléfonos registrados (los registra la app al iniciar sesión).
create table if not exists public.push_dispositivos (
  token       text primary key,
  user_id     uuid not null,
  usuario     text,
  razones     text[],
  actualizado timestamptz not null default now()
);
alter table public.push_dispositivos enable row level security;   -- sin políticas: solo vía funciones

-- Dirección de la Edge Function y clave para que solo la base pueda llamarla.
create table if not exists public.push_config (clave text primary key, valor text not null);
alter table public.push_config enable row level security;
insert into public.push_config (clave, valor) values
  ('url', 'https://xlygkolfmetytowixtnb.supabase.co/functions/v1/notificar-push'),
  ('secreto', encode(extensions.gen_random_bytes(24), 'hex'))
on conflict (clave) do nothing;

-- Bitácora de avisos push enviados.
create table if not exists public.push_envios (
  id bigserial primary key,
  tabla text not null,
  n int,
  razones text[],
  dispositivos int,
  enviado timestamptz not null default now()
);
alter table public.push_envios enable row level security;

-- La app registra / quita su teléfono (siempre a nombre del usuario con sesión).
create or replace function public.registrar_dispositivo(p_token text, p_usuario text, p_razones text[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or coalesce(p_token, '') = '' then return; end if;
  delete from push_dispositivos where token = p_token;
  insert into push_dispositivos (token, user_id, usuario, razones)
  values (p_token, auth.uid(), p_usuario, nullif(p_razones, '{}'::text[]));
end $$;

create or replace function public.quitar_dispositivo(p_token text)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from push_dispositivos where token = p_token and user_id = auth.uid();
end $$;

revoke all on function public.registrar_dispositivo(text, text, text[]) from public, anon;
revoke all on function public.quitar_dispositivo(text) from public, anon;
grant execute on function public.registrar_dispositivo(text, text, text[]) to authenticated;
grant execute on function public.quitar_dispositivo(text) to authenticated;

-- 1) Razón social en claro para las tablas donde la razón o la tienda se guardan cifradas.
--    La llena la app al guardar (conRazonAviso en js/app-core.js): solo la clave KNO/KSC/KSA.
do $$
declare t text;
begin
  foreach t in array array['ajustes', 'mermas', 'actividades', 'tareas_finalizadas'] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I add column if not exists razon_aviso text', t);
    end if;
  end loop;
end $$;

-- 2) Perfil de avisos de cada usuario (lo registra la app al iniciar sesión, con los datos de
--    su sesión) y la fecha hasta la que ya vio su bandeja.
create table if not exists public.notif_perfiles (
  user_id     uuid primary key,
  usuario     text,
  rol         text not null,
  razones     text[],                       -- razones sociales asignadas (null = todas)
  vistas      text[],                       -- módulos permitidos (null = todos los de su rol)
  visto       timestamptz not null default now(),
  actualizado timestamptz not null default now()
);
alter table public.notif_perfiles enable row level security;      -- sin políticas: solo vía funciones

-- 3) Movimientos registrados.
create table if not exists public.notificaciones (
  id           bigserial primary key,
  modulo       text not null,               -- tareas, auditorias, actividades, ajustes, mermas, finalizadas, archivero, activos
  tabla        text not null,
  operacion    text not null,               -- INSERT, UPDATE, DELETE
  n            int  not null default 1,
  razones      text[],
  actor        uuid,
  actor_nombre text,
  creado       timestamptz not null default now(),
  actualizado  timestamptz not null default now()
);
create index if not exists notificaciones_actualizado on public.notificaciones (actualizado desc);
alter table public.notificaciones enable row level security;      -- sin políticas: solo vía funciones

-- 4) Regla única de a quién le toca cada aviso (la usan la bandeja y el push).
--    Módulo:  admin y admin_auditor reciben todo · sistemas solo archivero · auditor y viewer solo
--             los módulos que tienen visibles (finalizadas, para auditor, solo con acceso explícito;
--             archivero y activos no los ve el viewer).
--    Razón:   admin y viewer ven todas · los demás, solo sus razones asignadas (sin razones
--             asignadas = todas). Un movimiento sin razón identificada llega solo a quien ve todas,
--             salvo activos, que no maneja razón.
create or replace function public.notif_le_toca(p_rol text, p_razones text[], p_vistas text[],
                                                 p_modulo text, p_raz text[])
returns boolean language sql immutable as $$
  select
    case
      when p_rol in ('admin', 'admin_auditor') then true
      when p_rol = 'sistemas' then p_modulo = 'archivero'
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

-- 5) La app registra el perfil del usuario con sesión (rol, razones y vistas de su cuenta).
create or replace function public.notif_perfil(p_usuario text, p_rol text, p_razones text[], p_vistas text[])
returns void language plpgsql security definer set search_path = public as $$
declare
  v_razones text[];
begin
  if auth.uid() is null or coalesce(p_rol, '') = '' then return; end if;
  select array_agg(distinct upper(btrim(r))) into v_razones from unnest(p_razones) r where btrim(r) <> '';
  insert into notif_perfiles (user_id, usuario, rol, razones, vistas)
  values (auth.uid(), p_usuario, p_rol, v_razones, nullif(p_vistas, '{}'::text[]))
  on conflict (user_id) do update
    set usuario = excluded.usuario, rol = excluded.rol, razones = excluded.razones,
        vistas = excluded.vistas, actualizado = now();
  delete from notificaciones where creado < now() - interval '60 days';
end $$;

-- 6) Bandeja del usuario con sesión: lo que le toca de los últimos 30 días, sin sus propios
--    movimientos. "nueva" = llegó después de la última vez que abrió la bandeja.
create or replace function public.mis_notificaciones(p_limite int default 40)
returns table (id bigint, modulo text, operacion text, n int, razones text[], actor_nombre text,
               fecha timestamptz, nueva boolean)
language sql stable security definer set search_path = public as $$
  select x.id, x.modulo, x.operacion, x.n, x.razones, x.actor_nombre, x.actualizado, x.actualizado > p.visto
  from notificaciones x
  join notif_perfiles p on p.user_id = auth.uid()
  where x.actualizado > now() - interval '30 days'
    and x.actor is distinct from auth.uid()
    and notif_le_toca(p.rol, p.razones, p.vistas, x.modulo, x.razones)
  order by x.actualizado desc
  limit least(greatest(coalesce(p_limite, 40), 1), 200)
$$;

create or replace function public.notif_marcar_vistas()
returns void language sql security definer set search_path = public as $$
  update notif_perfiles set visto = now() where user_id = auth.uid()
$$;

-- 7) Teléfonos a los que hay que mandar el push de un movimiento (solo la Edge Function).
create or replace function public.notif_tokens(p_id bigint)
returns table (token text)
language sql stable security definer set search_path = public as $$
  select d.token
  from notificaciones x
  join push_dispositivos d on d.user_id is distinct from x.actor
  join notif_perfiles p on p.user_id = d.user_id
  where x.id = p_id
    and notif_le_toca(p.rol, p.razones, p.vistas, x.modulo, x.razones)
$$;

revoke all on function public.notif_perfil(text, text, text[], text[]) from public, anon;
revoke all on function public.mis_notificaciones(int) from public, anon;
revoke all on function public.notif_marcar_vistas() from public, anon;
revoke all on function public.notif_tokens(bigint) from public, anon, authenticated;
grant execute on function public.notif_perfil(text, text, text[], text[]) to authenticated;
grant execute on function public.mis_notificaciones(int) to authenticated;
grant execute on function public.notif_marcar_vistas() to authenticated;
grant execute on function public.notif_tokens(bigint) to service_role;

-- 8) Disparador: registra el movimiento y avisa a la Edge Function.
--    Varios cambios seguidos del mismo usuario, módulo, operación y razón (una carga de Excel
--    guarda renglón por renglón) se juntan en un solo registro durante 90 s: una carga = un aviso.
--    Si algo falla, el guardado de datos NO se afecta (solo no hay aviso).
create or replace function public.notif_movimiento()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare
  v_n int;
  v_razones text[];
  v_cols text[];
  v_expr text;
  v_modulo text;
  v_actor uuid := auth.uid();
  v_nombre text;
  v_id bigint;
  v_url text;
  v_secreto text;
begin
  execute 'select count(*) from cambios' into v_n;
  if v_n = 0 then return null; end if;

  -- Razones del cambio: razon_aviso si la tabla la tiene; si no, razon cuando está en claro
  -- (un valor cifrado no pasa el filtro de letras y números).
  select array_agg(column_name::text) into v_cols
  from information_schema.columns
  where table_schema = 'public' and table_name = TG_TABLE_NAME and column_name in ('razon', 'razon_aviso');
  v_expr := case
    when v_cols @> array['razon', 'razon_aviso'] then 'coalesce(nullif(btrim(razon_aviso), ''''), razon::text)'
    when v_cols @> array['razon_aviso'] then 'razon_aviso'
    when v_cols @> array['razon'] then 'razon::text'
  end;
  if v_expr is not null then
    execute format('select array_agg(distinct r order by r) from (select upper(btrim(%s)) as r from cambios) x '
                   'where r ~ ''^[A-Z0-9]{2,10}$''', v_expr) into v_razones;
  end if;

  v_modulo := case TG_TABLE_NAME
    when 'tareas_finalizadas' then 'finalizadas'
    when 'archivo_documentos' then 'archivero'
    when 'movimientos' then 'activos'
    when 'inventarios' then 'activos'
    else TG_TABLE_NAME end;

  update notificaciones set n = n + v_n, actualizado = now()
  where id = (select id from notificaciones
              where modulo = v_modulo and operacion = TG_OP
                and actor is not distinct from v_actor
                and razones is not distinct from v_razones
                and actualizado > now() - interval '90 seconds'
              order by id desc limit 1)
  returning id into v_id;
  if v_id is not null then return null; end if;

  select usuario into v_nombre from notif_perfiles where user_id = v_actor;
  insert into notificaciones (modulo, tabla, operacion, n, razones, actor, actor_nombre)
  values (v_modulo, TG_TABLE_NAME, TG_OP, v_n, v_razones, v_actor, v_nombre)
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

-- 9) Disparadores en las tablas que existan (se quitan los anteriores de push_aviso).
do $$
declare t text;
begin
  foreach t in array array['tareas', 'tareas_finalizadas', 'auditorias', 'actividades', 'ajustes', 'mermas',
                           'archivo_documentos', 'activos', 'movimientos', 'inventarios'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists push_insertar on public.%I', t);
      execute format('drop trigger if exists push_actualizar on public.%I', t);
      execute format('drop trigger if exists notif_insertar on public.%I', t);
      execute format('drop trigger if exists notif_actualizar on public.%I', t);
      execute format('drop trigger if exists notif_eliminar on public.%I', t);
      execute format('create trigger notif_insertar after insert on public.%I referencing new table as cambios '
                     'for each statement execute function public.notif_movimiento()', t);
      execute format('create trigger notif_actualizar after update on public.%I referencing new table as cambios '
                     'for each statement execute function public.notif_movimiento()', t);
      execute format('create trigger notif_eliminar after delete on public.%I referencing old table as cambios '
                     'for each statement execute function public.notif_movimiento()', t);
      raise notice 'Notificaciones activadas en %', t;
    end if;
  end loop;
end $$;
