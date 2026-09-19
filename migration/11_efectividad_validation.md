# MI VISUAL — Validación de Efectividad

Fecha: 18/09/2026  
Rama: `migracion-supabase`  
`main`: sin cambios

## Estado

**BACKEND DE EFECTIVIDAD VALIDADO.**

La lógica vigente V487 fue recuperada desde el código histórico del proyecto y portada a PostgreSQL.

## Regla V487 preservada

Fuente principal: WIN / MAPA_ORDENES.

Partner solo interviene para identificar reservas pendientes.

Clasificación:

- RESERVA / RESERVADO -> fuera de Efectividad.
- CANCELADA que figura como RESERVA en Partner -> fuera de Efectividad.
- FINALIZADA -> FINALIZADA.
- REGESTIÓN -> REGESTION.
- ANULADA -> CANCELADA.
- REPROGRAMADA -> REPROGRAMADO.
- CANCELADA -> REPROGRAMADO si MOTIVO_CANCELACION + MOTIVO_ANULACION + DETALLE contiene REPROGRAM o POSTERGA.
- Resto de CANCELADA -> CANCELADA.
- Estados abiertos/no evaluables -> fuera del denominador.

Fórmula:

`Efectividad = Finalizadas / (Finalizadas + Canceladas + Regestión + Reprogramadas)`

## Homologación de cuadrillas

Se conserva la lógica V487:

1. Nombre exacto de cuadrilla activa.
2. Si cambia únicamente P# y la identidad restante es única, se homologa automáticamente.
3. Si no hay coincidencia única, se conserva como histórica sin homologar.

## Snapshot migrado

Hoja EFECTIVIDAD: **83 / 83 filas**.

Resumen publicado:

- Julio: 1,458 Finalizadas / 482 Canceladas / 71 Regestión / 247 Reprogramadas = 2,258 -> **64.57%**.
- Agosto: 1,565 / 470 / 61 / 327 = 2,423 -> **64.59%**.
- Setiembre al 17/09: 1,107 / 340 / 48 / 240 = 1,735 -> **63.80%**.

## Conciliación setiembre

Motor V487 sobre PostgreSQL con Mapa importado el 18/09 07:05:

- Finalizadas: 1,109
- Canceladas: 341
- Regestión: 48
- Reprogramadas: 240
- Total: 1,738
- Efectividad: **63.81%**

Diferencia contra snapshot 17/09:

- +2 Finalizadas
- +1 Cancelada
- 0 Regestión
- 0 Reprogramadas
- +3 órdenes evaluables

Las variaciones corresponden a estados posteriores al corte 17/09 20:34:

- 3447847 -> FINALIZADA 20:36
- 3446713 -> FINALIZADA 21:03
- P1 Elvi incorpora una CANCELADA posterior al corte; existen actualizaciones 3446816 21:33 y 3446897 18/09 01:21.

No existe diferencia de regla.

## Periodos

- Julio: snapshot protegido.
- Agosto: snapshot protegido.
- Setiembre: cálculo vivo PostgreSQL V487.
- Snapshot setiembre se conserva como evidencia de conciliación.

## Objetos PostgreSQL

- efectividad_legacy_snapshot
- efectividad_cortes_migracion
- mv_efectividad_reservas_partner_v487
- mv_efectividad_orden_v487
- mv_efectividad_actual_v487
- mv_efectividad_migracion
- mv_efectividad_resumen_migracion
- mv_efectividad_conciliacion_periodo

## Seguridad

- RLS en snapshots/cortes.
- Sin acceso directo anon/authenticated.
- Google Sheets sin cambios.
- main sin cambios.
