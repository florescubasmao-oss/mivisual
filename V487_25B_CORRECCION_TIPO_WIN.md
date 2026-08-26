# V487.25B – Prioridad de tipo VTR/GAR desde WIN

## Corrección detectada en diagnóstico
El caso `VTR-46251243` estaba registrado históricamente como tipo `GAR`, pero en `MAPA_ORDENES` el `CODIGO_SEGUIMIENTO` es `VTR-46251243`.

Regla definitiva:
- `CODIGO_SEGUIMIENTO` WIN que inicia `VTR-` => **VTR**.
- `CODIGO_SEGUIMIENTO` WIN que inicia `GAR-` => **GAR**.
- El tipo histórico se conserva solo como trazabilidad.
- Si hay discrepancia, **WIN manda para el análisis de responsabilidad**.
- No se reescribe el histórico por esta discrepancia.

## Caso de control adicional
`VTR-46251243`
- DNI: `70440430`.
- Ejecutora actual: `P7 VISUAL SGI VICTOR MANUEL PACHERRES RUIZ`.
- WIN: `CODIGO_SEGUIMIENTO = VTR-46251243`.
- `TIPO_TRABAJO` WIN figura `GARANTIA`, por lo que el prefijo del ticket tiene prioridad.
- Instalación anterior: orden `3304757`, P11, 24/07/2026.
- Al ser **VTR**, esa instalación no debe usarse como antecedente VTR.
- Resultado esperado corregido: **REVISIÓN MANUAL**.

## Diagnóstico V2
Archivo: `Code_V487_25_DIAGNOSTICO_TIPO_WIN_V2.gs`

Se ejecuta después de haber cargado el diagnóstico base y expone:
`EJECUTAR_DIAGNOSTICO_V48725_TIPO_WIN_V2()`

Debe confirmar:
1. `VTR-46128271` => VTR / PROPIA.
2. `GAR-46249523` => GAR / ASIGNADA P4.
3. `VTR-46866989` => VTR / REVISIÓN MANUAL.
4. `VTR-46251243` => histórico GAR, WIN VTR, tipo usado VTR / REVISIÓN MANUAL.

## Parche funcional
Archivo complementario: `Code_V487_25B_TIPO_WIN_POST_PATCH.gs`.

Por seguridad, cuando llegue la prueba funcional este bloque debe pegarse **después del parche V487.25 dentro del mismo archivo de Apps Script**. Así se garantiza que la respuesta de Gestión VTR/GAR se normaliza con el tipo WIN antes de mostrar la propuesta.

## Sin cambios
- Producción.
- Efectividad.
- Recableados.
- Histórico.
- Regla de indicador VTR/GAR: solo CONFIRMADO + REASIGNADO contabilizan.
- Partner sigue como respaldo/manual, no como fuente principal.
