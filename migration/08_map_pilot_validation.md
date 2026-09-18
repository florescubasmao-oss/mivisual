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
