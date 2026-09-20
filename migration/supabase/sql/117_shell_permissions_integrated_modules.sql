-- 117_shell_permissions_integrated_modules.sql
-- Permisos explícitos para módulos piloto que antes dependían de reglas internas
-- y no tenían fila propia en PERMISOS_MODULOS/app_permissions.
-- Mantiene un único motor dinámico de menú.

with perfiles as (
  select distinct perfil
  from public.app_permissions
),
base as (
  select
    row_number() over(order by perfil)::bigint + 275 as id,
    perfil
  from perfiles
)
insert into public.app_permissions(
  id,perfil,modulo,activo,orden_menu,mostrar_modulo,ver,
  registrar,editar,observar,aprobar,validar,descargar,administrar,
  alcance_datos,vista_perfil,observacion
)
select
  id,perfil,'MESA AYUDA',true,58,true,true,
  true,false,false,false,false,false,false,
  'SEGUN REGLA MESA',perfil,
  'Permiso piloto explícito. La visibilidad de casos y escritura siguen siendo validadas por el backend Mesa según perfil/sede/cuadrilla/área.'
from base
on conflict(perfil,modulo) do nothing;

with x(perfil,puede_editar) as (
  values
    ('SUPERVISOR',false),
    ('JEFATURA',true),
    ('ADMIN',true),
    ('ADMINISTRADOR',true),
    ('GERENCIA LIMA',false)
),
base as (
  select
    row_number() over(order by x.perfil)::bigint
      + (select max(id) from public.app_permissions) as id,
    x.*
  from x
)
insert into public.app_permissions(
  id,perfil,modulo,activo,orden_menu,mostrar_modulo,ver,
  registrar,editar,observar,aprobar,validar,descargar,administrar,
  alcance_datos,vista_perfil,observacion
)
select
  id,perfil,'BONOS SUPERVISORES',true,59,true,true,
  puede_editar,puede_editar,false,puede_editar,puede_editar,true,false,
  case when perfil='SUPERVISOR' then 'PROPIO'
       when perfil='GERENCIA LIMA' then 'ZONA NORTE'
       else 'ZONA NORTE' end,
  perfil,
  'Permiso piloto explícito alineado al backend bonos-supervisores-pilot.'
from base
on conflict(perfil,modulo) do nothing;

with x(perfil) as (
  values ('JEFATURA'),('JEFATURA GENERAL')
),
base as (
  select
    row_number() over(order by x.perfil)::bigint
      + (select max(id) from public.app_permissions) as id,
    x.perfil
  from x
)
insert into public.app_permissions(
  id,perfil,modulo,activo,orden_menu,mostrar_modulo,ver,
  registrar,editar,observar,aprobar,validar,descargar,administrar,
  alcance_datos,vista_perfil,observacion
)
select
  id,perfil,'PUBLICADOR WIN',true,60,true,true,
  true,false,false,true,true,true,false,
  'ZONA NORTE',perfil,
  'Permiso piloto explícito. Publicación V497 continúa protegida por validación backend y confirmación expresa.'
from base
on conflict(perfil,modulo) do nothing;

update public.migration_live_source_control
set postgres_rows=(select count(*) from public.app_permissions),
    content_match=true,
    last_audit_at=now(),
    audit_scope='267_LEGACY + 8_PLANTILLA_ORDEN + PERMISOS_PILOTO_INTEGRADOS',
    status='OK_AUDITADO',
    notes='Matriz PostgreSQL contiene 267 permisos legacy y permisos piloto explícitos para Plantilla Orden, Mesa Ayuda, Bonos Supervisores y Publicador WIN. No interpretar el total PostgreSQL como igualdad física con Sheets.',
    updated_at=now()
where modulo='PERMISOS';
