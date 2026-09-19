
-- 071_actividad_campo_busqueda_fuente_fix.sql
-- Corrige la fuente de BASE_VTR_GAR_DETECTADA y evita usar el ticket mal mapeado de base_operativa_legacy.

create or replace function public.mv_actividad_buscar_datos_auditoria(
  p_usuario text,p_codigo text,p_cuadrilla text default ''
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  u jsonb;
  perfil_u text;
  codigo_key text;
  cuad_key text;
  om public.ordenes%rowtype;
  bm public.vtr_gar_clasificacion_legacy%rowtype;
  hay_o boolean:=false;
  hay_b boolean:=false;
  direccion_out text:='';
  ticket_out text:='';
  tipo_out text:='';
  source_out text:='';
  ticket_match text:='';
  texto_ticket text;
begin
  u:=public.mv_actividad_usuario(p_usuario);
  perfil_u:=u->>'perfil';
  if perfil_u not in ('SUPERVISOR','JEFATURA','ADMIN','ADMINISTRADOR','GERENCIA LIMA') then
    raise exception 'No tienes permiso para consultar datos de auditoría';
  end if;

  codigo_key:=public.mv_actividad_id_key(p_codigo);
  if codigo_key='' then raise exception 'Ingrese el código de pedido'; end if;
  cuad_key:=public.mv_actividad_cuadrilla_clave(p_cuadrilla);

  select o.*
  into om
  from public.ordenes o
  where
    (coalesce(cuad_key,'')='' or public.mv_actividad_cuadrilla_clave(o.cuadrilla)=cuad_key)
    and (
      public.mv_actividad_id_key(o.orden_id)=codigo_key
      or public.mv_actividad_id_key(o.codigo_cliente)=codigo_key
    )
  order by
    (
      case when public.mv_actividad_id_key(o.orden_id)=codigo_key then 120 else 0 end +
      case when public.mv_actividad_id_key(o.codigo_cliente)=codigo_key then 110 else 0 end +
      case when public.mv_actividad_id_key(o.codigo_cliente)=codigo_key then 45 else 0 end +
      case when public.mv_actividad_id_key(o.orden_id)=codigo_key then 40 else 0 end +
      case when public.mv_actividad_id_key(o.orden_id)=codigo_key
             and public.mv_actividad_id_key(o.codigo_cliente)=codigo_key then 100 else 0 end
    ) desc,
    o.id desc
  limit 1;
  hay_o:=found;

  select b.*
  into bm
  from public.vtr_gar_clasificacion_legacy b
  where public.mv_actividad_id_key(b.codigo_pedido)=codigo_key
  order by
    case when cuad_key<>'' and public.mv_actividad_cuadrilla_clave(b.cuadrilla_ejecutora)=cuad_key then 1 else 0 end desc,
    b.source_row desc nulls last,
    b.id desc
  limit 1;
  hay_b:=found;

  if not hay_o and not hay_b then
    return jsonb_build_object(
      'ok',true,'modulo','ACTIVIDAD_CAMPO','accion','BUSCAR_DATOS_AUDITORIA','encontrado',false
    );
  end if;

  if hay_o then
    direccion_out:=concat_ws(
      ' - ',
      nullif(trim(om.direccion),''),
      nullif(trim(om.direccion_adicional),'')
    );

    texto_ticket:=concat_ws(
      ' ',
      om.detalle,om.motivo_finalizacion,om.motivo_cancelacion,
      om.motivo_anulacion,om.producto_origen,om.producto_servicio
    );

    ticket_match:=(regexp_match(
      texto_ticket,
      '(?i)\m(?:GAR|VTR|AT)\s*[-:]?\s*[0-9]{4,}\M'
    ))[1];

    if ticket_match is not null then
      ticket_match:=upper(regexp_replace(replace(ticket_match,':','-'),'\s+','','g'));
    end if;
  end if;

  tipo_out:=public.mv_actividad_tipo_orden_datos(
    case when hay_o then om.tipo_trabajo else null end,
    case when hay_o then om.tipo else null end,
    case when hay_o then om.producto_origen else null end,
    case when hay_o then om.producto_servicio else null end,
    case when hay_o then om.detalle else null end,
    case when hay_b then bm.tipo else null end,
    case when hay_b then bm.tipo_partida else null end
  );

  ticket_out:=coalesce(
    case when hay_b then nullif(trim(bm.ticket),'') end,
    nullif(ticket_match,''),
    case when hay_o then nullif(trim(om.codigo_seguimiento),'') end,
    ''
  );

  source_out:=case
    when hay_o and hay_b then 'Mapa Operativo y base de Producción'
    when hay_o then 'Mapa Operativo'
    else 'base de Producción'
  end;

  return jsonb_build_object(
    'ok',true,
    'modulo','ACTIVIDAD_CAMPO',
    'accion','BUSCAR_DATOS_AUDITORIA',
    'encontrado',true,
    'fuente',source_out,
    'tipoOrden',tipo_out,
    'ticket',ticket_out,
    'dniCliente',coalesce(
      case when hay_o then nullif(trim(om.numero_documento),'') end,
      case when hay_b then nullif(trim(bm.numero_documento),'') end,
      ''
    ),
    'cliente',coalesce(
      case when hay_o then nullif(trim(om.cliente),'') end,
      case when hay_b then nullif(trim(bm.cliente),'') end,
      ''
    ),
    'direccion',direccion_out,
    'codigoPedido',coalesce(
      case when hay_o then nullif(trim(om.codigo_cliente),'') end,
      case when hay_o then nullif(trim(om.orden_id),'') end,
      case when hay_b then nullif(trim(bm.codigo_pedido),'') end,
      trim(p_codigo)
    ),
    'cuadrillaEncontrada',coalesce(
      case when hay_o then nullif(trim(om.cuadrilla),'') end,
      case when hay_b then nullif(trim(bm.cuadrilla_ejecutora),'') end,
      ''
    )
  );
end;
$$;

revoke execute on function public.mv_actividad_buscar_datos_auditoria(text,text,text)
from public,anon,authenticated;
grant execute on function public.mv_actividad_buscar_datos_auditoria(text,text,text)
to service_role;
