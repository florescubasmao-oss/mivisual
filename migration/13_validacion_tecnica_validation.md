# MI VISUAL — Cierre VTR/GAR + Validación Técnica

Fecha de validación: 19/09/2026 (America/Lima)

## Alcance

Este cierre corresponde únicamente a la rama `migracion-supabase`.
No modifica `main`, Apps Script productivo ni Google Sheets productivo.

## 1. Indicador POR VTR/GAR — CERRADO

Motor: `mv_vtr_gar_indicador_actual_v487`

Conciliación:

| Periodo | Finalizadas snapshot | Finalizadas motor | GAR | VTR | Total GAR/VTR | % | Dif. GAR/VTR |
|---|---:|---:|---:|---:|---:|---:|---:|
| 2026-07 | 1458 | 1458 | 13 | 31 | 44 | 3.02% | 0 |
| 2026-08 | 1565 | 1565 | 11 | 31 | 42 | 2.68% | 0 |
| 2026-09 | 1107 | 1109 | 1 | 8 | 9 | 0.81% | 0 |

Las +2 finalizadas de setiembre corresponden a actualización posterior del Mapa Operativo.
No modifican el numerador GAR/VTR ni el porcentaje a dos decimales.

## 2. VALIDACION_TECNICA — modelo migrado

Snapshot total: 674 registros.

- RECABLEADO: 597
- GAR/VTR: 77
- Sin código: 0
- Sin periodo: 0
- Sin fecha de registro: 0

Se mantiene separación estricta de capas:

1. `vtr_gar_clasificacion_legacy` / decisión por orden: determina si corresponde GAR/VTR y responsable.
2. `validacion_tecnica_migracion`: respuesta/validación técnica.
3. `vtr_gar_bono_jefatura_legacy_snapshot`: corrección de Jefatura únicamente sobre BONO / NO BONO.
4. La decisión de Jefatura de bono NO convierte por sí sola un caso en GAR/VTR.

## 3. Regla RECABLEADO 15 minutos

Función: `mv_vt_aplicar_vencidos()`

Solo aplica a:

- `tipo_validacion = RECABLEADO`
- `estado = PENDIENTE`
- vencimiento de 15 minutos

Resultado automático:

- Estado: `SIN RESPUESTA`
- Resultado final: `APROBADO AUTOMÁTICAMENTE`
- Validador: `SISTEMA`

GAR/VTR no entra en esta aprobación automática.

## 4. Capa Jefatura GAR/VTR

Fuente productiva leída sin modificar: `VTR_GAR_BONO_JEFATURA`.

- Eventos históricos: 28
- Decisiones vigentes por periodo + ticket: 26
- Dos tickets poseen más de una edición; prevalece la última edición.

Vista efectiva:

`mv_vtr_gar_bono_jefatura_ultima`

Precedencia de resultado BONO/NO BONO:

1. Jefatura, si existe decisión vigente.
2. Técnico, si no existe decisión de Jefatura.
3. Pendiente, si ninguna de las dos capas resolvió.

La contabilización de bono requiere además:

- clasificación `CONFIRMADO` o `REASIGNADO`;
- orden WIN `FINALIZADA`;
- resultado efectivo `BONO`.

## 5. Setiembre — resultado conciliado

Motor efectivo setiembre:

- GAR BONO técnico: 1 registro / 1 punto
- GAR PENDIENTE: 2
- VTR BONO técnico: 5 registros / 8 puntos
- VTR NO BONO técnico: 2
- VTR NO BONO Jefatura: 1
- VTR PENDIENTE: 7

Total BONO contable:

**6 casos / 9 puntos**

Coincide con el snapshot de Bono Producción.

Caso que demuestra la capa Jefatura:

`VTR-47054291`

- No existe registro equivalente en VALIDACION_TECNICA.
- Jefatura: `NO BONO`.
- Responsabilidad GAR/VTR: `CONFIRMADO`.
- WIN: `FINALIZADA`.
- Resultado efectivo: `NO BONO`.
- Puntos contables: 0.

Conciliación setiembre contra `bono_vtr_gar_snapshot`:

