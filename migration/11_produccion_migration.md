# MI VISUAL — Migración de Producción

Fecha de trabajo: 18/09/2026  
Rama: `migracion-supabase`  
Producción `main`: sin cambios

## Principio

Producción no se migra como una copia simple de `PRODUCCION_APP`.

El modelo objetivo conserva:
1. orden WIN original;
2. fecha real de ejecución;
3. cuadrilla WIN y futura cuadrilla efectiva auditada;
4. elegibilidad de Producción normal;
5. clasificación GAR/VTR bidireccional;
6. partida WIN;
7. ajuste de partida validado;
8. partida efectiva;
9. puntos;
10. agregado por cuadrilla + fecha + código.

No se usarán sumas/restas ciegas.

## Fuentes migradas para conciliación

- `PRODUCCION_APP`: 2,742 filas.
- `CATALOGO_ORDENES`: 33 filas.
- `BASE_OPERATIVA_HISTORICA`: 4,144 / 4,144 filas.
- `AJUSTES_PARTIDA_WIN`: 33 ajustes validados.
  - agosto: 28
  - setiembre: 5
- `REGLAS_PARTIDA_WIN`: 80 reglas.
  - ACTIVO: 59
  - REFERENCIA_VTR_GAR: 10
  - REVISAR: 2
  - CANDIDATA: 4
  - OBSERVACION: 3
  - AMBIGUA: 2
- `AJUSTES_ORDEN_WIN`: 0 filas actualmente.
- dependencia `BASE_VTR_GAR_DETECTADA`: 160 clasificaciones.

## Producción histórica preservada

`PRODUCCION_APP` no tiene IDs duplicados.

Resumen:

| Periodo | Filas agregadas | Cantidad | Puntos legacy |
|---|---:|---:|---:|
| 2026-07 | 1,057 | 1,458 | 2,452.5 |
| 2026-08 | 1,027 | 1,518 | 2,624.0 |
| 2026-09 | 658 | 1,077 | 1,920.0 |

Los códigos duplicados en CATALOGO_ORDENES se preservan como filas distintas. Para Producción sus puntajes son consistentes entre variantes; los montos NO deben consolidarse automáticamente.

## Protección de periodos

- 2026-07: CERRADO / protegido.
- 2026-08: PROTEGIDO.
- 2026-09: ACTIVO.

Julio y agosto se conservan como snapshots históricos y no se recalculan con reglas creadas posteriormente.

## Regla de elegibilidad confirmada

Para el periodo activo:

1. La orden debe estar FINALIZADA.
2. La fecha operativa es `fecha_fin_visita`; si falta, se usa `fecha_solicitud`.
3. GAR/VTR confirmado o reasignado queda fuera de Producción normal.
4. `NO_ES_GAR_VTR` recupera elegibilidad para Producción normal.
5. Una orden con ticket GAR/VTR sin decisión todavía se trata como candidata GAR/VTR y no debe duplicarse en Producción.
6. El corte de publicación debe respetar también la hora cuando existe.

## Validación setiembre

Se detectaron inicialmente 5 diferencias contra el snapshot 17/09 20:34.

Dos eran posteriores al corte:
- `3447847`: finalizó 17/09 20:36.
- `3446713`: finalizó 17/09 21:03.

Tres tenían ticket GAR/VTR:
- `3404829`: VTR-47038979.
- `3435132`: VTR-47466832.
- `3436680`: GAR-47476918.

Al migrar la clasificación GAR/VTR se confirmó:

- `3404829` está validada como `NO_ES_GAR_VTR` desde 03/09.
- La orden está FINALIZADA.
- La matriz activa dispone de regla `R-044` para LOS ROJO + CONFIGURACION ONT + RESIDENCIAL -> `PS`.
- El snapshot actual de Producción no recuperó esta orden.

### Diferencia controlada

Con la lógica bidireccional correcta:

- Producción snapshot actual al corte: 1,077.
- Producción elegible calculada: 1,078.
- Diferencia: +1.
- Orden pendiente de recuperación lógica: `3404829`.

No se corrige el productivo durante la migración. La diferencia queda registrada para conciliación antes del corte.

## Modelo SQL creado

Tablas:
- `catalogo_partidas_migracion`
- `produccion_legacy_snapshot`
- `base_operativa_legacy`
- `ajustes_partida_win`
- `ajustes_orden_win`
- `reglas_partida_win`
- `produccion_periodos`
- `vtr_gar_clasificacion_legacy`

Vistas:
- `mv_catalogo_puntaje_codigo`
- `mv_produccion_legacy_resumen`
- `mv_ajuste_partida_vigente`
- `mv_vtr_gar_decision_por_orden`
- `mv_produccion_orden_elegibilidad_v1`
- `mv_produccion_orden_elegibilidad_v2`
- `mv_produccion_conciliacion_activa_v2`

## Próximo paso

Construir `partida efectiva por orden` en modo diagnóstico:

prioridad:
1. ajuste validado Jefatura;
2. regla automática ACTIVA;
3. partida WIN base;
4. casos V513 candidata/observación/ambigua quedan pendientes de validación;
5. Partner solo sirve como evidencia auxiliar y nunca reemplaza automáticamente una partida sin regla/validación.

Solo después de conciliar códigos y puntos se construirá la nueva tabla agregada de Producción.
