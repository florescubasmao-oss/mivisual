-- MI VISUAL - Hardening de vistas VTR/GAR + Validacion Tecnica
-- Sin cambios de logica: solo SECURITY INVOKER y permisos backend-only.
begin;

alter view public.mv_vtr_gar_decision_por_orden set (security_invoker = true);
alter view public.mv_vtr_gar_indicador_snapshot_resumen set (security_invoker = true);
alter view public.mv_vtr_gar_indicador_actual_v487 set (security_invoker = true);
alter view public.mv_vtr_gar_indicador_migracion set (security_invoker = true);
alter view public.mv_vtr_gar_indicador_resumen_migracion set (security_invoker = true);
alter view public.mv_vtr_gar_indicador_conciliacion set (security_invoker = true);

alter view public.mv_validacion_tecnica_reglas set (security_invoker = true);
alter view public.mv_validacion_tecnica_resumen set (security_invoker = true);
alter view public.mv_vt_gar_vtr_decisiones_validas set (security_invoker = true);
alter view public.mv_vt_gar_vtr_decision_ticket set (security_invoker = true);
alter view public.mv_vt_gar_vtr_ordenes_ticket set (security_invoker = true);
alter view public.mv_vt_gar_vtr_estado_win_ticket set (security_invoker = true);
alter view public.mv_vt_gar_vtr_contexto_ticket set (security_invoker = true);

alter view public.mv_vtr_gar_bono_jefatura_ultima set (security_invoker = true);
alter view public.mv_validacion_tecnica_gar_vtr_ultima set (security_invoker = true);
alter view public.mv_validacion_tecnica_gar_vtr_resuelta set (security_invoker = true);
alter view public.mv_validacion_tecnica_gar_vtr_resumen set (security_invoker = true);
alter view public.mv_validacion_tecnica_gar_vtr_conciliacion set (security_invoker = true);

revoke all on public.mv_vtr_gar_decision_por_orden from anon,authenticated;
revoke all on public.mv_vtr_gar_indicador_snapshot_resumen from anon,authenticated;
revoke all on public.mv_vtr_gar_indicador_actual_v487 from anon,authenticated;
revoke all on public.mv_vtr_gar_indicador_migracion from anon,authenticated;
revoke all on public.mv_vtr_gar_indicador_resumen_migracion from anon,authenticated;
revoke all on public.mv_vtr_gar_indicador_conciliacion from anon,authenticated;

revoke all on public.mv_validacion_tecnica_reglas from anon,authenticated;
revoke all on public.mv_validacion_tecnica_resumen from anon,authenticated;
revoke all on public.mv_vt_gar_vtr_decisiones_validas from anon,authenticated;
revoke all on public.mv_vt_gar_vtr_decision_ticket from anon,authenticated;
revoke all on public.mv_vt_gar_vtr_ordenes_ticket from anon,authenticated;
revoke all on public.mv_vt_gar_vtr_estado_win_ticket from anon,authenticated;
revoke all on public.mv_vt_gar_vtr_contexto_ticket from anon,authenticated;

revoke all on public.mv_vtr_gar_bono_jefatura_ultima from anon,authenticated;
revoke all on public.mv_validacion_tecnica_gar_vtr_ultima from anon,authenticated;
revoke all on public.mv_validacion_tecnica_gar_vtr_resuelta from anon,authenticated;
revoke all on public.mv_validacion_tecnica_gar_vtr_resumen from anon,authenticated;
revoke all on public.mv_validacion_tecnica_gar_vtr_conciliacion from anon,authenticated;

grant select on public.mv_vtr_gar_decision_por_orden to service_role;
grant select on public.mv_vtr_gar_indicador_snapshot_resumen to service_role;
grant select on public.mv_vtr_gar_indicador_actual_v487 to service_role;
grant select on public.mv_vtr_gar_indicador_migracion to service_role;
grant select on public.mv_vtr_gar_indicador_resumen_migracion to service_role;
grant select on public.mv_vtr_gar_indicador_conciliacion to service_role;

grant select on public.mv_validacion_tecnica_reglas to service_role;
grant select on public.mv_validacion_tecnica_resumen to service_role;
grant select on public.mv_vt_gar_vtr_decisiones_validas to service_role;
grant select on public.mv_vt_gar_vtr_decision_ticket to service_role;
grant select on public.mv_vt_gar_vtr_ordenes_ticket to service_role;
grant select on public.mv_vt_gar_vtr_estado_win_ticket to service_role;
grant select on public.mv_vt_gar_vtr_contexto_ticket to service_role;

grant select on public.mv_vtr_gar_bono_jefatura_ultima to service_role;
grant select on public.mv_validacion_tecnica_gar_vtr_ultima to service_role;
grant select on public.mv_validacion_tecnica_gar_vtr_resuelta to service_role;
grant select on public.mv_validacion_tecnica_gar_vtr_resumen to service_role;
grant select on public.mv_validacion_tecnica_gar_vtr_conciliacion to service_role;

commit;