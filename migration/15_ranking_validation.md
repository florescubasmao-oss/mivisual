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

## Configuración de pesos
La configuración productiva encontrada el 19/09/2026 se conserva separadamente:
- Julio: 35 / 30 / 0 / 10 / 12.5 / 12.5
- Agosto: 30 / 20 / 15 / 15 / 10 / 10
- Septiembre productivo: 50 / 20 / 5 / 5 / 5 / 15

La configuración objetivo de migración para septiembre se mantiene separada y no altera Google Sheets:
- Producción 40%
- Efectividad 20%
- SLA 10%
- Observaciones 10%
- Recableado 10%
- VTR/GAR 10%

La vista `mv_ranking_configuracion_comparacion` deja auditable esta diferencia.

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
