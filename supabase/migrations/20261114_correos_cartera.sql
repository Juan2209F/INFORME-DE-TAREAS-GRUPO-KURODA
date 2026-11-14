-- Correos de Cartera por tienda — Grupo Kuroda
-- El aviso semanal de Cartera (seguimiento, sin calificación) se envía a una lista propia
-- de cada tienda, distinta de la de Colaboración / Orden y Limpieza (tienda_correos).
-- Va en una tabla aparte porque tienda_correos no permite repetir un correo en la misma
-- tienda: si alguien ya está como Para de la tienda y se agregara para Cartera, se movería
-- y dejaría de recibir los demás avisos.
-- No modifica ninguna tabla ni función existente. Se puede correr más de una vez.

create table if not exists public.tienda_correos_cartera (
  id uuid primary key default gen_random_uuid(),
  tienda_id uuid not null references public.tiendas(id) on delete cascade,
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  nombre text,
  tipo text not null default 'para' check (tipo in ('para', 'cc')),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists tienda_correos_cartera_tienda_email
  on public.tienda_correos_cartera (tienda_id, lower(email));

-- Solo se usa a través de las funciones de abajo (panel) y de la Edge Function (service role).
alter table public.tienda_correos_cartera enable row level security;
revoke all on public.tienda_correos_cartera from anon, authenticated;

create or replace function public.listar_correos_cartera(p_admin text, p_pass text)
returns table(id uuid, tienda_id uuid, email text, nombre text, activo boolean, tipo text)
language plpgsql security definer
set search_path to 'public', 'extensions'
as $function$
begin
  if not public._es_admin_kuroda(p_admin, p_pass) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  return query
  select c.id, c.tienda_id, c.email, c.nombre, c.activo, c.tipo
  from public.tienda_correos_cartera c
  order by c.tipo desc, lower(c.email);
end $function$;

create or replace function public.agregar_correo_cartera(p_admin text, p_pass text, p_tienda_id uuid, p_email text,
  p_nombre text default null, p_tipo text default 'para')
returns void
language plpgsql security definer
set search_path to 'public', 'extensions'
as $function$
begin
  if not public._es_admin_kuroda(p_admin, p_pass) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if coalesce(p_tipo, 'para') not in ('para', 'cc') then
    raise exception 'Tipo inválido: usa para o cc';
  end if;
  insert into public.tienda_correos_cartera (tienda_id, email, nombre, tipo)
  values (p_tienda_id, lower(btrim(p_email)), nullif(btrim(p_nombre), ''), coalesce(p_tipo, 'para'))
  on conflict (tienda_id, lower(email)) do update
    set activo = true, tipo = excluded.tipo, nombre = coalesce(excluded.nombre, public.tienda_correos_cartera.nombre);
end $function$;

create or replace function public.quitar_correo_cartera(p_admin text, p_pass text, p_id uuid)
returns void
language plpgsql security definer
set search_path to 'public', 'extensions'
as $function$
begin
  if not public._es_admin_kuroda(p_admin, p_pass) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  delete from public.tienda_correos_cartera where id = p_id;
end $function$;

grant execute on function public.listar_correos_cartera(text, text) to anon, authenticated;
grant execute on function public.agregar_correo_cartera(text, text, uuid, text, text, text) to anon, authenticated;
grant execute on function public.quitar_correo_cartera(text, text, uuid) to anon, authenticated;

-- Prueba rápida después de aplicarlo (debe responder 0 la primera vez):
-- select count(*) from public.tienda_correos_cartera;
