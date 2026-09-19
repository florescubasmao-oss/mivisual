# MI VISUAL — Validación de Recableado

Fecha: 18/09/2026
Rama: migracion-supabase
main: sin cambios

## Estado
BACKEND DE RECABLEADO VALIDADO Y CERRADO.

## Regla V487
- Fuente: WIN / MAPA_ORDENES.
- Población: órdenes FINALIZADAS cuyo TIPO_TRABAJO contiene LOS ROJO.
- Recableado: MOTIVO_FINALIZACION contiene RECABLEADO.
- Fórmula: Recableados / LOS ROJO finalizadas.
- Recableados fuera de LOS ROJO no ingresan al porcentaje.
- Se conserva homologación de cuadrillas V487.

## Snapshot
PORCENTAJE REC: 83 / 83 filas.

- Julio: 453 / 273 = 60.26%.
- Agosto: 445 / 290 = 65.17%.
- Setiembre: 244 / 153 = 62.70%.

## Conciliación PostgreSQL
Mapa vigente 18/09 07:05:
- Setiembre: 244 LOS ROJO.
- Recableados: 153.
- Porcentaje: 62.70%.
- 33 cuadrillas: diferencia 0.

## Periodos
- Julio: snapshot protegido.
- Agosto: snapshot protegido.
- Setiembre: cálculo vivo PostgreSQL V487.

## Objetos
- recableado_legacy_snapshot
- mv_recableado_snapshot_resumen
- mv_recableado_actual_v487
- mv_recableado_migracion
- mv_recableado_resumen_migracion
- mv_recableado_conciliacion_periodo

RLS habilitado. Sin cambios en Google Sheets ni main.
