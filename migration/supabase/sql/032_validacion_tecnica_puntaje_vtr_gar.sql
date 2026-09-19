-- MI VISUAL - Validacion Tecnica: conservar PUNTAJE_VTR_GAR
begin;

alter table public.validacion_tecnica_migracion
  add column if not exists puntaje_vtr_gar numeric(12,3);

update public.validacion_tecnica_migracion m
set puntaje_vtr_gar = coalesce(l.puntaje_vtr_gar,0)
from public.validacion_tecnica_legacy_snapshot l
where l.id=m.id
  and m.fuente='LEGACY_SHEET'
  and m.puntaje_vtr_gar is distinct from coalesce(l.puntaje_vtr_gar,0);

commit;
