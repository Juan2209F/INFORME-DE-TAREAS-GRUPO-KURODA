-- Notificaciones push de la app Android (Firebase Cloud Messaging).
-- Cuando se agregan o cambian tareas, auditorías, actividades, ajustes, mermas o activos, un
-- disparador por SENTENCIA (uno por carga, no uno por renglón) llama a la Edge Function
-- "notificar-push", que avisa a los teléfonos registrados menos al de quien hizo el cambio.
-- Se puede correr varias veces sin problema.

create extension if not exists pg_net with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- Teléfonos registrados (los registra la app al iniciar sesión).
create table if not exists public.push_dispositivos (
  token       text primary key,
  user_id     uuid not null,
  usuario     text,
  razones     text[],                       -- razones sociales que ve el usuario (null = todas)
  actualizado timestamptz not null default now()
);
alter table public.push_dispositivos enable row level security;   -- sin políticas: solo vía funciones

-- Configuración: dirección de la Edge Function y una clave para que solo la base pueda llamarla.
create table if not exists public.push_config (clave text primary key, valor text not null);
alter table public.push_config enable row level security;
insert into public.push_config (clave, valor) values
  ('url', 'https://xlygkolfmetytowixtnb.supabase.co/functions/v1/notificar-push'),
  ('secreto', encode(extensions.gen_random_bytes(24), 'hex'))
on conflict (clave) do nothing;

-- Bitácora de avisos enviados (también evita mandar varios avisos seguidos de la misma tabla).
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

-- Disparador: cuenta los renglones del cambio, junta sus razones y avisa a la Edge Function.
-- Si algo falla, el guardado de datos NO se afecta (solo no hay aviso).
create or replace function public.push_aviso()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare
  v_n int;
  v_razones text[];
  v_url text;
  v_secreto text;
begin
  execute 'select count(*) from cambios' into v_n;
  if v_n = 0 then return null; end if;
  begin
    execute 'select array_agg(distinct razon::text) from cambios where razon is not null' into v_razones;
  exception when undefined_column then
    v_razones := null;
  end;
  select valor into v_url from push_config where clave = 'url';
  select valor into v_secreto from push_config where clave = 'secreto';
  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('tabla', TG_TABLE_NAME, 'operacion', TG_OP, 'n', v_n,
                               'razones', v_razones, 'actor', auth.uid()),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-aviso', v_secreto)
  );
  return null;
exception when others then
  return null;
end $$;

-- Disparadores en las tablas del Monitor y de Activos (las que existan).
do $$
declare t text;
begin
  foreach t in array array['tareas', 'tareas_finalizadas', 'auditorias', 'actividades', 'ajustes',
                           'mermas', 'activos', 'movimientos', 'inventarios'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists push_insertar on public.%I', t);
      execute format('drop trigger if exists push_actualizar on public.%I', t);
      execute format('create trigger push_insertar after insert on public.%I referencing new table as cambios '
                     'for each statement execute function public.push_aviso()', t);
      execute format('create trigger push_actualizar after update on public.%I referencing new table as cambios '
                     'for each statement execute function public.push_aviso()', t);
      raise notice 'Avisos activados en %', t;
    end if;
  end loop;
end $$;
