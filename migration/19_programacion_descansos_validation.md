# Validación Programación de Descansos – Migración PostgreSQL

Fecha: 19/09/2026

## Estado
**PROGRAMACIÓN DE DESCANSOS backend/lógica: CERRADO.**

La app productiva Apps Script + Google Sheets continúa activa, por lo que este módulo queda marcado como **fuente legacy viva** y exige una resincronización final antes del cutover.

No se modificó:
- rama `main`;
- Apps Script productivo;
- hoja `PROGRAMACION_DESCANSOS`.

## Migraciones
- `058_programacion_descansos_modelo.sql`
- `059_programacion_descansos_regex_cuadrillas.sql`
- `060_programacion_descansos_transacciones.sql`
- `061_programacion_descansos_solicitud_alias_fix.sql`
- `062_programacion_descansos_helper_alias_fix.sql`
- `063_programacion_descansos_cobertura_alias_fix.sql`
- `064_programacion_descansos_dashboard_source.sql`
- `065_programacion_descansos_cache_refresh.sql`
- `066_programacion_descansos_lecturas.sql`

## Histórico completo
Se migraron las 38 columnas productivas de PROGRAMACION_DESCANSOS.

Conteos:
- Google Sheets: **705 movimientos**.
- Snapshot raw PostgreSQL: **705**.
- Motor PostgreSQL: **705**.
- Eventos iniciales de auditoría: **705**.
- Residuos de pruebas: **0**.

Por período:
- 2026-07: 135 movimientos.
- 2026-08: 304 movimientos.
- 2026-09: 266 movimientos.

Se preservan explícitamente:
- 44 registros históricos con estado `SIN ACTIVIDAD`.
- 121 registros legacy sin `ESTADO_VALIDACION` explícito.
- versiones múltiples para un mismo `ID_ORIGEN`.
- registros personales `PERSONAL|...`.
- registros rechazados.
- coberturas históricas VERDE / AMARILLO / ROJO / NO APLICA.

No se reescriben esos históricos a la lógica actual.

## Snapshot auditable
Tabla:
`programacion_descansos_legacy_snapshot`

Cada fila conserva:
- `source_row`;
- ID;
- las 38 columnas originales en `row_json`;
- fecha de importación.

Después de terminar las migraciones se volvió a leer la hoja productiva completa.

Resultado final:
- 705/705 filas comparadas.
- solo Sheet: 0.
- diferencias de ID: 0.
- diferencias de contenido en las 38 columnas: **0**.

## Modelo operativo
Tabla:
`programacion_descansos_migracion`

Auditoría:
`programacion_descansos_eventos_migracion`

Vistas principales:
- `mv_descansos_cuadrillas_activas`
- `mv_descansos_personal_activo`
- `mv_descansos_ultimo_aprobado`
- `mv_descansos_ultimo_pendiente`
- `mv_descansos_programacion_actual`
- `mv_descansos_entidades_listado`
- `mv_descansos_notificaciones_pendientes`

## Estado vigente
La lógica productiva de `ultimoEstadoAprobadoDescansos` se porta respetando el orden de movimientos.

Comparación con el bridge previo usado por Dashboard:
- combinaciones cuadrilla/fecha: **427**.
- solo motor nuevo: 0.
- solo bridge: 0.
- diferencias de estado vigente: **0**.

## Universo de cuadrillas
Se reproduce la semántica de `obtenerMapaUsuarios`:
- para una cuadrilla se toma el último registro de USUARIOS;
- luego se valida que ese registro esté ACTIVO y sea TECNICO.

Se corrigió una diferencia de regex entre JavaScript y PostgreSQL:
- JavaScript usaba `/^P\d+\b/`;
- PostgreSQL requiere una expresión POSIX compatible.

Resultado de cuadrillas activas:
- Chiclayo Instalaciones: 10.
- Chiclayo Traslados: 1.
- Chiclayo Visita Técnica: 4.
- Piura Instalaciones: 7.
- Piura Traslados: 1.
- Piura Visita Técnica: 1.
- Trujillo Instalaciones: 4.
- Trujillo Traslados: 2.
- Trujillo Visita Técnica: 2.

