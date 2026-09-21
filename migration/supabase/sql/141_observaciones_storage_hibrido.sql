-- 141_observaciones_storage_hibrido.sql
-- 20/09/2026
-- Distingue evidencias historicas Drive de nuevas evidencias Supabase Storage.

alter table public.observaciones_evidencias_migracion
  add column if not exists storage_backend text,
  add column if not exists storage_ref text;

alter table public.observaciones_evidencias_migracion
  drop constraint if exists observaciones_evidencias_storage_backend_chk;

alter table public.observaciones_evidencias_migracion
  add constraint observaciones_evidencias_storage_backend_chk check (
    storage_backend is null
    or storage_backend in ('GOOGLE_DRIVE','SUPABASE_STORAGE')
  );

create unique index if not exists observaciones_evidencias_storage_ref_uidx
  on public.observaciones_evidencias_migracion(storage_ref)
  where storage_ref is not null and storage_ref<>'';

update public.observaciones_evidencias_migracion
set storage_backend=case
      when url like 'storage://%' then 'SUPABASE_STORAGE'
      else 'GOOGLE_DRIVE'
    end,
    storage_ref=case
      when url like 'storage://%' then url
      else null
    end,
    drive_file_id=case
      when url like 'storage://%' then null
      else drive_file_id
    end
where storage_backend is null
   or (url like 'storage://%' and storage_ref is null);

create or replace function public.mv_observaciones_evidencia_storage_fill()
returns trigger
language plpgsql
set search_path=public,pg_temp
as $$
begin
  if coalesce(new.url,'') like 'storage://%' then
    new.storage_backend:='SUPABASE_STORAGE';
    new.storage_ref:=new.url;
    new.drive_file_id:=null;
  else
    new.storage_backend:='GOOGLE_DRIVE';
    new.storage_ref:=null;
  end if;
  return new;
end $$;

drop trigger if exists trg_observaciones_evidencia_storage_fill
  on public.observaciones_evidencias_migracion;

create trigger trg_observaciones_evidencia_storage_fill
before insert or update of url
on public.observaciones_evidencias_migracion
for each row
execute function public.mv_observaciones_evidencia_storage_fill();

revoke all on function public.mv_observaciones_evidencia_storage_fill()
from public,anon,authenticated;
grant execute on function public.mv_observaciones_evidencia_storage_fill()
to service_role;
