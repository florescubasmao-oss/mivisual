
-- 107_plantilla_orden_permisos_propios.sql
-- PLANTILLA ORDEN deja de depender de MAPA OPERATIVO para permisos del piloto.
-- Se parte del mismo alcance actual de MAPA para no ampliar acceso durante la migración.

insert into public.app_permissions(
  perfil,modulo,activo,orden_menu,mostrar_modulo,ver,registrar,editar,
  observar,aprobar,validar,descargar,administrar,alcance_datos,
  vista_perfil,observacion,created_at,updated_at
)
select
  perfil,
  'PLANTILLA ORDEN',
  activo,
  case when orden_menu is null then null else orden_menu+1 end,
  mostrar_modulo,
  ver,
  false,false,false,false,false,false,false,
  alcance_datos,
  vista_perfil,
  'Permiso piloto derivado de MAPA OPERATIVO. No amplía acceso; módulo independiente para cutover.',
  now(),now()
from public.app_permissions
where modulo='MAPA OPERATIVO'
on conflict (perfil,modulo) do update set
  activo=excluded.activo,
  mostrar_modulo=excluded.mostrar_modulo,
  ver=excluded.ver,
  registrar=false,
  editar=false,
  observar=false,
  aprobar=false,
  validar=false,
  descargar=false,
  administrar=false,
  alcance_datos=excluded.alcance_datos,
  observacion=excluded.observacion,
  updated_at=now();
