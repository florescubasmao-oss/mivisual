# MI VISUAL — Validación de Análisis Económico / Utilidad

Fecha: 18/09/2026  
Rama: `migracion-supabase`  
`main`: sin cambios

## Estado

**BACKEND ECONÓMICO VALIDADO.**

La lógica de cálculo está migrada y conciliada. La utilidad de setiembre no puede declararse final porque faltan gastos directos de la mayoría de cuadrillas.

## Fuentes migradas

- `CONSUMO_MATERIALES`: 1,392 / 1,392 filas.
- `CATALOGO_PRECIOS_MATERIALES`: 27 filas.
- `GASTOS_CUADRILLA`: 84 filas.
- `TARIFARIO_PDG`: 32 filas.
- `OBSERVACIONES`: 78 filas.

Totales de materiales:

- 2026-07: S/ 57,960.71
- 2026-08: S/ 54,039.97
- 2026-09: S/ 17,576.54

Gastos directos:

- Solo existen registros cargados para 2026-07: S/ 97,420.00.
- No existen gastos directos cargados en `GASTOS_CUADRILLA` para agosto ni setiembre.

Penalidades WIN con estado PENALIZADO:

- 2026-07: S/ 400
- 2026-08: S/ 600
- 2026-09: S/ 580

## Producción valorizada

### Periodos protegidos

Julio y agosto conservan el resultado económico publicado:

- Julio: S/ 289,440
- Agosto: S/ 314,570

Se detectaron tarifas unívocas recuperables por S/ 2,514 en julio y S/ 3,870 en agosto, pero no se aplican retroactivamente por protección de periodo.

### Setiembre

Regla de migración:

1. Las órdenes ya publicadas conservan el código económico publicado.
2. Se recuperan tarifas vacías solo cuando existe una única tarifa activa posible.
3. Se agregan correcciones explícitamente validadas.
4. El motor nuevo de partidas se usa para órdenes posteriores al corte; no reclasifica retroactivamente el snapshot publicado.

Resultado al corte:

- Legacy: S/ 236,530
- Tarifas unívocas recuperadas: +S/ 2,340
- Orden 3404829 / PS: +S/ 80
- Migración: **S/ 238,950**
- Órdenes: 1,078
- Partidas sin tarifa: 0

## PDG

Se conservaron los alias legacy:

- IC -> INSTALACION Y ACTIVACION DE ABONADOS EN CONDOMINIOS-V3
- UTP5 -> CABLEADO UTP CAT 5 O CAT 6 - POST VENTA

Regla por vigencia:

- P8 SGI Alex Bastidas: PDG.
- P7 SGI Víctor Pacherres: PDG hasta 31/07/2026.
- Desde 01/08/2026, P7 deja PDG y pasa a esquema regular con tarifa especial de bono.

Setiembre:

- PDG legacy: S/ 6,959.97
- PDG migración: S/ 4,384.89
- Diferencia: -S/ 2,575.08, correspondiente a P7, que ya no debe tratarse como PDG.

## Bonos usados en Utilidad

Legacy económico calculaba Producción + PEXT y mantenía P7 como PDG.

Migración usa el motor de Bonos ya validado:

- Producción normal.
- GAR/VTR BONO vigente.
- PEXT validado.
- Reglas PDG fechadas.
- Tarifas normales/especiales.

Setiembre:

- Bono legacy económico: S/ 17,955.00
- Bono migración: S/ 18,877.50
- Diferencia: +S/ 922.50

## Utilidad

### Julio

- Producción: S/ 289,440.00
- Costos: S/ 184,600.46
- Utilidad: S/ 104,839.54
- Cuadrillas completas: 23
- Incompletas: 0

### Agosto

Periodo protegido: no se reescribe.

- Producción: S/ 314,570.00
- Costos parciales: S/ 86,440.70
- Utilidad parcial: S/ 228,129.30
- Cuadrillas completas: 2
- Incompletas: 26

No existen gastos directos cargados del mes, por lo que no es una utilidad final.

### Setiembre

Legacy:

- Producción: S/ 236,530.00
- Costos calculados: S/ 43,071.51
- Utilidad mostrada: S/ 193,458.49

Migración:

- Producción: **S/ 238,950.00**
- Materiales: S/ 17,576.54
- Bonos: S/ 18,877.50
- PDG: S/ 4,384.89
- Penalidades WIN: S/ 580.00
- Costos parciales: **S/ 41,418.93**
- Utilidad parcial: **S/ 197,531.07**

Diferencia de utilidad parcial vs legacy: **+S/ 4,072.58**.

Estado:

- 1 cuadrilla completa: P8 SGI Alex Bastidas (PDG).
- 32 cuadrillas: `INCOMPLETO_GASTOS`.
- No se expone una utilidad confirmada para cuadrillas con gastos faltantes.

## Mejora estructural

El nuevo modelo separa:

- `utilidad_parcial`
- `utilidad_confirmada`
- `estado_economico`

Una cuadrilla regular solo queda COMPLETA si existen:

- Sueldo Técnico 1
- Sueldo Técnico 2
- Combustible
- Alquiler de unidad
- Partidas económicas con tarifa resuelta

Una cuadrilla PDG queda completa cuando el tarifario PDG y el ingreso están resueltos.

La fecha del consumo de materiales es fecha de referencia de la importación; no se usa como indicador de cobertura diaria.

## Seguridad

- RLS habilitado en snapshots económicos.
- Sin acceso directo anon/authenticated.
- No se modificó Google Sheets.
- No se modificó `main`.
- Histórico protegido preservado.
