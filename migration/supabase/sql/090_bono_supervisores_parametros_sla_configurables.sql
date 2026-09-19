-- 090_bono_supervisores_parametros_sla_configurables.sql
CREATE OR REPLACE FUNCTION public.mv_bono_sup_obtener(p_usuario text, p_periodo text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  u jsonb;
  perfil_u text;
  usuario_u text;
  p text;
  puede_editar boolean;
  asign record;
  bonos jsonb:='[]'::jsonb;
  item jsonb;
  cache_stale boolean:=false;
begin
  u:=public.mv_actividad_usuario(p_usuario);
  perfil_u:=u->>'perfil';
  usuario_u:=u->>'usuario';

  if perfil_u<>'SUPERVISOR'
     and not public.mv_bono_sup_es_jefatura(perfil_u)
     and perfil_u<>'GERENCIA LIMA' then
    raise exception 'El bono de supervisores solo está disponible en los dashboards autorizados';
  end if;

  p:=public.mv_bono_sup_periodo(p_periodo);
  if p='' then p:=to_char(clock_timestamp() at time zone 'America/Lima','YYYY-MM'); end if;
  puede_editar:=public.mv_bono_sup_es_jefatura(perfil_u);

  for asign in
    select *
    from public.mv_bono_sup_asignaciones_periodo(p) a
    where perfil_u<>'SUPERVISOR' or a.usuario=usuario_u
    order by a.sede,a.usuario
  loop
    item:=public.mv_bono_sup_cache_item(p,asign.usuario);

    -- Con el cache operativo mensual el recálculo individual es liviano.
    -- Si la ficha no existe o fue invalidada, cualquier perfil autorizado
    -- recibe el resultado actualizado en la misma lectura.
    if item is null
       or coalesce((item->>'cacheDesactualizado')::boolean,true) then
      item:=public.mv_bono_sup_refrescar_supervisor(p,asign.usuario);
    end if;

    cache_stale:=cache_stale or coalesce((item->>'cacheDesactualizado')::boolean,false);
    bonos:=bonos||jsonb_build_array(
      item||jsonb_build_object('puedeEditar',puede_editar)
    );
  end loop;

  return jsonb_build_object(
    'ok',true,
    'modulo','BONO_SUPERVISORES',
    'accion','OBTENER',
    'periodo',p,
    'bonos',bonos,
    'periodosDisponibles',public.mv_bono_sup_periodos_disponibles(),
    'puedeEditar',puede_editar,
    'puedeEditarSla',puede_editar and p>='2026-07',
    'puedeEditarConfiguracion',puede_editar,
    'configuracion',public.mv_bono_sup_configuracion_json(p),
    'parametrosSla',public.mv_bono_sup_parametros_sla(p),
    'parametrosSlaConfiguracion',public.mv_bono_sup_parametros_sla_configurables(p),
    'criterio','SUMA_COMPONENTES',
    'metasDashboard',jsonb_build_object(
      'puntosPorCuadrilla',130,
      'efectividadPct',70,
      'recableadoPct',42,
      'vtrGarPct',3,
      'observacionesMonto',300
    ),
    'preguntasLiderazgo',public.mv_bono_sup_preguntas(),
    'nota','El monto se calcula con las escalas fijas configuradas para cada componente.',
    'desdeCache',true,
    'cacheDesactualizado',cache_stale,
    'calculadoEn',to_char(clock_timestamp() at time zone 'America/Lima','DD/MM/YYYY HH24:MI')
  );
end;
$function$
