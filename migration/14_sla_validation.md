# MI VISUAL — Cierre backend SLA V323/V367

Fecha de validación: 18/09/2026 (America/Lima)

## Alcance

Migración progresiva en rama `migracion-supabase`.
No se modifica `main`, Apps Script productivo ni Google Sheets productivo.

## 1. Lógica SLA preservada

Regla vigente recuperada desde `Code.gs` y V323/V367:

- Solo órdenes WIN `FINALIZADA`.
- Periodo por FIN → INICIO → SOLICITUD.
- Inicio y Fin deben existir y Fin >= Inicio.
- Sin tiempos válidos: `SIN TIEMPOS`, no evaluable.
- Sin partida: `SIN PARTIDA`, no evaluable.
- Sin parámetro SLA: `SIN PARÁMETRO`, no evaluable.
- Minutos de gestión = diferencia INICIO/FIN redondeada a minutos.
- Cumplimiento bruto = minutos <= SLA de la partida.
- Excepción `APROBADA` convierte un fuera de SLA en cumplimiento ajustado.
- Fórmula oficial: Cumplen ajustado / Evaluables × 100.
- Los porcentajes de cuadrilla no se promedian: se consolidan cantidades.
- Instalación solo cuando TIPO_TRABAJO es INSTALACION o INSTALACION POSIBLE FRAUDE y MOTIVO_FINALIZACION está vacío o es INSTALADO. Todo otro FINALIZADO es VISITA TÉCNICA.

## 2. Parámetros históricos

Se migraron 56 filas de `PARAMETROS_SLA_WIN`.

No se usa una regla global fija para todos los meses.

Julio conserva parámetros históricos específicos por partida.
Desde agosto se usa el catálogo vigente, principalmente:

- Instalación / Recableado / Postventa: 140 min.
- Otras partidas: 80 min.

La vigencia se resuelve por periodo usando la referencia del día 15 del mes, igual que el backend legado.

## 3. Excepciones

Se migró 1 excepción histórica:

- Periodo: 2026-08
- Código: 3356421
- Cuadrilla: P10 VISUAL SGI JAIME ARTURO YNGA MORE
- Gestión: 298 min
- SLA: 140 min
- Motivo: METRAJE ELEVADO
- Estado: APROBADA

Esta excepción explica la diferencia de 1 orden entre SLA bruto y ajustado de agosto.

## 4. Snapshot técnico migrado

`SLA_ORDENES_RESUMEN`:

- Julio: 1,510 órdenes
- Agosto: 1,565 órdenes
- Setiembre snapshot: 1,163 órdenes
- Total: 4,238 órdenes

Tablas PostgreSQL:

- `sla_parametros_legacy_snapshot`
- `sla_excepciones_legacy_snapshot`
- `sla_ordenes_legacy_snapshot`

## 5. Hallazgo de fuente incompleta

`BASE_OPERATIVA_HISTORICA` productiva actualmente termina en 24/08/2026.

La copia `base_operativa_legacy` contiene:

- Julio: 2,321 filas
- Agosto: 1,823 filas, hasta 24/08
- Setiembre: 0 filas

Por eso no puede usarse sola para reconstruir SLA de agosto completo ni setiembre.

No se inventaron partidas.

Se creó un puente auditable:

`mv_sla_partida_codigo_v323`

Prioridad durante la migración:

1. Partida ya publicada por código en `SLA_ORDENES_RESUMEN`.
2. Fallback a `base_operativa_legacy` si el código aún no existe en el snapshot SLA.

Para el cutover futuro, la partida deberá persistirse en PostgreSQL al momento de cada nueva carga; el snapshot legado no será la fuente permanente.

## 6. Julio — conciliación cerrada

- Finalizadas: 1,510 / 1,510
- Evaluables: 1,509 / 1,509
- Cumplen ajustado: 899 / 899
- Sin partida: 0 / 0
- Sin parámetro: 1 / 1
- SLA ajustado: **59.58% / 59.58%**
- Cuadrillas: **24 / 24 OK**

Diferencia: 0.

## 7. Agosto — conciliación cerrada

- Finalizadas: 1,565 / 1,565
- Evaluables: 1,518 / 1,518
- Cumplen ajustado: 808 / 808
- Sin partida: 4 / 4
- Sin parámetro: 43 / 43
- SLA ajustado: **53.23% / 53.23%**
- Cuadrillas: **27 / 27 OK**

Se detectaron 6 órdenes históricamente asociadas a:

`P12 VISUAL SGI LUIS ELIAS VASQUEZ BULLON`

que actualmente aparecen en Mapa como:

`P12 VISUAL SGI MAYCOL ESTIICK MOGOLLON SIPION`

Como agosto está protegido, esas 6 órdenes conservan la cuadrilla histórica únicamente para el SLA histórico.

Vista:

`mv_sla_orden_operativa_v323`

Setiembre y periodos activos mantienen la cuadrilla actual del Mapa.

## 8. Setiembre — motor actual

El snapshot técnico fue reconstruido el 18/09/2026 alrededor de las 20:52 y conserva 1,163 órdenes.

El Mapa PostgreSQL más reciente tiene 1,109 FINALIZADAS para setiembre.

Motor actual:

- Finalizadas: **1,109**
- Evaluables: **1,063**
- Cumplen ajustado: **599**
- Sin partida: **20**
- Sin parámetro: **26**
- SLA ajustado: **56.35%**

El snapshot completo anterior mostraba 56.01% porque incluía 54 órdenes que ya no están FINALIZADAS en el estado actual.

Conciliación justa contra las mismas 1,109 órdenes actuales:

- Códigos comparados: 1,109
- Sin referencia legacy: 0
- Diferencia partida: 0
- Diferencia minutos: 0
- Diferencia SLA minutos: 0
- Diferencia evaluable: 0
- Diferencia cumplimiento bruto: 0
- Diferencia cumplimiento ajustado: 0
- Diferencia excepción: 0
- Diferencia resultado: 0

Por lo tanto, el cambio de 56.01% → 56.35% es actualización de estado/población, no diferencia de fórmula.

## 9. Seguridad

Tablas SLA con RLS habilitado.

Vistas SLA con `security_invoker=true`.

Permisos directos:

- `anon`: 0
- `authenticated`: 0
- backend: `service_role`

## 10. SQL del bloque

- `035_sla_v323_modelo_migracion.sql`
- `036_sla_v323_partida_snapshot_bridge.sql`
- `037_sla_v323_historico_cuadrilla_protegida.sql`

## Estado final

**SLA backend/lógica: CERRADO.**

El siguiente bloque es:

**RANKING → DASHBOARD**

con pesos vigentes:

- Producción: 40%
- Efectividad: 20%
- SLA: 10%
- Observaciones: 10%
- Recableado: 10%
- VTR/GAR: 10%
