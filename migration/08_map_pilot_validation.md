# MI VISUAL — Validación del piloto Mapa Operativo
Fecha: 2026-09-18

## Equivalencia de datos comprobada

Fuente actual: Google Sheets / MAPA_ORDENES
Destino piloto: Supabase / public.ordenes

- Filas totales: Sheets 6,549 / PostgreSQL 6,549
- ORDEN_ID únicos: Sheets 6,549 / PostgreSQL 6,549

### Distribución por sede
- CHICLAYO: 2,960 / 2,960
- PIURA: 1,810 / 1,810
- TRUJILLO: 1,746 / 1,746
- Sin sede reconocida: 33 / 33

### Distribución por estado
- Agendada: 48 / 48
- Anulada: 212 / 212
- Cancelada: 1,909 / 1,909
- Finalizada: 4,185 / 4,185
- Iniciada: 14 / 14
- Regestión: 181 / 181

### Validaciones adicionales
- 17/09/2026: 109 / 109
- 18/09/2026: 41 / 41
- SETIEMBRE 2026 + CHICLAYO: 887 / 887

## Estado del API
- mapa-operativo-pilot: ACTIVE
- JWT requerido
- acceso directo a tablas bloqueado para anon/authenticated
- lecturas operativas se ejecutan mediante Edge Function + RPC restringida
- RLS habilitado

## Pendiente antes de corte
- relación secundaria Código de pedido -> Orden que actualmente consulta fuentes legacy adicionales
- importación/escritura desde el nuevo backend
- validación de Supervisor por cuadrillas con sesión Auth real
- pruebas móviles
- prueba funcional del usuario


## Validación funcional con Auth real — 18/09/2026

Usuario de prueba:
- usuario: JEFZNORTE
- perfil: JEFATURA
- nivel de acceso: ZONA NORTE
- sede: TODAS
- Auth Supabase: vinculado
- permiso MAPA OPERATIVO: activo, VER=true, alcance TODOS

Pruebas aprobadas:
- carga de catálogos desde PostgreSQL
- búsqueda por código de orden
- orden de prueba 3448347 encontrada correctamente
- pedido relacionado: 2111725
- DNI relacionado: 47791563
- sede: TRUJILLO
- estado: Agendada
- cuadrilla: P2 TRASLADO VISUAL LUIS FRANCISCO ESPIRE CHIQUEZ
- CTO cercanas: consulta correcta
- CTO coincidencias en área: 151
- CTO mostradas por límite piloto: 100
- respuesta truncada: true

Corrección aplicada:
- se corrigió solo en el piloto el formato de ultimaActualizacionTexto para preservar la hora local almacenada y evitar una segunda conversión UTC (-5).

### Hallazgo de calidad de datos CTO

Se detectaron códigos CTO con sufijo literal `Latitud`, por ejemplo:
- `WN-440-248730Latitud`

Este valor NO fue introducido por PostgreSQL. Se confirmó que existe así en la hoja fuente `CATALOGO_CTO` del libro maestro, fila 6506.

En PostgreSQL se detectaron:
- 362 códigos CTO con sufijo `Latitud`
- 248 de ellos también tienen una variante de código limpio existente

No corregir automáticamente durante la migración. Tratar como incidencia de calidad de datos de origen y definir una regla de saneamiento separada, con comparación previa contra la fuente.
