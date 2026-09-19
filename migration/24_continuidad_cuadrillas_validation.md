# Validación V496 — Continuidad / Cambio de Cuadrilla

Fecha: 19/09/2026  
Rama: `migracion-supabase`  
Estado: **LIVE_VALIDAR / SIN CUTOVER PRODUCTIVO**

## Regla recuperada de Apps Script

Fuente: `V496_CONTINUIDAD_CUADRILLAS.gs`.

- El histórico original no se reescribe.
- La identidad nueva consolida cuadrilla anterior + nueva.
- La continuidad aplica desde el MES de la fecha efectiva.
- Meses cerrados anteriores conservan identidad histórica.
- El login no cambia.
- Solo JEFATURA / JEFATURA GENERAL puede administrar.
- Ranking y Dashboard trabajan con identidad consolidada.
- Producción, Efectividad, Recableado, VTR/GAR, Observaciones y SLA mantienen sus fuentes; la continuidad actúa como capa de lectura/agregación.

## Conciliación productiva

Hoja: `CONTINUIDAD_CUADRILLAS`

Registros productivos: 3  
Registros PostgreSQL: 3  
Diferencias: 0

Reglas migradas:

1. P12 VISUAL SGI CESAR MOISES FERNANDEZ MUNDACA → P13 VISUAL SGI CESAR MOISES FERNANDEZ MUNDACA, efectiva 26/08/2026.
2. P9 VISUAL SGA PEDRO PABLO ZAPATA YOVERA → P9 VISUAL SGA RONAL ENRIQUE TESEN CALDERON, efectiva 01/09/2026.
3. P9 VISUAL SGA RONALD ENRIQUE TESEN CALDERON → P9 VISUAL SGA RONAL ENRIQUE TESEN CALDERON, efectiva 01/09/2026.

## PostgreSQL

Migraciones:

- `102_continuidad_cuadrillas_v496.sql`
- `103_continuidad_v496_ranking_dashboard_bridge.sql`
- `104_continuidad_v496_normalizacion_cuadrilla.sql`

Tabla:

- `continuidad_cuadrillas_migracion`

Funciones:

- `mv_continuidad_cuadrilla(periodo,cuadrilla)`
- `mv_continuidad_validar_sin_ciclo(...)`
- `mv_continuidad_guardar_v496(...)`

Controles:

- Advisory lock al guardar.
- Idempotencia para misma anterior+nueva+fecha.
- Detección de ciclos.
- Actualización únicamente del catálogo vigente `app_users.cuadrilla`; usuario/login no cambia.
- Histórico de indicadores no se reescribe.

## Cálculos consolidados

Vistas de continuidad:

- `mv_continuidad_produccion_ranking_v496`
- `mv_continuidad_efectividad_v496`
- `mv_continuidad_recableado_v496`
- `mv_continuidad_vtrgar_ranking_v496`
- `mv_continuidad_vtrgar_dashboard_v496`
- `mv_continuidad_observaciones_ranking_v496`
- `mv_continuidad_sla_v496`

No se promedian porcentajes. Se suman numeradores/denominadores y se recalculan:

- Efectividad = finalizadas / total.
- Recableado = recableados / LOS rojo.
- VTR/GAR = GAR+VTR / finalizadas.
- SLA = cumplen / evaluables.

Ranking conserva V493: VTR/GAR SOLO PROPIAS.

Dashboard conserva el indicador VTR/GAR completo.

## Normalización

V496 productivo usa `normalizarCuadrilla`. En PostgreSQL se replica la normalización visible para evitar duplicados como:

- `P 8 ...`
- `P8 ...`

Prueba:

- Antes del ajuste: 34 filas Ranking septiembre.
- Después: 33 filas / 33 claves únicas.

## Pruebas de identidad

- Julio P12 → P12 (histórico intacto).
- Agosto P12 → P13.
- Septiembre P9 Pedro → P9 Ronal.
- Septiembre P9 Ronald → P9 Ronal.

Ranking septiembre:

- P12 histórica: 0 filas.
- P13 activa: 1 fila.
- P9 Pedro: 0 filas.
- P9 Ronald: 0 filas.
- P9 Ronal: 1 fila.

Caches PostgreSQL refrescados:

- Ranking: 33 filas.
- Cumplimiento: 33 filas.

## API piloto

Edge Function:

- `continuidad-cuadrillas-pilot`
- ACTIVE v1
- JWT obligatorio

Acciones:

- `contextoContinuidadCuadrillas`
- `listarContinuidadCuadrillas`
- `guardarContinuidadCuadrilla`

Permisos:

- JEFATURA / JEFATURA GENERAL.
- Requiere permiso dinámico `CONTINUIDAD CUADRILLAS`.
- `registrar=true` representa ADMINISTRAR en el modelo PostgreSQL.

Al guardar una continuidad, se refrescan únicamente los caches de períodos activos afectados.

## Seguridad

- RLS activo.
- 0 privilegios directos para `anon` / `authenticated`.
- Acceso de datos por backend `service_role`.
- Edge Function con JWT.

## Commits

- Modelo V496: `bc19572d736a0c287fcda8e3e21176741398c69d`
- Bridge Ranking/Dashboard: `2a47cc34498303fdd8ba35edd0a01b45d79f723e`
- Normalización de cuadrilla: `18d2bb2c021d217dffa4242675808b5b7a2b94e5`
- API piloto: `d5c63c74f28ad65d520761fc82b37fcae3baeb01`

## Pendiente de cutover

- Prueba Auth real con Jefatura/Jefatura General.
- Reconciliación final de la hoja `CONTINUIDAD_CUADRILLAS`.
- Mantener legacy activo hasta el corte general.

Apps Script, Sheets, Drive y `main` continúan sin cambios.