## Reglas de cobertura
Se recuperó exactamente la regla productiva.

Estados:
- solo `DESCANSO` descuenta una cuadrilla del conteo en campo;
- `EN CAMPO`, `EN CAMPO BOLSA`, `VACACIONES` y el histórico `SIN ACTIVIDAD` no se descuentan en esta fórmula.

Cobertura:
- domingo + Instalaciones: objetivo 60%, mínimo 60%;
- domingo + otras plataformas: objetivo 70%, mínimo 60%;
- lunes-sábado: objetivo 90%, mínimo 80%.

Redondeo:
`floor(total * porcentaje + 0.5)`.

Semáforo:
- VERDE si campo >= objetivo;
- AMARILLO si campo >= mínimo;
- ROJO en caso contrario.

## Operaciones portadas

### Supervisor / Jefatura programan
Función:
`mv_descansos_guardar()`

Supervisor:
- solo su sede;
- solo cuadrillas;
- no puede programar personal;
- registro queda `PENDIENTE JEFATURA`;
- resultado supervisor = ENVIADO.

Jefatura:
- puede programar cuadrillas y personal;
- cambio queda aplicado directamente;
- resultado Jefatura = APROBADO;
- estado validación inicial = APLICADO.

Estados nuevos permitidos:
- EN CAMPO
- EN CAMPO BOLSA
- DESCANSO
- VACACIONES

Los estados históricos adicionales se preservan pero no se generan desde la nueva operación.

### Técnico solicita cambio
Función:
`mv_descansos_solicitar_cambio()`

Reglas:
- solo TECNICO;
- la fecha original debe ser un DESCANSO aprobado;
- nueva fecha distinta;
- nueva fecha no puede estar en el pasado;
- no puede haber otra solicitud técnica pendiente para esa cuadrilla;
- queda `PENDIENTE SUPERVISOR`.

### Supervisor valida solicitud
Función:
`mv_descansos_validar_supervisor()`

Reglas:
- solo SUPERVISOR;
- únicamente registros de su sede;
- APROBADO -> PENDIENTE JEFATURA;
- RECHAZADO -> RECHAZADO.

### Jefatura resuelve
Función:
`mv_descansos_resolver_jefatura()`

Resultados:
- APROBADO
- OBSERVADO
- RECHAZADO

Comentario de Jefatura obligatorio.

Para cambios normales aprobados:
- el nuevo estado pasa a vigente.

Para una solicitud técnica aprobada:
1. el descanso de la fecha original pasa a EN CAMPO;
2. se crea DESCANSO en la nueva fecha;
3. se verifican conflictos con otra cuadrilla de la misma plataforma;
4. la nueva fecha no puede coincidir con vacaciones;
5. se valida cobertura mínima;
6. se generan movimientos separados y auditables.

## Prueba transaccional completa
Todas las pruebas se realizaron con `BEGIN ... ROLLBACK`.

Flujo validado:
1. Supervisor Chiclayo programa descanso de P2.
2. Jefatura aprueba.
3. Técnico P2 solicita cambio de fecha.
4. Supervisor aprueba la solicitud.
5. Jefatura aprueba y aplica el movimiento.

Resultado dentro de la transacción:
- fecha original: EN CAMPO.
- nueva fecha: DESCANSO.
- movimientos generados: 4.
- eventos de auditoría: 7.

Después del ROLLBACK:
- registros POSTGRESQL de prueba persistidos: **0**.

## Bloqueos probados
Correctamente bloqueado:
- Técnico intentando programar directamente.
- Supervisor intentando programar personal.
- Supervisor Chiclayo intentando programar cuadrilla de otra sede.
- Técnico intentando cambiar una fecha que no es descanso aprobado.
- solicitud técnica duplicada pendiente.
- Supervisor de otra sede intentando validar.

Correctamente permitido:
- Jefatura programando personal.

## Resumen de cobertura por perfil
Función:
`mv_descansos_resumen_cobertura()`

