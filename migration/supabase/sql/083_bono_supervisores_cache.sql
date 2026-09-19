
-- 083_bono_supervisores_cache.sql
-- Cache PostgreSQL por período/supervisor, equivalente al cache 300s del Apps Script.

create table if not exists public.bono_supervisores_resultado_cache (
  periodo text not null,
  usuario_supervisor text not null,
  resultado jsonb not null,
  calculado_at timestamptz not null default now(),
  dirty boolean not null default false,
  primary key(periodo,usuario_supervisor)
);

alter table public.bono_supervisores_resultado_cache enable row level security;
revoke all on public.bono_supervisores_resultado_cache from anon,authenticated;
grant select,insert,update,delete on public.bono_supervisores_resultado_cache to service_role;

create or replace function public.mv_bono_sup_refrescar_supervisor(
  p_periodo text,
  p_supervisor text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  p text:=public.mv_bono_sup_periodo(p_periodo);
  sup text:=public.mv_bono_sup_usuario_key(p_supervisor);
  r jsonb;
begin
  r:=public.mv_bono_sup_calcular_supervisor(p,sup);

  insert into public.bono_supervisores_resultado_cache(
    periodo,usuario_supervisor,resultado,calculado_at,dirty
  ) values (p,sup,r,now(),false)
  on conflict(periodo,usuario_supervisor) do update set
    resultado=excluded.resultado,
    calculado_at=excluded.calculado_at,
    dirty=false;

  return r||jsonb_build_object(
    'desdeCache',false,
    'cacheActualizadoAl',to_char(clock_timestamp() at time zone 'America/Lima','DD/MM/YYYY HH24:MI:SS'),
    'cacheDesactualizado',false
  );
end;
$$;

create or replace function public.mv_bono_sup_marcar_cache_dirty(
  p_periodo text,
  p_supervisor text default null
)
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare n integer;
begin
  update public.bono_supervisores_resultado_cache
  set dirty=true
  where periodo=public.mv_bono_sup_periodo(p_periodo)
    and (
      coalesce(trim(p_supervisor),'')=''
      or usuario_supervisor=public.mv_bono_sup_usuario_key(p_supervisor)
    );
  get diagnostics n=row_count;
  return n;
end;
$$;

create or replace function public.mv_bono_sup_cache_item(
  p_periodo text,
  p_supervisor text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  c public.bono_supervisores_resultado_cache%rowtype;
begin
  select * into c
  from public.bono_supervisores_resultado_cache
  where periodo=public.mv_bono_sup_periodo(p_periodo)
    and usuario_supervisor=public.mv_bono_sup_usuario_key(p_supervisor);

  if not found then return null; end if;

  return c.resultado||jsonb_build_object(
    'desdeCache',true,
    'cacheActualizadoAl',to_char(c.calculado_at at time zone 'America/Lima','DD/MM/YYYY HH24:MI:SS'),
    'cacheDesactualizado',c.dirty or c.calculado_at < now()-interval '300 seconds'
  );
end;
$$;

create or replace function public.mv_bono_sup_obtener(
  p_usuario text,
  p_periodo text default null
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

    -- Supervisor solo implica un cálculo: si no hay cache o está vencido,
    -- se actualiza en la misma lectura.
    if perfil_u='SUPERVISOR'
       and (
         item is null
         or coalesce((item->>'cacheDesactualizado')::boolean,true)
       ) then
      item:=public.mv_bono_sup_refrescar_supervisor(p,asign.usuario);
    elsif item is null then
      -- Para Jefatura/Gerencia una ausencia aislada calcula solo ese supervisor.
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
    'parametrosSlaConfiguracion',public.mv_bono_sup_parametros_sla(p),
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
$$;

create or replace function public.mv_bono_sup_cache_dirty_trigger()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if tg_table_name='bono_supervisores_configuracion' then
    perform public.mv_bono_sup_marcar_cache_dirty(coalesce(new.periodo,old.periodo),null);
  else
    perform public.mv_bono_sup_marcar_cache_dirty(
      coalesce(new.periodo,old.periodo),
      coalesce(new.usuario_supervisor,old.usuario_supervisor)
    );
  end if;
  return coalesce(new,old);
end;
$$;

drop trigger if exists trg_bono_sup_cache_eval on public.bono_supervisores_evaluaciones;
create trigger trg_bono_sup_cache_eval
after insert or update or delete on public.bono_supervisores_evaluaciones
for each row execute function public.mv_bono_sup_cache_dirty_trigger();

drop trigger if exists trg_bono_sup_cache_satisf on public.bono_supervisores_satisfaccion;
create trigger trg_bono_sup_cache_satisf
after insert or update or delete on public.bono_supervisores_satisfaccion
for each row execute function public.mv_bono_sup_cache_dirty_trigger();

drop trigger if exists trg_bono_sup_cache_actas on public.bono_supervisores_actas;
create trigger trg_bono_sup_cache_actas
after insert or update or delete on public.bono_supervisores_actas
for each row execute function public.mv_bono_sup_cache_dirty_trigger();

drop trigger if exists trg_bono_sup_cache_config on public.bono_supervisores_configuracion;
create trigger trg_bono_sup_cache_config
after insert or update or delete on public.bono_supervisores_configuracion
for each row execute function public.mv_bono_sup_cache_dirty_trigger();

drop trigger if exists trg_bono_sup_cache_asig on public.bono_supervisores_asignaciones;
create trigger trg_bono_sup_cache_asig
after insert or update or delete on public.bono_supervisores_asignaciones
for each row execute function public.mv_bono_sup_cache_dirty_trigger();

revoke execute on function public.mv_bono_sup_refrescar_supervisor(text,text) from public,anon,authenticated;
revoke execute on function public.mv_bono_sup_marcar_cache_dirty(text,text) from public,anon,authenticated;
revoke execute on function public.mv_bono_sup_cache_item(text,text) from public,anon,authenticated;
revoke execute on function public.mv_bono_sup_cache_dirty_trigger() from public,anon,authenticated;

grant execute on function public.mv_bono_sup_refrescar_supervisor(text,text) to service_role;
grant execute on function public.mv_bono_sup_marcar_cache_dirty(text,text) to service_role;
grant execute on function public.mv_bono_sup_cache_item(text,text) to service_role;
grant execute on function public.mv_bono_sup_cache_dirty_trigger() to service_role;
