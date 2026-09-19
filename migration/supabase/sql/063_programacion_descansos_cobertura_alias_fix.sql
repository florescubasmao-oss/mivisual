-- 063_programacion_descansos_cobertura_alias_fix.sql
-- Evita ambigüedad entre variable perfil y columna perfil.

CREATE OR REPLACE FUNCTION public.mv_descansos_resumen_cobertura(p_usuario text, p_fecha date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  u record;
  perfil text;
  alcance text;
  resumen jsonb:='[]'::jsonb;
  sede_item text;
  plataforma_item text;
  cob jsonb;
begin
  select * into u
  from public.app_users
  where upper(trim(usuario))=upper(trim(p_usuario))
    and upper(trim(coalesce(estado,'ACTIVO')))='ACTIVO'
  order by id desc limit 1;
  if not found then raise exception 'Usuario no encontrado o inactivo'; end if;

  perfil:=upper(trim(coalesce(u.perfil,'')));
  if perfil='TECNICO' then raise exception 'No tienes permiso para consultar cobertura general'; end if;

  select upper(trim(coalesce(ap.alcance_datos,''))) into alcance
  from public.app_permissions ap
  where upper(trim(ap.perfil))=upper(trim(u.perfil))
    and upper(trim(ap.modulo))='PROGRAMACION DESCANSOS'
    and ap.ver is true
  order by ap.id desc limit 1;
  if alcance is null then raise exception 'No tienes permiso para ver Programación de Descansos'; end if;

  for sede_item in
    select s from unnest(
      case when alcance in ('SEDE','SEDE / PROPIOS')
        then array[upper(trim(coalesce(u.sede,'')))]
        else array['CHICLAYO','PIURA','TRUJILLO']
      end
    ) s
  loop
    foreach plataforma_item in array array['INSTALACIONES','VISITA TECNICA','TRASLADOS']
    loop
      cob:=public.mv_descansos_calcular_cobertura(p_fecha,sede_item,plataforma_item,'{}'::jsonb);
      resumen:=resumen || jsonb_build_array(
        jsonb_build_object(
          'fecha',to_char(p_fecha,'YYYY-MM-DD'),'sede',sede_item,'plataforma',plataforma_item,
          'total',cob->'total','enCampo',cob->'enCampo','enDescanso',cob->'enDescanso',
          'porcentaje',cob->'porcentaje','estado',cob->'estado','objetivo',cob->'objetivo',
          'minimo',cob->'minimo','objetivoCuadrillas',cob->'objetivoCuadrillas','minimoCuadrillas',cob->'minimoCuadrillas'
        )
      );
    end loop;
  end loop;

  return jsonb_build_object(
    'ok',true,'modulo','PROGRAMACION_DESCANSOS','accion','RESUMEN_COBERTURA',
    'fecha',to_char(p_fecha,'YYYY-MM-DD'),'resumen',resumen
  );
end;
$function$
;

revoke execute on function public.mv_descansos_resumen_cobertura(text,date) from public,anon,authenticated;
grant execute on function public.mv_descansos_resumen_cobertura(text,date) to service_role;
