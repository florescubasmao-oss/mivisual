
-- 075_checklist_almacen_item_json_fix.sql
-- Evita el límite de 100 argumentos de jsonb_build_object separando el objeto V141 en bloques.

create or replace function public.mv_checklist_item_json(c public.checklist_almacen_migracion)
returns jsonb
language plpgsql
stable
set search_path=public
as $$
declare
  supervisor_out text:='';
  d1 integer;
  d2 integer;
  d3 integer;
  dmin integer;
  estado_venc text;
  j jsonb;
begin
  select coalesce(x.usuario_supervisor,'')
  into supervisor_out
  from public.mv_actividad_cuadrilla_ultima x
  where x.cuadrilla=public.mv_actividad_cuadrilla_norm(c.cuadrilla)
  limit 1;

  d1:=public.mv_checklist_dias_vencimiento(c.licencia_fecha_vencimiento);
  d2:=public.mv_checklist_dias_vencimiento(c.soat_fecha_vencimiento);
  d3:=public.mv_checklist_dias_vencimiento(c.revision_tecnica_fecha_vencimiento);

  select min(v) into dmin
  from unnest(array[d1,d2,d3]) v
  where v is not null;

  estado_venc:=case
    when dmin is null then 'NO APLICA'
    when dmin<0 then 'VENCIDO'
    when dmin<=30 then 'PROXIMO A VENCER'
    else 'VIGENTE'
  end;

  j :=
    jsonb_build_object(
      'id',coalesce(c.id,''),
      'fechaRegistro',case when c.fecha_registro is null then '' else to_char(c.fecha_registro,'DD/MM/YYYY') end,
      'horaRegistro',case when c.hora_registro is null then '' else to_char(c.hora_registro,'HH24:MI:SS') end,
      'usuario',coalesce(c.usuario,''),
      'nombresApellidos',coalesce(c.nombres_apellidos,''),
      'sede',coalesce(c.sede,''),
      'cuadrilla',coalesce(c.cuadrilla,''),
      'fechaGestion',case when c.fecha_gestion is null then '' else to_char(c.fecha_gestion,'YYYY-MM-DD') end,
      'estadoGeneral',coalesce(c.estado_general,''),
      'ontZte',coalesce(c.ont_zte,''),
      'fotosOntZte',coalesce(c.fotos_series_ont_zte,''),
      'ontHuawei',coalesce(c.ont_huawei,''),
      'fotosOntHuawei',coalesce(c.fotos_series_ont_huawei,''),
      'meshZte',coalesce(c.mesh_zte,''),
      'fotosMeshZte',coalesce(c.fotos_mesh_zte,''),
      'meshHuawei',coalesce(c.mesh_huawei,''),
      'fotosMeshHuawei',coalesce(c.fotos_mesh_huawei,''),
      'winbox',coalesce(c.winbox,''),
      'fotosWinbox',coalesce(c.foto_winbox,''),
      'fonowin',coalesce(c.fonowin,'')
    )
    ||
    jsonb_build_object(
      'fotosFonowin',coalesce(c.foto_fonowin,''),
      'cableDrop',coalesce(c.cable_drop,0),
      'pre50',coalesce(c.pre50,0),
      'pre100',coalesce(c.pre100,0),
      'pre150',coalesce(c.pre150,0),
      'pre200',coalesce(c.pre200,0),
      'anclajeP',coalesce(c.anclaje_p,0),
      'cintaBandIt',coalesce(c.cinta_band_it,0),
      'hebilla',coalesce(c.hebilla,0),
      'acoplador',coalesce(c.acoplador,0),
      'roseta',coalesce(c.roseta,0),
      'conectoresOpticos',coalesce(c.conectores_opticos,0),
      'templadores',coalesce(c.templadores,0),
      'splitter',coalesce(c.splitter,0),
      'clevis',coalesce(c.clevis,0),
      'utpCat5',coalesce(c.utp_cat5,0),
      'utpCat6',coalesce(c.utp_cat6,0),
      'patchApcApc',coalesce(c.patch_apc_apc,0),
      'patchUpcApc',coalesce(c.patch_upc_apc,0),
      'rj45',coalesce(c.rj45,0)
    )
    ||
    jsonb_build_object(
      'resultadoAlmacen',coalesce(c.resultado_almacen,''),
      'motivoAlmacen',coalesce(c.motivo_almacen,''),
      'validadoAlmacenPor',coalesce(c.validado_almacen_por,''),
      'fechaValidacionAlmacen',case when c.fecha_validacion_almacen is null then '' else to_char(c.fecha_validacion_almacen,'DD/MM/YYYY') end,
      'horaValidacionAlmacen',case when c.hora_validacion_almacen is null then '' else to_char(c.hora_validacion_almacen,'HH24:MI:SS') end,
      'resultadoJefatura',coalesce(c.resultado_jefatura,''),
      'motivoJefatura',coalesce(c.motivo_jefatura,''),
      'validadoJefaturaPor',coalesce(c.validado_jefatura_por,''),
      'fechaValidacionJefatura',case when c.fecha_validacion_jefatura is null then '' else to_char(c.fecha_validacion_jefatura,'DD/MM/YYYY') end,
      'horaValidacionJefatura',case when c.hora_validacion_jefatura is null then '' else to_char(c.hora_validacion_jefatura,'HH24:MI:SS') end,
      'version',c.version,
      'origenRegistro',coalesce(c.origen_registro,'TECNICO'),
      'registradoPor',coalesce(c.registrado_por,c.usuario,''),
      'perfilRegistro',coalesce(c.perfil_registro,'TECNICO'),
      'comentarioFinal',coalesce(c.comentario_final,''),
      'tipoChecklist',coalesce(c.tipo_checklist,'MATERIALES'),
      'resultadoHerramientas',coalesce(c.resultado_herramientas,''),
      'observacionHerramientas',coalesce(c.observacion_herramientas,''),
      'fotoUnidadFrente',coalesce(c.foto_unidad_frente,''),
      'fotoUnidadPosterior',coalesce(c.foto_unidad_posterior,'')
    )
    ||
    jsonb_build_object(
      'fotoUnidadLadoIzquierdo',coalesce(c.foto_unidad_lado_izquierdo,''),
      'fotoUnidadLadoDerecho',coalesce(c.foto_unidad_lado_derecho,''),
      'fotoExtintor',coalesce(c.foto_extintor,''),
      'fotoBotiquin',coalesce(c.foto_botiquin,''),
      'fotoRejaSeparadora',coalesce(c.foto_reja_separadora,''),
      'fotoParrilla1',coalesce(c.foto_parrilla_1,''),
      'fotoParrilla2',coalesce(c.foto_parrilla_2,''),
      'resultadoUnidad',coalesce(c.resultado_unidad,''),
      'observacionUnidad',coalesce(c.observacion_unidad,''),
      'licenciaFechaVencimiento',case when c.licencia_fecha_vencimiento is null then '' else to_char(c.licencia_fecha_vencimiento,'YYYY-MM-DD') end,
      'licenciaFotoFrente',coalesce(c.licencia_foto_frente,''),
      'licenciaFotoReverso',coalesce(c.licencia_foto_reverso,''),
      'soatFechaVencimiento',case when c.soat_fecha_vencimiento is null then '' else to_char(c.soat_fecha_vencimiento,'YYYY-MM-DD') end,
      'soatArchivo',coalesce(c.soat_archivo,'')
    )
    ||
    jsonb_build_object(
      'revisionTecnicaFechaVencimiento',case when c.revision_tecnica_fecha_vencimiento is null then '' else to_char(c.revision_tecnica_fecha_vencimiento,'YYYY-MM-DD') end,
      'revisionTecnicaArchivo',coalesce(c.revision_tecnica_archivo,''),
      'resultadoDocumentacion',coalesce(c.resultado_documentacion,''),
      'observacionDocumentacion',coalesce(c.observacion_documentacion,''),
      'fotoPersonalCompleto',coalesce(c.foto_personal_completo,''),
      'fotoBotas',coalesce(c.foto_botas,''),
      'fotoFotocheck',coalesce(c.foto_fotocheck,''),
      'resultadoEpp',coalesce(c.resultado_epp,''),
      'observacionEpp',coalesce(c.observacion_epp,''),
      'herramientasDetalle',public.mv_checklist_herramientas_json(c.id),
      'supervisor',supervisor_out,
      'diasVencimientoMinimo',dmin,
      'estadoVencimiento',estado_venc
    );

  return j;
end;
$$;

revoke execute on function public.mv_checklist_item_json(public.checklist_almacen_migracion)
from public,anon,authenticated;
grant execute on function public.mv_checklist_item_json(public.checklist_almacen_migracion)
to service_role;
