
-- 094_seguridad_serializacion_fix.sql
-- Corrige seriales de fecha/hora Google Sheets y limpia salida de integrantes.

create or replace function public.mv_seguridad_timestamp(v jsonb)
returns timestamptz
language plpgsql
immutable
set search_path=public
as $$
declare
  t text;
  n numeric;
  d timestamp;
  m text[];
begin
  if v is null or v='null'::jsonb then return null; end if;

  if jsonb_typeof(v)='number' then
    n:=(v#>>'{}')::numeric;
    d:=timestamp '1899-12-30 00:00:00' + (n * interval '1 day');
    return d at time zone 'America/Lima';
  end if;

  t:=trim(v#>>'{}');
  if t='' then return null; end if;

  m:=regexp_match(t,'^([0-9]{1,2})[/-]([0-9]{1,2})[/-]([0-9]{4})(?:\s+([0-9]{1,2}):([0-9]{2})(?::([0-9]{2}))?)?$');
  if m is not null then
    d:=make_timestamp(
      m[3]::int,m[2]::int,m[1]::int,
      coalesce(m[4],'0')::int,
      coalesce(m[5],'0')::int,
      coalesce(m[6],'0')::double precision
    );
    return d at time zone 'America/Lima';
  end if;

  return t::timestamptz;
exception when others then return null;
end;
$$;

create or replace function public.mv_seguridad_integrantes_json(a public.seguridad_ats_migracion)
returns jsonb
language sql
stable
set search_path=public
as $$
  select coalesce(
    jsonb_agg(x - 'orden' order by (x->>'orden')::integer),
    '[]'::jsonb
  )
  from (
    select jsonb_build_object(
      'orden',1,
      'usuario',coalesce(a.t1_usuario,''),
      'nombre',coalesce(a.t1_nombre,''),
      'cargo','T1'
    ) x
    where coalesce(trim(a.t1_usuario),'')<>''
    union all
    select jsonb_build_object(
      'orden',2,
      'usuario',coalesce(a.t2_usuario,''),
      'nombre',coalesce(a.t2_nombre,''),
      'cargo','T2'
    )
    where coalesce(trim(a.t2_usuario),'')<>''
  ) z;
$$;

update public.seguridad_ats_migracion a
set creado_en=public.mv_seguridad_timestamp(s.row_json->30),
    actualizado_en=public.mv_seguridad_timestamp(s.row_json->31),
    updated_at=now()
from public.seguridad_legacy_snapshot s
where s.sheet_name='SEGURIDAD_ATS'
  and s.source_row=a.source_row;

update public.seguridad_petar_migracion p
set actualizado_en=public.mv_seguridad_timestamp(s.row_json->17),
    updated_at=now()
from public.seguridad_legacy_snapshot s
where s.sheet_name='SEGURIDAD_PETAR'
  and s.source_row=p.source_row;

update public.seguridad_firmas_migracion f
set fecha_registro=public.mv_seguridad_timestamp(s.row_json->10),
    updated_at=now()
from public.seguridad_legacy_snapshot s
where s.sheet_name='SEGURIDAD_FIRMAS'
  and s.source_row=f.source_row;

update public.seguridad_firma_solicitudes_migracion q
set solicitado_en=public.mv_seguridad_timestamp(s.row_json->6),
    resuelto_en=public.mv_seguridad_timestamp(s.row_json->8),
    updated_at=now()
from public.seguridad_legacy_snapshot s
where s.sheet_name='SEGURIDAD_FIRMA_SOLICITUDES'
  and s.source_row=q.source_row;

revoke execute on function public.mv_seguridad_timestamp(jsonb) from public,anon,authenticated;
revoke execute on function public.mv_seguridad_integrantes_json(public.seguridad_ats_migracion) from public,anon,authenticated;

grant execute on function public.mv_seguridad_timestamp(jsonb) to service_role;
grant execute on function public.mv_seguridad_integrantes_json(public.seguridad_ats_migracion) to service_role;
