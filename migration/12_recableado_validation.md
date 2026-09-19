# MI VISUAL — Validación de Recableado

Fecha: 18/09/2026  
Rama: `migracion-supabase`  
`main`: sin cambios

## Estado

**BACKEND DE RECABLEADO VALIDADO Y CERRADO.**

## Regla V487 preservada

Fuente: WIN / MAPA_ORDENES.

- Población: órdenes FINALIZADAS cuyo TIPO_TRABAJO contiene LOS ROJO.
- Recableado: dentro de esa población, MOTIVO_FINALIZACION contiene RECABLEADO.
- Fórmula: `Recableados / LOS ROJO finalizadas`.
- Los recableados fuera de LOS ROJO se controlan aparte y no ingresan al porcentaje.

Se reutiliza la homologación de cuadrillas V487 ya validada en Efectividad.

## Snapshot migrado

Hoja `PORCENTAJE REC`: **83 / 83 filas**.

Resumen:

- Julio: 453 LOS ROJO / 273 Recableados = **60.26%**.
- Agosto: 445 / 290 = **65.17%**.
- Setiembre al 17/09: 244 / 153 = **62.70%**.

## Conciliación PostgreSQL

Con el Mapa vigente importado el 18/09 07:05:

- Setiembre: 244 LOS ROJO.
- Recableados: 153.
- Porcentaje: **62.70%**.

Validación por las 33 cuadrillas de setiembre:

- Diferencia LOS ROJO: **0**.
- Diferencia Recableados: **0**.
- Diferencia porcentaje: **0.00 pp**.

## Periodos

- Julio: snapshot protegido.
- Agosto: snapshot protegido.
- Setiembre: cálculo vivo PostgreSQL V487.

## Objetos PostgreSQL

- recableado_legacy_snapshot
- mv_recableado_snapshot_resumen
- mv_recableado_actual_v487
- mv_recableado_migracion
- mv_recableado_resumen_migracion
- mv_recableado_conciliacion_periodo

## Seguridad

- RLS habilitado en snapshot.
- Sin acceso directo anon/authenticated.
- Google Sheets sin cambios.
- main sin cambios.
