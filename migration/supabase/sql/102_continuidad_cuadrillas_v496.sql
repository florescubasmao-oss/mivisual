
-- 102_continuidad_cuadrillas_v496.sql
-- Porta MI VISUAL V496: continuidad/cambio de cuadrilla.
-- Histórico no se reescribe. La identidad canónica aplica desde el MES de fecha_efectiva.
-- No modifica Apps Script ni Google Sheets productivos.

create table if not exists public.continuidad_cuadrillas_migracion (
  id text primary key,
  source_row integer unique,
  cuadrilla_anterior text not null,
  cuadrilla_nueva text not null,
  fecha_efectiva date not null,
  motivo text not null default 'CAMBIO DE NOMENCLATURA / CONTINUIDAD',
  estado text not null default 'ACTIVO',
  creado_por text,
  fecha_registro timestamp without time zone not null default timezone('America/Lima',now()),
  fuente text not null default 'POSTGRESQL',
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint continuidad_estado_chk check (upper(trim(estado)) in ('ACTIVO','INACTIVO')),
  constraint continuidad_distinta_chk check (
    public.mv_norm_key(cuadrilla_anterior) <> public.mv_norm_key(cuadrilla_nueva)
  )
);

create index if not exists continuidad_anterior_idx
  on public.continuidad_cuadrillas_migracion(public.mv_norm_key(cuadrilla_anterior),fecha_efectiva);
create index if not exists continuidad_nueva_idx
  on public.continuidad_cuadrillas_migracion(public.mv_norm_key(cuadrilla_nueva),fecha_efectiva);

alter table public.continuidad_cuadrillas_migracion enable row level security;
revoke all on table public.continuidad_cuadrillas_migracion from anon,authenticated;
grant all on table public.continuidad_cuadrillas_migracion to service_role;

insert into public.continuidad_cuadrillas_migracion(
  id,source_row,cuadrilla_anterior,cuadrilla_nueva,fecha_efectiva,motivo,estado,creado_por,fecha_registro,fuente
) values
('CONT-20260826-001',2,
 'P12 VISUAL SGI CESAR MOISES FERNANDEZ MUNDACA',
 'P13 VISUAL SGI CESAR MOISES FERNANDEZ MUNDACA',
 '2026-08-26','CAMBIO DE NOMENCLATURA / CONTINUIDAD','ACTIVO','JEFATURA','2026-08-26 00:00:00','LEGACY_SNAPSHOT'),
('CONT-20260906-P9-001',3,
 'P9 VISUAL SGA PEDRO PABLO ZAPATA YOVERA',
 'P9 VISUAL SGA RONAL ENRIQUE TESEN CALDERON',
 '2026-09-01','CAMBIO DE RESPONSABLE / CONTINUIDAD P9','ACTIVO','JEFATURA','2026-09-06 00:00:00','LEGACY_SNAPSHOT'),
('CONT-20260906-P9-002',4,
 'P9 VISUAL SGA RONALD ENRIQUE TESEN CALDERON',
 'P9 VISUAL SGA RONAL ENRIQUE TESEN CALDERON',
 '2026-09-01','HOMOLOGACION NOMBRE OPERATIVO RONALD A RONAL','ACTIVO','JEFATURA','2026-09-06 00:00:00','LEGACY_SNAPSHOT')
on conflict (id) do update set
  source_row=excluded.source_row,
  cuadrilla_anterior=excluded.cuadrilla_anterior,
  cuadrilla_nueva=excluded.cuadrilla_nueva,
  fecha_efectiva=excluded.fecha_efectiva,
  motivo=excluded.motivo,
  estado=excluded.estado,
  creado_por=excluded.creado_por,
  fecha_registro=excluded.fecha_registro,
  fuente=excluded.fuente,
  updated_at=now();

create or replace function public.mv_continuidad_cuadrilla(
  p_periodo text,
  p_cuadrilla text
)
returns text
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  actual text := trim(coalesce(p_cuadrilla,''));
  siguiente text;
  clave text;
  vistos text[] := array[]::text[];
  i integer;
begin
  if actual='' then return ''; end if;
  if coalesce(p_periodo,'') !~ '^20[0-9]{2}-(0[1-9]|1[0-2])$' then return actual; end if;

  for i in 1..50 loop
    clave := public.mv_norm_key(actual);
    if clave = any(vistos) then
      return actual;
    end if;
    vistos := array_append(vistos,clave);

    select c.cuadrilla_nueva
      into siguiente
    from public.continuidad_cuadrillas_migracion c
    where upper(trim(c.estado))='ACTIVO'
      and to_char(c.fecha_efectiva,'YYYY-MM') <= p_periodo
      and public.mv_norm_key(c.cuadrilla_anterior)=clave
    order by c.source_row asc nulls last,c.fecha_registro asc,c.id asc
    limit 1;

    if siguiente is null or trim(siguiente)='' then
      return actual;
    end if;

    actual := trim(siguiente);
  end loop;

  return actual;
end;
$$;

revoke execute on function public.mv_continuidad_cuadrilla(text,text) from public,anon,authenticated;
grant execute on function public.mv_continuidad_cuadrilla(text,text) to service_role;

create or replace view public.mv_continuidad_cuadrillas_v496
with (security_invoker=true) as
select
  id,source_row,cuadrilla_anterior,cuadrilla_nueva,fecha_efectiva,
  to_char(fecha_efectiva,'YYYY-MM') as periodo_efectivo,
  motivo,upper(trim(estado)) as estado,creado_por,fecha_registro,fuente
from public.continuidad_cuadrillas_migracion
order by fecha_efectiva,source_row nulls last,id;

