
-- 086_bono_supervisores_refresco_controlado.sql
-- Estado de frescura y refresco explícito del período de Bonos Supervisores.

create or replace function public.mv_bono_sup_estado_operativo(p_periodo text)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  p text:=public.mv_bono_sup_periodo(p_periodo);
  actual text:=to_char(clock_timestamp() at time zone 'America/Lima','YYYY-MM');
  filas_cache integer:=0;
  filas_fuente integer:=0;
  fuente_actualizada timestamptz;
  cache_refrescado timestamptz;
  requiere boolean:=false;
begin
  if p='' then p:=actual; end if;

  select count(*),max(refreshed_at)
  into filas_cache,cache_refrescado
  from public.bono_supervisores_operativo_cache
  where periodo=p;

  if p=actual then
    select count(*),max(actualizado_at)
    into filas_fuente,fuente_actualizada
    from public.dashboard_ranking_cache
    where periodo=p;

    requiere:=
      filas_cache=0
      or (filas_fuente>0 and filas_cache<filas_fuente)
      or (fuente_actualizada is not null and
          (cache_refrescado is null or fuente_actualizada>cache_refrescado));
  else
    select count(*)
    into filas_fuente
    from public.mv_dashboard_historico_protegido_cache
    where periodo=p;

    requiere:=filas_cache=0 or (filas_fuente>0 and filas_cache<filas_fuente);
  end if;

  return jsonb_build_object(
    'periodo',p,
    'filasCache',filas_cache,
    'filasFuente',filas_fuente,
    'fuenteActualizadaAl',case when fuente_actualizada is null then null else to_char(fuente_actualizada at time zone 'America/Lima','DD/MM/YYYY HH24:MI:SS') end,
    'cacheRefrescadoAl',case when cache_refrescado is null then null else to_char(cache_refrescado at time zone 'America/Lima','DD/MM/YYYY HH24:MI:SS') end,
    'requiereRefresco',requiere
  );
end;
$$;

create or replace function public.mv_bono_sup_refrescar_periodo(
  p_usuario text,
  p_periodo text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  u jsonb;
  perfil_u text;
  usuario_u text;
  p text:=public.mv_bono_sup_periodo(p_periodo);
  a record;
  operativo jsonb;
  n integer:=0;
  t0 timestamptz:=clock_timestamp();
begin
  u:=public.mv_actividad_usuario(p_usuario);
  perfil_u:=u->>'perfil';
  usuario_u:=u->>'usuario';

  if perfil_u<>'SUPERVISOR'
     and not public.mv_bono_sup_es_jefatura(perfil_u)
     and perfil_u<>'GERENCIA LIMA' then
    raise exception 'No tiene acceso al refresco de Bonos Supervisores';
  end if;

  if p='' then p:=to_char(clock_timestamp() at time zone 'America/Lima','YYYY-MM'); end if;

  operativo:=public.mv_bono_sup_refrescar_operativo(p);

  for a in
    select *
    from public.mv_bono_sup_asignaciones_periodo(p) x
    where perfil_u<>'SUPERVISOR' or x.usuario=usuario_u
    order by x.usuario
  loop
    perform public.mv_bono_sup_refrescar_supervisor(p,a.usuario);
    n:=n+1;
  end loop;

  return jsonb_build_object(
    'ok',true,
    'modulo','BONO_SUPERVISORES',
    'accion','REFRESCAR_PERIODO',
    'periodo',p,
    'supervisoresActualizados',n,
    'operativo',operativo,
    'estadoCache',public.mv_bono_sup_estado_operativo(p),
    'duracionMs',round(extract(epoch from(clock_timestamp()-t0))*1000),
    'actualizadoPor',usuario_u
  );
end;
$$;

revoke execute on function public.mv_bono_sup_estado_operativo(text) from public,anon,authenticated;
revoke execute on function public.mv_bono_sup_refrescar_periodo(text,text) from public,anon,authenticated;

grant execute on function public.mv_bono_sup_estado_operativo(text) to service_role;
grant execute on function public.mv_bono_sup_refrescar_periodo(text,text) to service_role;
