# Validación Observaciones / Penalidades – Migración PostgreSQL

Fecha de validación: 19/09/2026

## Estado
**OBSERVACIONES / PENALIDADES backend/lógica: CERRADO.**

La aplicación productiva Google Sheets + Apps Script continúa intacta. No se modificó la rama `main`.

## Migraciones
- `046_observaciones_modelo_migracion.sql`
- `047_observaciones_transacciones.sql`
- `048_ranking_observaciones_motor.sql`

## Fuente productiva recuperada
Hoja: `OBSERVACIONES`.

Campos vigentes:
- ID
- FECHA DE REGISTRO
- PERIODO
- Registrado Por
- Perfil Registro
- Sede
- Plataforma
- Supervisor
- Cuadrilla
- Fuente
- Código / Ticket
- Tipo Observación
- Descripción
- Estado
- Monto
- Fecha Descargo
- Descargo Técnico
- Evidencia Técnico
- Fecha Revisión
- Plazo

## Snapshot conciliado
Registros actuales: **78**.
IDs duplicados: **0**.

Por período:
- 2026-07: 40 observaciones, S/ 5,870 total, S/ 1,550 afectado.
- 2026-08: 17 observaciones, S/ 3,340 total, S/ 1,184 afectado.
- 2026-09: 21 observaciones, S/ 4,130 total, S/ 1,618 afectado.

Estados actuales:
- SUBSANADO: 50
- PENALIZADO: 18
- DERIVADO: 9
- EN PROCESO: 1

Fuentes:
- WIN: 54
- VISUAL: 24

Tipos:
- GESTION TECNICA: 40
- IMPLEMENTACION: 20
- SEGURIDAD: 18

Sedes:
- CHICLAYO: 32
- PIURA: 25
- TRUJILLO: 21

Descargos existentes: 5.
Filas con evidencia: 5.
Enlaces de evidencia importados: 6.

## Factor económico recuperado
Regla productiva exacta:
- PENALIZADO: 100%
- EN PROCESO: 100%
- APELADO: 100%
- DERIVADO y demás estados no exceptuados: 100%
- SUBSANADO: 20%
- ANULADO: 20%

Implementación:
`mv_observaciones_factor_estado()`.

Ejemplos validados en pruebas:
- S/ 200 SUBSANADO -> S/ 40 afectado.
- S/ 300 PENALIZADO -> S/ 300 afectado.

## Modelo PostgreSQL
Tablas:
- `observaciones_migracion`
- `observaciones_evidencias_migracion`
- `observaciones_eventos_migracion`

Vistas:
- `mv_observaciones_migracion`
- `mv_observaciones_resumen_migracion`
- `mv_ranking_observaciones_migracion`

Se conserva:
- histórico original;
- descargo;
- evidencia;
- monto;
- estado;
- plazo;
- fecha de revisión;
- usuario que registró;
- sede/plataforma/supervisor;
- trazabilidad de cambios.

## Reglas de registro portadas
Solo pueden registrar:
- SUPERVISOR
- JEFATURA / ADMIN / ADMINISTRADOR

Supervisor:
- solo puede registrar observaciones de su propia sede.

Jefatura:
- puede registrar sobre cualquier sede autorizada por el backend.

Valores válidos:
- Fuente: WIN / VISUAL.
- Tipo: SEGURIDAD / IMPLEMENTACION / GESTION TECNICA.
- Estado: DERIVADO / EN PROCESO / PENALIZADO / APELADO / SUBSANADO / ANULADO.

Plazo inicial:
- 24 horas desde el registro, igual al flujo productivo.

Idempotencia:
- si un `idSolicitud` ya existe y pertenece al mismo registrador, devuelve el registro existente;
- si pertenece a otro usuario, bloquea la operación.

## Descargo técnico
Solo perfil TECNICO.
El técnico solo puede descargar observaciones de su propia cuadrilla.

Evidencias:
- máximo 5;
- almacenadas como registros separados;
- se conserva URL y `drive_file_id`;
- si no se envían nuevas evidencias, no se borran las existentes;
- si se envía una nueva lista, reemplaza la lista de metadatos, replicando el comportamiento del campo de enlaces del legado.

El movimiento/carga física del archivo en Drive se mantiene para la capa de integración posterior.

## Cambio de estado
Jefatura:
- puede cambiar cualquier observación.

Supervisor:
- solo puede cambiar observaciones:
  - registradas originalmente por perfil SUPERVISOR;
  - registradas por ese mismo usuario;
  - de su misma sede.

Al cambiar estado:
- se puede actualizar monto;
- se registra fecha de revisión;
- se recalcula automáticamente el monto afectado;
- se genera evento de auditoría.

## Pruebas transaccionales
Todas las pruebas se ejecutaron dentro de transacciones terminadas con `ROLLBACK`.

Pruebas exitosas:
- registro por Jefatura;
- idempotencia del mismo ID;
- descargo por técnico correcto;
- 2 evidencias;
- cambio a SUBSANADO;
- cambio a PENALIZADO;
- registro por Supervisor;
- Supervisor cambiando una observación propia.

Bloqueos validados:
- técnico intentando descargar observación de otra cuadrilla;
- más de 5 evidencias;
- Supervisor intentando modificar observación registrada por Jefatura;
- Supervisor intentando registrar sobre otra sede;
- otro usuario intentando reutilizar un `idSolicitud`.

Residuos de pruebas: **0**.

## Integración con Ranking
Antes de la migración, Ranking consumía `economico_observaciones_snapshot`.

Desde la migración 048 consume:
`observaciones_migracion -> mv_ranking_observaciones_migracion`.

Conciliación período/cuadrilla:
- combinaciones comparadas: **48**
- solo motor: 0
- solo legacy: 0
- diferencias: **0**

Septiembre se mantiene:
- 21 observaciones
- S/ 4,130 total
- S/ 1,618 afectado

El Ranking de septiembre no cambió ni en puntaje ni en posiciones después del cambio de fuente.

Julio y agosto permanecen protegidos como histórico publicado en la capa final de Ranking.

## Seguridad
- RLS habilitado en las tablas operativas.
- Vistas con `security_invoker=true`.
- Grants directos a `anon/authenticated`: **0**.
- Funciones `mv_observaciones_*`: ejecución solo `service_role`.

## Pendiente para fase de frontend / integración
- carga física de evidencias a Drive;
- RPC/API autenticada;
- filtros de listado por perfil/sede/cuadrilla;
- UI de descargo;
- UI de cambio de estado;
- actualización visual inmediata del Ranking;
- pruebas end-to-end con Auth real.

Estas tareas no cambian la lógica operativa ya cerrada en PostgreSQL.
