-- 140_actas_storage_hibrido.sql
-- 20/09/2026
-- Mantiene historicos Drive y permite nuevos PDF en Supabase Storage sin reescribir V344.

alter table public.actas_migracion
  add column if not exists archivo_storage_backend text,
  add column if not exists archivo_storage_ref text;

update public.actas_migracion
set archivo_storage_backend=case
      when nullif(trim(coalesce(link_acta,'')),'') is null then null
      when link_acta like 'storage://%' then 'SUPABASE_STORAGE'
      else 'GOOGLE_DRIVE'
    end,
    archivo_storage_ref=case
      when link_acta like 'storage://%' then link_acta
      else null
    end
where archivo_storage_backend is null
   or (link_acta like 'storage://%' and archivo_storage_ref is null);

alter table public.actas_migracion
  drop constraint if exists actas_storage_backend_chk;

alter table public.actas_migracion
  add constraint actas_storage_backend_chk check (
    archivo_storage_backend is null
    or archivo_storage_backend in ('GOOGLE_DRIVE','SUPABASE_STORAGE')
  );

create index if not exists actas_migracion_storage_backend_idx
  on public.actas_migracion(archivo_storage_backend);

create unique index if not exists actas_migracion_storage_ref_uidx
  on public.actas_migracion(archivo_storage_ref)
  where archivo_storage_ref is not null and archivo_storage_ref<>'';

create or replace function public.mv_actas_registrar_storage_v1(
  p_usuario text,
  p_codigo_orden text,
  p_codigo_pedido text,
  p_numero_acta text,
  p_nombre_archivo text,
  p_storage_ref text
) returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_ref text:=trim(coalesce(p_storage_ref,''));
  v_before public.actas_migracion%rowtype;
  v_result jsonb;
  v_id uuid;
  v_old_storage_ref text;
  v_old_backend text;
  v_old_link text;
  v_unique_token text;
begin
  if v_ref !~ '^storage://mi-visual-evidencias/actas/' then
    raise exception 'Referencia Storage de Actas inválida';
  end if;
  if lower(trim(coalesce(p_nombre_archivo,''))) !~ '\.pdf$' then
    raise exception 'El archivo debe ser PDF';
  end if;

  select *
  into v_before
  from public.actas_migracion
  where public.mv_actas_key(codigo_orden)=public.mv_actas_key(p_codigo_orden)
     or public.mv_actas_numero_key(numero_acta)=public.mv_actas_numero_key(p_numero_acta)
  order by updated_at desc
  limit 1;

  if found then
    v_old_storage_ref:=v_before.archivo_storage_ref;
    v_old_backend:=v_before.archivo_storage_backend;
    v_old_link:=v_before.link_acta;
  end if;

  -- Token transitorio para satisfacer la firma legacy sin falsear un Drive ID persistente.
  v_unique_token:='SUPABASE:'||md5(v_ref||clock_timestamp()::text);

  v_result:=public.mv_actas_registrar_v344(
    p_usuario,
    p_codigo_orden,
    p_codigo_pedido,
    p_numero_acta,
    p_nombre_archivo,
    v_ref,
    v_unique_token
  );

  v_id:=(v_result->>'id')::uuid;

  update public.actas_migracion
  set drive_file_id=null,
      link_acta=v_ref,
      archivo_storage_backend='SUPABASE_STORAGE',
      archivo_storage_ref=v_ref,
      source_kind='POSTGRESQL',
      updated_at=now()
  where id=v_id;

  insert into public.actas_eventos_migracion(
    acta_id,evento,actor,perfil_actor,estado_anterior,estado_nuevo,origen
  )
  select
    v_id,
    'ARCHIVO_STORAGE',
    u.usuario,
    u.perfil,
    case when v_old_link is null then null else jsonb_build_object(
      'backend',v_old_backend,
      'storageRef',v_old_storage_ref,
      'linkAnterior',v_old_link
    ) end,
    jsonb_build_object(
      'backend','SUPABASE_STORAGE',
      'storageRef',v_ref,
      'nombreArchivo',trim(p_nombre_archivo)
    ),
    'POSTGRESQL'
  from public.app_users u
  where upper(trim(u.usuario))=upper(trim(p_usuario))
  order by u.id
  limit 1;

  return v_result || jsonb_build_object(
    'storageBackend','SUPABASE_STORAGE',
    'storageRef',v_ref,
    'oldStorageRef',v_old_storage_ref,
    'oldStorageBackend',v_old_backend,
    'oldLink',v_old_link
  );
end $$;

revoke all on function public.mv_actas_registrar_storage_v1(text,text,text,text,text,text)
from public,anon,authenticated;
grant execute on function public.mv_actas_registrar_storage_v1(text,text,text,text,text,text)
to service_role;
