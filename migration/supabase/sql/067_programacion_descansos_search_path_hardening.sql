-- 067_programacion_descansos_search_path_hardening.sql
-- Hardening sin cambio funcional: fija search_path de helpers de Programación de Descansos.

alter function public.mv_descansos_cuadrilla_norm(text)
  set search_path = public;

alter function public.mv_descansos_plataforma(text)
  set search_path = public;

alter function public.mv_descansos_estado_norm(text)
  set search_path = public;

alter function public.mv_descansos_es_jefatura(text)
  set search_path = public;

alter function public.mv_descansos_regla_cobertura(text, date)
  set search_path = public;

alter function public.mv_descansos_dia_semana(date)
  set search_path = public;

alter function public.mv_descansos_generar_id(text, date)
  set search_path = public;