Prueba:
- Jefatura: 9 combinaciones = 3 sedes x 3 plataformas.
- Supervisor Chiclayo: 3 combinaciones = su sede x 3 plataformas.

## Listado del módulo
Función:
`mv_descansos_listar()`

Replica:
- período principal;
- hasta 2 períodos adicionales;
- alcance por perfil;
- programación vigente;
- pendiente con prioridad sobre aprobado para perfiles operativos;
- solo aprobados para perfiles de lectura;
- historial limitado a 100;
- entidades técnicas y personal.

Prueba septiembre:
- Jefatura: 38 entidades.
- Supervisor Chiclayo: 17 entidades.
- Técnico P2: 1 entidad.
- Técnico P2: solo información de su cuadrilla.

## Notificaciones
Función:
`mv_descansos_notificaciones()`

Supervisor:
- ve `PENDIENTE SUPERVISOR` de su sede.

Jefatura:
- ve `PENDIENTE SUPERVISOR`;
- `PENDIENTE JEFATURA`;
- `OBSERVADO`.

Actualmente no existen solicitudes pendientes en la hoja productiva.

## Integración con Dashboard
Antes:
`dashboard_descansos_legacy_snapshot -> mv_dashboard_descansos_aprobados`.

Ahora:
`programacion_descansos_migracion -> mv_descansos_ultimo_aprobado -> mv_dashboard_descansos_aprobados`.

El antiguo bridge queda únicamente como referencia histórica de conciliación.

### Conciliación septiembre
Sobre las 32 cuadrillas comunes con el Dashboard productivo:
- días campo: 32/32 iguales;
- descansos: 32/32 iguales;
- vacaciones: 32/32 iguales;
- bolsa: 32/32 iguales;
- meta acumulada: 32/32 igual;
- diferencias: **0**.

Cache actual:
- Julio: 27 filas.
- Agosto: 26 filas.
- Septiembre: 33 filas.

## Refresco automático
Trigger:
`trg_descansos_refresh_dashboard`

Cuando un movimiento PostgreSQL pasa a APROBADO/APLICADO:
- se refresca la cache de cumplimiento del período.

Prueba con ROLLBACK:
- P2 antes: 15 días campo / 2 descansos / meta 75.
- movimiento aprobado temporal:
  - 14 días campo;
  - 3 descansos;
  - meta 70.
- cache actualizada automáticamente.
- transacción revertida después de validar.

## Bugs encontrados durante portación
Ninguno afectó datos reales porque fueron detectados dentro de pruebas con ROLLBACK.

1. Regex de cuadrillas:
   - `\b` de JavaScript no era equivalente en PostgreSQL.
   - corregido en 059.

2. Ambigüedad de `cuadrilla` en solicitud técnica:
   - variable PL/pgSQL vs columna.
   - corregido en 061.

3. Ambigüedad de `sede/plataforma/cuadrilla` en aplicación del cambio:
   - corregido en 062.

4. Ambigüedad de `perfil` en cobertura:
   - corregido en 063.

## Seguridad
- RLS habilitado en tablas.
- vistas con `security_invoker=true`.
- grants directos a anon/authenticated: **0**.
- todas las funciones `mv_descansos_*`:
  - anon execute = false;
  - authenticated execute = false;
  - service_role execute = true.

La exposición al frontend se realizará posteriormente mediante Edge Function/RPC autenticada.

## Convivencia con la app antigua
PROGRAMACION_DESCANSOS sigue siendo una fuente viva porque el frontend Apps Script continúa operativo.

Estado en:
`migration_live_source_control`

- source mode: SHEET_LIVE_SNAPSHOT.
- content match: true.
- Sheet rows: 705.
- PostgreSQL rows: 705.
- requires final resync: true.

Antes del cutover:
1. volver a leer las 38 columnas;
2. aplicar solo el delta nuevo/modificado;
3. conciliar estado vigente;
4. refrescar Dashboard;
5. recién bloquear escritura legacy.

## Conclusión
La lógica backend de Programación de Descansos está cerrada en PostgreSQL.

La sincronización final permanece obligatoria mientras la app Apps Script continúe activa.
