-- MI VISUAL - Produccion: cierre de reglas semanticas de migracion
-- Completa huecos restantes con reglas de negocio explicitas.
-- No modifica Produccion productiva.

begin;

insert into public.reglas_partida_semanticas_migracion
(id_regla,familia_servicio,tipo_trabajo_norm,motivo_norm,codigo_partida,observacion)
values
('MIG-P-015','RESIDENCIAL','LOSROJO','RECABLEADOCLIENTEMIGRAAOTRACTO','SRV','Visita tecnica residencial con recableado por migracion a otra CTO.'),
('MIG-P-016','RESIDENCIAL','WINBOXENCOMODATO','','IR','Orden de alta/instalacion residencial o multifamiliar con WINBOX en comodato.'),
('MIG-P-017','RESIDENCIAL','INTERMITENCIALOSROJO','CAMBIODECONECTORCTONAP','UM','Atencion ultima milla: cambio de conector CTO/NAP.'),
('MIG-P-018','CONDOMINIO','RECABLEADO','RECABLEADOPOSTVENTA','SRPCON','Recableado postventa en condominio.'),
('MIG-P-019','RESIDENCIAL','1WINBOX','ENTREGACONFIG1WINBOX','TVBOXPV','Entrega y configuracion de un WIN BOX / TV BOX postventa.'),
('MIG-P-020','RESIDENCIAL','RECABLEADOCAMBIODEONT','RECABLEADOCAMBIODEONTPOSTVENTA','SRPVONT','Recableado residencial postventa mas cambio de ONT.'),
('MIG-P-021','RESIDENCIAL','WINBOXENCOMODATO','INSTALADO','IR','Orden de alta/instalacion residencial o multifamiliar con WINBOX en comodato.'),
('MIG-P-022','CONDOMINIO','INVASIONESPACIODEUNTERCERO','ACONDICIONAMIENTODEDROP','UM','Acondicionamiento de drop como atencion de ultima milla.'),
('MIG-P-023','RESIDENCIAL','CONJUNTAPEXT','CONJUNTAFINALIZADARECABLEADOS','SRV','Conjunta PEXT finalizada con recableado de visita tecnica.'),
('MIG-P-024','RESIDENCIAL','DESCARTEDEONT','CAMBIODEONTCARGADORMALOGRADO','ONT','Cambio efectivo de ONT por falla de cargador/equipo.'),
('MIG-P-025','RESIDENCIAL','DESCARTELOOP','CAMBIODEONTNOSINCRONIZANOEMITESENAL','ONT','Cambio efectivo de ONT en descarte LOOP.'),
('MIG-P-026','RESIDENCIAL','LOSROJO','CONJUNTAPEXTAVERA','PS','Normalizacion del motivo CONJUNTA PEXT AVERIA; historico consistente con prueba/atencion de servicio.'),
('MIG-P-027','RESIDENCIAL','LOSROJO','RECABLEADODESCONEXIONDELCLIENTE','SRV','Visita tecnica residencial con recableado por desconexion del cliente.'),
('MIG-P-028','RESIDENCIAL','LOSROJO','RECABLEADONOCUMPLEPOLITICASDEINSTALACION','SRV','Visita tecnica residencial con recableado por incumplimiento de instalacion.'),
('MIG-P-029','RESIDENCIAL','LOSROJO','RECABLEADOPORMANTENIMIENTO','SRV','Visita tecnica residencial con recableado por mantenimiento.'),
('MIG-P-030','RESIDENCIAL','TRASLADOCAMBIODEONT1MESH','TRASLADOCAMBIODEONT1MESH','TR','Traslado residencial; catalogo vigente no separa puntos adicionales de ONT/MESH en esta combinacion.')
on conflict (id_regla) do update set
  familia_servicio=excluded.familia_servicio,
  tipo_trabajo_norm=excluded.tipo_trabajo_norm,
  motivo_norm=excluded.motivo_norm,
  codigo_partida=excluded.codigo_partida,
  observacion=excluded.observacion;

commit;
