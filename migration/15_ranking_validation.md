# Validación Ranking – Migración PostgreSQL

Fecha de validación: 19/09/2026

## Estado
**RANKING backend/lógica: CERRADO.**

Se mantiene intacta la aplicación productiva Google Sheets + Apps Script y no se modifica la rama `main`.

## Migraciones
- `038_ranking_motor_migracion.sql`
- `039_ranking_cuadrilla_canonica.sql`
- `040_ranking_cuadrilla_canonica_fuentes.sql`

## Fuentes integradas
El motor PostgreSQL consume:
- Producción: `mv_produccion_partida_motor_migracion_v1` + `mv_catalogo_puntaje_codigo`.
- Efectividad: `mv_efectividad_migracion`.
- Recableado: `mv_recableado_migracion`.
- VTR/GAR: `mv_vtr_gar_indicador_migracion`.
- SLA: `mv_sla_resumen_actual_v323`.
- Observaciones: `economico_observaciones_snapshot`.
- Metadatos de cuadrilla: `app_users`.

## Fórmula recuperada
- Producción: normalización contra el máximo del período.
- Efectividad: porcentaje directo.
- Recableado: `100 - valor/max(valor)*100`.
- VTR/GAR: `100 - valor/max(valor)*100`.
- Observaciones: `100 - monto_afectado/max(monto_afectado)*100`.
- SLA: SLA ajustado directo.
- Puntaje final: suma ponderada de los seis indicadores.
- Puestos regional, sede y plataforma: independientes y determinísticos.

Factor de observaciones:
- PENALIZADO / EN PROCESO / APELADO / DERIVADO y demás estados no exceptuados: 100%.
- SUBSANADO / ANULADO: 20%.

## Protección histórica
El Ranking legado fue importado como snapshot con **86 filas**.

La vista final `mv_ranking_migracion` trabaja así:
- 2026-07: histórico protegido, excluyendo la pseudo-cuadrilla `TODAS`: **27 cuadrillas**.
- 2026-08: histórico protegido: **26 cuadrillas**.
- 2026-09: motor PostgreSQL actual: **33 cuadrillas**.

No se recalculan julio ni agosto.

## Configuración de pesos por período — corrección 20/09/2026

Regla confirmada: los pesos del Ranking han cambiado entre períodos y no existe una ponderación global única.

Fuente administrativa actual `CONFIGURACION_RANKING`:
- Julio: 35 / 30 / 0 / 10 / 12.5 / 12.5.
- Agosto: 30 / 20 / 15 / 15 / 10 / 10.
- Septiembre vigente desde 16/09/2026: 50 / 20 / 5 / 5 / 5 / 15.

Se detectó que las filas históricas publicadas de julio conservan `pesos_json` 30 / 20 / 15 / 15 / 10 / 10 y aportes consistentes con esa ponderación. Por seguridad:
- Julio y agosto continúan como snapshots cerrados y NO se recalculan.
- En meses cerrados manda el resultado publicado y su trazabilidad histórica; una configuración administrativa modificada posteriormente no reescribe el cierre.
- Septiembre es período activo y sí debe coincidir con la configuración productiva vigente.

Corrección aplicada en Supabase el 20/09/2026:
- Septiembre pasó de 40 / 20 / 10 / 10 / 10 / 10 a 50 / 20 / 5 / 5 / 5 / 15.
- `mv_ranking_configuracion_comparacion` debe devolver `IGUAL` para septiembre.
- Se refrescó `dashboard_ranking_cache` únicamente para 2026-09.
- Julio y agosto no fueron modificados.

Para octubre y meses siguientes se creará una fila independiente por período; nunca se sustituirá la configuración del período anterior.

## Validaciones septiembre
Motor actual:
- 33 cuadrillas únicas.
- Producción total: **1925 puntos**.
- Observaciones: **21**.
- Monto total de observaciones: **S/ 4,130.00**.
- Monto afectado después de factores: **S/ 1,618.00**.

Comparación contra el snapshot de Ranking del 18/09:
- 32 cuadrillas comunes.
- Recableado: 32/32 iguales.
- VTR/GAR: 32/32 iguales.
- Observaciones/monto afectado: 32/32 iguales.
- Producción: 29/32 iguales.
- Efectividad: 29/32 iguales.
- SLA: 30/32 iguales.

Las diferencias restantes corresponden a actualización posterior del universo operativo:
- P1 Traslado Dany Atencio: Producción 95 -> 96.
- P1 SGI Elvi Atarama: cambió Efectividad.
- P10 Traslado Robertson Vergara: Producción 53 -> 55, cambió Efectividad y SLA.
- P6 SGI Roberto Espinoza: Producción 47 -> 49, cambió Efectividad y SLA.
- P12 SGI Luis Elías Vásquez aparece en el motor actual con actividad real aunque no estaba en el snapshot del Ranking anterior.

## Corrección de identidad de cuadrilla
Se detectó:
- `P 8 VISUAL SGA BRUNO ANGELO ATARAMA OROZCO`
- `P8 VISUAL SGA BRUNO ANGELO ATARAMA OROZCO`

Era la misma cuadrilla con diferencia de formato. La corrección se realiza únicamente en la capa de emparejamiento del Ranking. No se modificaron `app_users` ni las fuentes de indicadores.

Antes: 34 claves.
Después: **33 cuadrillas únicas**.

## Seguridad
- RLS habilitado en las tablas nuevas.
- Vistas con `security_invoker=true`.
- Grants directos para `anon` / `authenticated`: **0**.
- Lectura backend conservada para `service_role`.

## Pendiente para fase de módulos/frontend
- Exponer Ranking mediante RPC/API autenticada.
- Render de ranking/medallas.
- Selector de período.
- Vista de detalle por indicador.
- Mantener la configuración de pesos administrable con control de permisos.


## Regla V493 — VTR/GAR SOLO PROPIAS en Ranking

Se recuperó y portó el parche productivo `V493-RANKING-VTRGAR-SOLO-PROPIAS-20260826`.

Regla:

- El indicador general POR VTR/GAR y Dashboard NO cambian.
- Ranking penaliza únicamente incidencias VTR/GAR propias.
- Propia = cuadrilla responsable/origen igual a cuadrilla ejecutora.
- CONFIRMADO / REASIGNADO son estados contabilizables.
- Asignada/Reasignada a otra cuadrilla no penaliza Ranking.
- BONO / NO BONO no altera esta clasificación.
- PENDIENTE y ANULADO no penalizan.

Implementación PostgreSQL:

- `101_ranking_vtrgar_solo_propias_v493.sql`
- nueva vista `mv_ranking_vtr_gar_propias_v493`.
- `mv_ranking_componentes_migracion` usa esa vista solo para el componente VTR/GAR del Ranking.
- `mv_vtr_gar_indicador_migracion` permanece intacta para Dashboard/indicador general.

Validación al 19/09/2026:

- Setiembre: 33 cuadrillas.
- Diferencias entre indicador general y V493 en setiembre: 0, porque las 9 incidencias confirmadas actuales son propias.
- Histórico detectado: julio tiene 6 incidencias asignadas/reasignadas de 42 confirmadas; agosto 10 de 45. Estos períodos siguen protegidos por snapshot y no se recalculan.

Commit: `ebc49cb478aaeb160cffe365e6abfe2dd6603136`.