revoke all on public.mv_continuidad_cuadrillas_v496 from anon,authenticated;
grant select on public.mv_continuidad_cuadrillas_v496 to service_role;

create or replace function public.mv_continuidad_validar_sin_ciclo(
  p_anterior text,
  p_nueva text,
  p_fecha date
)
returns boolean
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  anterior text := trim(coalesce(p_anterior,''));
  actual text := trim(coalesce(p_nueva,''));
  clave_anterior text := public.mv_norm_key(p_anterior);
  clave_actual text;
  siguiente text;
  vistos text[] := array[clave_anterior];
  periodo text := to_char(p_fecha,'YYYY-MM');
  i integer;
begin
  if anterior='' or actual='' or p_fecha is null then
    raise exception 'Debe indicar cuadrilla anterior, nueva y fecha efectiva.';
  end if;
  if clave_anterior=public.mv_norm_key(actual) then
    raise exception 'La cuadrilla anterior y la nueva no pueden ser iguales.';
  end if;

  for i in 1..50 loop
    clave_actual := public.mv_norm_key(actual);
    if clave_actual = any(vistos) then
      raise exception 'La continuidad generaría un ciclo entre cuadrillas.';
    end if;
    vistos := array_append(vistos,clave_actual);

    select c.cuadrilla_nueva into siguiente
    from public.continuidad_cuadrillas_migracion c
    where upper(trim(c.estado))='ACTIVO'
      and to_char(c.fecha_efectiva,'YYYY-MM') <= periodo
      and public.mv_norm_key(c.cuadrilla_anterior)=clave_actual
    order by c.source_row asc nulls last,c.fecha_registro asc,c.id asc
    limit 1;

    if siguiente is null or trim(siguiente)='' then return true; end if;
    actual := siguiente;
  end loop;

  raise exception 'La cadena de continuidad es demasiado extensa.';
end;
$$;

revoke execute on function public.mv_continuidad_validar_sin_ciclo(text,text,date) from public,anon,authenticated;
grant execute on function public.mv_continuidad_validar_sin_ciclo(text,text,date) to service_role;

create or replace function public.mv_continuidad_guardar_v496(
  p_anterior text,
  p_nueva text,
  p_fecha date,
  p_motivo text,
  p_creado_por text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  anterior text := trim(coalesce(p_anterior,''));
  nueva text := trim(coalesce(p_nueva,''));
  motivo text := coalesce(nullif(trim(p_motivo),''),'CAMBIO DE NOMENCLATURA / CONTINUIDAD');
  existente record;
  nuevo_id text;
  usuarios_actualizados integer := 0;
begin
  if anterior='' or nueva='' then
    raise exception 'Debe indicar cuadrilla anterior y cuadrilla nueva.';
  end if;
  if p_fecha is null then
    raise exception 'La fecha efectiva no es válida.';
  end if;
  if public.mv_norm_key(anterior)=public.mv_norm_key(nueva) then
    raise exception 'La cuadrilla anterior y la nueva no pueden ser iguales.';
  end if;

  perform pg_advisory_xact_lock(hashtext('MV496_CONTINUIDAD'));

  select * into existente
  from public.continuidad_cuadrillas_migracion c
  where upper(trim(c.estado))='ACTIVO'
    and public.mv_norm_key(c.cuadrilla_anterior)=public.mv_norm_key(anterior)
    and public.mv_norm_key(c.cuadrilla_nueva)=public.mv_norm_key(nueva)
    and c.fecha_efectiva=p_fecha
  order by c.source_row asc nulls last,c.fecha_registro asc,c.id asc
  limit 1;

  if found then
    update public.app_users
       set cuadrilla=nueva,updated_at=now()
     where public.mv_norm_key(cuadrilla)=public.mv_norm_key(anterior);
    get diagnostics usuarios_actualizados=row_count;

    return jsonb_build_object(
      'ok',true,'yaExistia',true,'id',existente.id,
      'cuadrillaAnterior',anterior,'cuadrillaNueva',nueva,
      'fechaEfectiva',to_char(p_fecha,'DD/MM/YYYY'),
      'usuariosActualizados',usuarios_actualizados
    );
  end if;

  perform public.mv_continuidad_validar_sin_ciclo(anterior,nueva,p_fecha);

  nuevo_id := 'CONT-'||to_char(timezone('America/Lima',clock_timestamp()),'YYYYMMDD-HH24MISS-MS');

  insert into public.continuidad_cuadrillas_migracion(
    id,source_row,cuadrilla_anterior,cuadrilla_nueva,fecha_efectiva,motivo,
    estado,creado_por,fecha_registro,fuente
  ) values (
    nuevo_id,null,anterior,nueva,p_fecha,motivo,
    'ACTIVO',coalesce(nullif(trim(p_creado_por),''),'JEFATURA'),
    timezone('America/Lima',now()),'POSTGRESQL'
  );

  update public.app_users
     set cuadrilla=nueva,updated_at=now()
   where public.mv_norm_key(cuadrilla)=public.mv_norm_key(anterior);
  get diagnostics usuarios_actualizados=row_count;

  return jsonb_build_object(
    'ok',true,'yaExistia',false,'id',nuevo_id,
    'cuadrillaAnterior',anterior,'cuadrillaNueva',nueva,
    'fechaEfectiva',to_char(p_fecha,'DD/MM/YYYY'),
    'usuariosActualizados',usuarios_actualizados
  );
end;
$$;

revoke execute on function public.mv_continuidad_guardar_v496(text,text,date,text,text) from public,anon,authenticated;
grant execute on function public.mv_continuidad_guardar_v496(text,text,date,text,text) to service_role;