- 9 registros: `OK`
- 9 registros: `SOLO_MOTOR` (pendientes todavía no publicados en snapshot)
- 0 registros: `REVISAR`

## 6. Bidireccionalidad con Producción

Caso oficial:

`3404829 / VTR-47038979`

Estado Jefatura:

`NO_ES_GAR_VTR`

Resultado comprobado:

- Producción recuperada: sí
- Elegible Producción efectiva: sí
- Motivo: `RECUPERADA_NO_ES_GAR_VTR`
- Partida motor: `PS`

Controles:

- Casos `NO_ES_GAR_VTR` contando bono: 0
- BONO contable con WIN no finalizada: 0

La regla bidireccional queda preservada.

## 7. Diferencia histórica protegida

Agosto presenta un único registro donde ambos lados existen pero difieren:

`GAR-46271308`

- VALIDACION_TECNICA actual: `NO BONO`
- Snapshot histórico de bono: `SIN_EVALUACION`
- Puntos: 0 en ambos

La hoja productiva confirma la respuesta técnica `NO BONO`.
No existe corrección de Jefatura para ese ticket.

Como agosto está protegido, no se fuerza ni se reescribe el snapshot histórico.
La diferencia queda auditada.

## 8. Seguridad del bloque

Se detectó que vistas de 029–031 habían heredado permisos para `anon` y `authenticated`.

Se aplicó hardening sin cambiar lógica:

- vistas VTR/GAR + Validación Técnica con `security_invoker = true`;
- acceso `anon`: revocado;
- acceso `authenticated`: revocado;
- acceso backend: `service_role`.

Validación posterior:

**0 permisos anon/authenticated en vistas VTR/GAR–Validación Técnica.**

El advisor global todavía reporta vistas SECURITY DEFINER en otros módulos antiguos. No se modifican en este cierre para evitar cambios masivos; se deben endurecer de forma incremental antes del cutover.

También queda pendiente transversal habilitar protección de contraseñas filtradas en Supabase Auth antes de salida productiva.

## 9. SQL del cierre

- `029_validacion_tecnica_modelo_migracion.sql`
- `030_validacion_tecnica_seguridad_transaccional.sql`
- `031_validacion_tecnica_periodo_iso.sql`
- `032_validacion_tecnica_puntaje_vtr_gar.sql`
- `033_validacion_tecnica_jefatura_resolucion.sql`
- `034_vtr_gar_validacion_tecnica_hardening.sql`

## Estado final

**POR VTR/GAR: CERRADO.**

**VALIDACION_TECNICA — backend/lógica de migración: CERRADO para continuar con Ranking / SLA / Dashboard.**

Pendiente para la fase de módulo/frontend:

- API/RPC de escritura bajo Auth y permisos;
- exportación Excel;
- visualización;
- cutover final.


## 10. Seguridad por rol V490 — incorporada

Se revisó el parche productivo `V490-SEGURIDAD-VTRGAR-JEFATURA-20260826`.

Regla vigente trasladada al piloto PostgreSQL:

- VTR/GAR: solo `JEFATURA` / `JEFATURA GENERAL` puede modificar o validar.
- Supervisor: conserva lectura por sede y no puede escribir VTR/GAR.
- Gerencia y demás perfiles con `VER`: consulta según `app_permissions`, sin escritura VTR/GAR.
- Técnico: conserva registro/historial operativo; la validación GAR/VTR no se habilita para su perfil.
- Recableado/Otro: Supervisor conserva el flujo de validación vigente.
- `ADMIN` / `ADMINISTRADOR` ya no se aceptan como validador GAR/VTR solo por poseer permiso `VALIDAR`; V490 exige además el perfil Jefatura.

Edge Function:
- `validacion-tecnica-pilot` versión 2.
- JWT obligatorio.
- Rama: `migracion-supabase`.
- Commit: `2fd3c1747f8e6bc687a89eb8b358cabffd2a8bb3`.

La capa de responsabilidad GAR/VTR en PostgreSQL continúa de solo lectura en el piloto; por tanto no existe una ruta alternativa que permita CONFIRMAR / REASIGNAR / ANULAR fuera de Jefatura.
