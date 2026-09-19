
-- 070_actividad_campo_cuadrillas_alias_fix.sql

create or replace function public.mv_actividad_listar_cuadrillas(p_usuario text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  u jsonb;
  v_perfil text;
  v_sede text;
  v_cuadrilla text;
  arr jsonb;
begin
  u:=public.mv_actividad_usuario(p_usuario);
  v_perfil:=u->>'perfil';
  v_sede:=u->>'sede';
  v_cuadrilla:=u->>'cuadrilla';

  if v_perfil not in ('SUPERVISOR','TECNICO','JEFATURA','ADMIN','ADMINISTRADOR') then
    return jsonb_build_object(
      'ok',true,'modulo','OBSERVACIONES','accion','LISTAR_CUADRILLAS',
      'perfil',v_perfil,'sede',v_sede,'registros',0,'cuadrillas','[]'::jsonb
    );
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'cuadrilla',x.cuadrilla,
    'sede',x.sede,
    'plataforma',x.plataforma,
    'supervisor',x.usuario_supervisor
  ) order by x.sede,x.cuadrilla),'[]'::jsonb)
  into arr
  from public.mv_actividad_cuadrilla_ultima x
  where (x.estado='' or x.estado='ACTIVO')
    and (
      (v_perfil='SUPERVISOR' and x.sede=v_sede)
      or (v_perfil='TECNICO' and x.cuadrilla=v_cuadrilla)
      or (v_perfil in ('JEFATURA','ADMIN','ADMINISTRADOR'))
    );

  return jsonb_build_object(
    'ok',true,'modulo','OBSERVACIONES','accion','LISTAR_CUADRILLAS',
    'perfil',v_perfil,'sede',v_sede,
    'registros',jsonb_array_length(arr),'cuadrillas',arr
  );
end;
$$;

revoke execute on function public.mv_actividad_listar_cuadrillas(text) from public,anon,authenticated;
grant execute on function public.mv_actividad_listar_cuadrillas(text) to service_role;
