begin;
create temp table ea_test_results(test text,passed boolean,detail text) on commit drop;
do $test$
declare id1 text; r jsonb; p jsonb; cargo1 text; cargo2 text; snapshot jsonb;
begin
r:=public.mv_ea_crear_solicitud_almacen('QA_EA_ALMACEN','ALMACEN','CHICLAYO','QA_EA_TECNICO_20260919','QA técnico','CHICLAYO','SGA','QA-EA',2,'Prueba rollback');
id1:=r->>'id';
insert into ea_test_results select 'Almacén crea solicitud',estado='PENDIENTE DE REGISTRO POR TECNICO',estado from public.equipos_averiados_solicitudes_migracion where id=id1;
perform public.mv_ea_completar_tecnico(id1,'QA_EA_TECNICO_20260919','TECNICO','[{"tipo":"ONT HUAWEI","serie":"QA-EA-SN-1","codigoCliente":"AA:00:00:00:00:01"},{"tipo":"MESH ZTE","serie":"QA-EA-SN-2","codigoCliente":"AA:00:00:00:00:02"}]');
insert into ea_test_results select 'Técnico completa',jsonb_array_length(equipos)=2 and estado='PENDIENTE DE ENTREGA',estado from public.equipos_averiados_solicitudes_migracion where id=id1;
p:=public.mv_ea_preparar_recepcion_v399(id1,'QA-EA-PARCIAL','QA_EA_ALMACEN','QA Almacén','ALMACEN','CHICLAYO','[{"serie":"QA-EA-SN-1","estado":"RECIBIDO"}]','');
cargo1:=p#>>'{cargo,idCargo}';
r:=public.mv_ea_finalizar_recepcion_v399('QA-EA-PARCIAL','storage://mi-visual-evidencias/qa/partial.pdf','partial.pdf','qa/partial.pdf');
insert into ea_test_results values('Recepción parcial',r->>'estado'='RECIBIDO PARCIALMENTE',r->>'estado');
p:=public.mv_ea_preparar_recepcion_v399(id1,'QA-EA-TOTAL','QA_EA_ALMACEN','QA Almacén','ALMACEN','CHICLAYO','[{"serie":"QA-EA-SN-2","estado":"RECIBIDO"}]','');
cargo2:=p#>>'{cargo,idCargo}';
r:=public.mv_ea_finalizar_recepcion_v399('QA-EA-TOTAL','storage://mi-visual-evidencias/qa/total.pdf','total.pdf','qa/total.pdf');
insert into ea_test_results values('Recepción total',r->>'estado'='RECIBIDO POR ALMACEN',r->>'estado');
r:=public.mv_ea_preparar_recepcion_v399(id1,'QA-EA-TOTAL','QA_EA_ALMACEN','QA Almacén','ALMACEN','CHICLAYO','[{"serie":"QA-EA-SN-2","estado":"RECIBIDO"}]','');
insert into ea_test_results select 'Reintento mismo cargo',r#>>'{cargo,idCargo}'=cargo2 and count(*)=2,'cargos='||count(*) from public.equipos_averiados_cargos_migracion where id_solicitud=id1;
perform public.mv_ea_volver_pendiente(id1,'QA_EA_JEFATURA','JEFATURA ALMACEN');
insert into ea_test_results select 'Reversa conserva cargos',s.estado='PENDIENTE DE ENTREGA' and (select count(*) from public.equipos_averiados_cargos_migracion c where c.id_solicitud=id1)=2,s.estado from public.equipos_averiados_solicitudes_migracion s where id=id1;
select to_jsonb(s) into snapshot from public.equipos_averiados_solicitudes_migracion s where id=id1;
perform public.mv_ea_finalizar_recepcion_v399('QA-EA-TOTAL','','','');
insert into ea_test_results select 'Reintento tardío no deshace reversa',to_jsonb(s)=snapshot,s.estado from public.equipos_averiados_solicitudes_migracion s where id=id1;
end $test$;
do $ begin if exists(select 1 from ea_test_results where passed is distinct from true) then raise exception 'EA workflow regression failed'; end if; end $;
select * from ea_test_results;
rollback;
begin;
create temp table ea_guard_results(test text,passed boolean,detail text) on commit drop;
do $test$
declare id1 text; id2 text; r jsonb; denied boolean; msg text;
begin
r:=public.mv_ea_crear_solicitud_almacen('QA','ALMACEN','CHICLAYO','QA_GUARD_1','QA','CHICLAYO','SGA','QA',1,''); id1:=r->>'id';
r:=public.mv_ea_crear_solicitud_almacen('QA','ALMACEN','PIURA','QA_GUARD_2','QA','PIURA','SGA','QA',1,''); id2:=r->>'id';
perform public.mv_ea_completar_tecnico(id1,'QA_GUARD_1','TECNICO','[{"tipo":"ONT ZTE","serie":"QA-GUARD-SN","codigoCliente":"AA:00:00:00:00:03"}]');
perform public.mv_ea_preparar_recepcion_v399(id1,'QA-GUARD-SID','QA','QA','ALMACEN','CHICLAYO','[{"serie":"QA-GUARD-SN","estado":"RECIBIDO"}]','');
denied:=false;
begin
 perform public.mv_ea_preparar_recepcion_v399(id2,'QA-GUARD-SID','QA','QA','ALMACEN','PIURA','[]','');
exception when others then denied:=true; msg:=sqlerrm; end;
insert into ea_guard_results values('Idempotencia ligada a solicitud',denied,msg);
r:=public.mv_ea_verificar_recepcion_v399(id2,'QA-GUARD-SID');
insert into ea_guard_results values('Verificación no revela cargo ajeno',r->'cargo'='null'::jsonb,r->>'cargo');
denied:=false;
begin
 perform public.mv_ea_preparar_recepcion_v399(id1,'QA-GUARD-SID-2','QA','QA','ALMACEN','CHICLAYO','[{"serie":"QA-GUARD-SN","estado":"RECIBIDO"}]','');
exception when others then denied:=true; msg:=sqlerrm; end;
insert into ea_guard_results values('Bloquea segunda recepción con PDF pendiente',denied,msg);
denied:=false;
begin
 perform public.mv_ea_completar_tecnico(id1,'QA_GUARD_1','TECNICO','[{"tipo":"ONT ZTE","serie":"QA-GUARD-SN","codigoCliente":"OTRA"}]');
exception when others then denied:=true; msg:=sqlerrm; end;
insert into ea_guard_results values('Bloquea edición con recepción en curso',denied,msg);
r:=public.mv_ea_preparar_recepcion_v399(id1,'QA-GUARD-SID','QA','QA','ALMACEN','CHICLAYO','[]','');
insert into ea_guard_results values('Permite recuperar mismo PDF pendiente',(r->>'requiereFinalizar')::boolean,'');
perform public.mv_ea_finalizar_recepcion_v399('QA-GUARD-SID','storage://mi-visual-evidencias/qa/guard.pdf','guard.pdf','qa/guard.pdf');
perform public.mv_ea_volver_pendiente(id1,'QA','JEFATURA ALMACEN');
r:=public.mv_ea_preparar_recepcion_v399(id1,'QA-GUARD-SID','QA','QA','ALMACEN','CHICLAYO','[]','');
insert into ea_guard_results values('Reintento histórico no solicita finalizar',r->>'requiereFinalizar'='false' and r->>'estado'='PENDIENTE DE ENTREGA',r->>'estado');
end $test$;
do $ begin if exists(select 1 from ea_guard_results where passed is distinct from true) then raise exception 'EA guard regression failed'; end if; end $;
select * from ea_guard_results;
rollback;