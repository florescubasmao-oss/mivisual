# Validación de Producción y Bono — Migración Supabase

Fecha de validación: 2026-09-18

## 1. Producción al corte de migración

Periodo: `2026-09`

Corte validado del snapshot legacy `PRODUCCION_APP`:

- Cantidad legacy: **1,077**
- Puntos legacy: **1,920**
- Corrección validada: orden `3404829`, recuperar Producción normal, partida `PS`, **+1 punto**
- Objetivo corregido de migración: **1,078 órdenes / 1,921 puntos**
- Motor PostgreSQL: **1,078 órdenes / 1,921 puntos**
- Pendientes sin partida: **0**
- Diferencia cantidad: **0**
- Diferencia puntos: **0**

La orden `3404829` corresponde a un caso GAR/VTR corregido a `NO_ES_GAR_VTR`. La regla vigente exige que vuelva a Producción normal y recupere su puntaje WIN.

## 2. Motor de partida

Prioridad aplicada:

1. Ajuste validado por Jefatura.
2. Regla activa V513 / regla histórica vigente.
3. Regla base por tipo de servicio cuando es inequívoca.
4. Regla histórica segura con pureza 100%.
5. Regla semántica explícita de migración.
6. Revisión Jefatura si no existe regla segura.

Resultado en el corte validado: **0 casos pendientes**.

La inferencia histórica se utilizó para diagnóstico y descubrimiento de reglas; no se dejó como mecanismo ciego de publicación.

## 3. Bono de Producción

Reglas vigentes preservadas:

- Mínimo diario para generar: **4.5 puntos**.
- Base sin bono: **4 puntos**.
- Valor normal: **S/30 por punto comisionable**.
- Valor especial: **S/45 por punto comisionable**.
- PEXT: **S/30 por punto PEXT comisionable**.
- PEXT completa primero la base pendiente cuando la Producción normal no alcanza 4 puntos.
- El bono de cuadrilla se divide referencialmente entre dos técnicos.

### PDG / reglas fechadas

- P8 VISUAL SGI Alex Bastidas: PDG, no participa en Bonos.
- P7 VISUAL SGI Víctor Pacherres: PDG hasta **31/07/2026**.
- P7 VISUAL SGI Víctor Pacherres: desde **01/08/2026** participa y usa tarifa especial.
- Las demás tarifas especiales de `bonos.js` fueron trasladadas a una tabla auditable con vigencia.

## 4. Fuentes adicionales del bono

### GAR/VTR

Se reconstruyó el snapshot activo usando:

- `BASE_VTR_GAR_DETECTADA`
- `VALIDACION_TECNICA`
- `VTR_GAR_BONO_JEFATURA`

Setiembre al corte:

- Casos GAR/VTR activos: **9**
- Casos BONO activos: **6**
- Puntos GAR/VTR activos: **9**
- NO BONO: suma **0**
- NO_ES_GAR_VTR: no suma por GAR/VTR y vuelve a Producción normal.

### PEXT

Snapshot histórico leído desde `TRABAJOS_CONJUNTA`.

Regla de puntos:

- Recableado: **2 pts c/u**
- Conectorizados 1–2: **1 pt**
- 3–6: **2 pts**
- 7–12: **3 pts**
- 13+: **4 pts**
- Solo ingresa al bono cuando existe visto bueno técnico y aprobación de Jefatura.

En setiembre al corte validado: **0 puntos PEXT**.

## 5. Conciliación diaria Bono

El cálculo se comparó por **fecha + cuadrilla**, no solo por total mensual.

Única diferencia entre legacy y motor corregido:

- Fecha: **02/09/2026**
- Cuadrilla: `P1 TRASLADO VISUAL DANY ELVIS ATENCIO RELUZ`
- Legacy: **4 pts / S/0**
- Migración: **5 pts / S/45**
- Diferencia: **+S/45**
- Causa: recuperación válida de la orden `3404829`.

No se detectaron otras diferencias de bono diario.

## 6. Valorización

Se preservó el resultado legacy y se creó una tarifa efectiva de migración.

Setiembre:

- Monto legacy: **S/236,530**
- Monto con tarifas unívocas recuperadas: **S/238,870**
- Diferencia recuperable: **S/2,340**

Origen de la diferencia:

- `MESHPV`: 13 órdenes × S/90 = **S/1,170**
- `REUSR`: 13 órdenes × S/90 = **S/1,170**

Estos códigos tenían tarifa válida en el catálogo, pero una fila posterior vacía anulaba el monto en la lógica legacy.

`CAT6MESH2` permanece marcado como tarifa ambigua porque existen valores activos de S/90 y S/105. No se selecciona un monto automáticamente.

## 7. Seguridad de migración

- No se modificó `main`.
- No se modificó Google Sheets productivo.
- Julio y agosto continúan protegidos.
- Los snapshots históricos se conservan.
- Correcciones y reglas de migración quedan separadas y auditables.
- Las tablas de diagnóstico tienen RLS y no son accesibles directamente a `anon` ni `authenticated`.
