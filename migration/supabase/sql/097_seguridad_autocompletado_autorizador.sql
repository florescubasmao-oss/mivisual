
-- 097_seguridad_autocompletado_autorizador.sql
-- La aceptación faltante queda autocompletada bajo firma/responsabilidad
-- del Supervisor/Jefatura que finaliza, con trazabilidad explícita.

create or replace function public.mv_seguridad_autocompletar_aceptaciones(
  p_ats_id text,
  p_actor text,
  p_actor_perfil text,
  p_actor_nombre text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  a public.seguridad_ats_migracion%rowtype;
  acept jsonb;
  firma_actor jsonb;
  usuario_i text;
  nombre_i text;
  cargo_i text;
  ya boolean;
begin
  select * into a
  from public.seguridad_ats_migracion
  where id=p_ats_id
  for update;

  if not found then raise exception 'ATS no encontrado'; end if;

  firma_actor:=public.mv_seguridad_firma_activa_json(p_actor);
  if not coalesce((firma_actor->>'activa')::boolean,false)
     or coalesce(firma_actor->>'url','')='' then
    raise exception 'El autorizador debe tener firma digital activa';
  end if;

  acept:=coalesce(a.aceptaciones_json,'[]'::jsonb);

  for usuario_i,nombre_i,cargo_i in
    select a.t1_usuario,a.t1_nombre,'T1'
    union all
    select a.t2_usuario,a.t2_nombre,'T2'
  loop
    if coalesce(trim(usuario_i),'')='' then continue; end if;

    select exists(
      select 1
      from jsonb_array_elements(acept) x
      where public.mv_bono_sup_usuario_key(x->>'usuario')
            =public.mv_bono_sup_usuario_key(usuario_i)
    ) into ya;

    if ya then continue; end if;

    acept:=acept||jsonb_build_array(
      jsonb_build_object(
        'usuario',usuario_i,
        'nombre',coalesce(nombre_i,''),
        'cargo',cargo_i,
        'gps','',
        'fecha',to_char(clock_timestamp() at time zone 'America/Lima','DD/MM/YYYY HH24:MI:SS'),
        'firma',firma_actor,
        'firmaOrigen','AUTORIZADOR',
        'autocompletada','SI',
        'autorizadaPor',p_actor,
        'autorizadaNombre',coalesce(p_actor_nombre,''),
        'autorizadaPerfil',p_actor_perfil
      )
    );
  end loop;

  return acept;
end;
$$;

revoke execute on function public.mv_seguridad_autocompletar_aceptaciones(text,text,text,text)
from public,anon,authenticated;
grant execute on function public.mv_seguridad_autocompletar_aceptaciones(text,text,text,text)
to service_role;
