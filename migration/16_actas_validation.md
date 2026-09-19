# Validación Actas – Migración PostgreSQL

Fecha de validación: 19/09/2026

## Estado
**ACTAS backend/lógica: CERRADO.**

Se mantiene intacta la aplicación productiva Google Sheets + Apps Script, la hoja ACTAS_ESCANEADAS y Drive. No se modifica la rama `main`.

## Migraciones
- `041_actas_snapshot_modelo.sql`
- `042_actas_motor_migracion.sql`
- `043_actas_transacciones_v344.sql`
- `044_actas_partida_ambigua_protegida.sql`
- `045_actas_reemplazo_pendiente_fix.sql`

## Snapshot histórico
Se migraron **2,294 / 2,294 registros** de `ACTAS_ESCANEADAS`.

Controles:
- IDs únicos: 2,294.
- Archivos Drive únicos: 2,294.
- Sin código de orden válido: 11.
- Sin fecha de gestión: 7.
- Estados conservados:
  - FINALIZADO: 1,662.
  - PENDIENTE: 632.
- Eventos iniciales de auditoría: 2,294 `IMPORT_LEGACY`.
- Residuos de pruebas transaccionales: 0.

## Identidad V344
Se recuperó la lógica productiva vigente:
- `CODIGO_PEDIDO` puede repetirse.
- `CODIGO_ORDEN` es único.
- `NUMERO_ACTA` es único.
- La normalización elimina formatos no significativos.
- Para números de acta numéricos se eliminan ceros iniciales en la clave.
- No se permite que orden y número de acta apunten a registros diferentes.

## Relación con Mapa Operativo
El resolvedor reproduce la prioridad productiva:
- orden exacta: +120
- pedido/código cliente exacto: +110
- cruce orden -> código cliente: +45
- cruce pedido -> orden: +40
- orden + pedido exactos: +100 adicional
- siempre restringido a la misma cuadrilla normalizada.

Resultado:
- Actas con vínculo operativo seguro: **2,253**.
- Actas sin vínculo seguro: **41**.

Las 41 excepciones se conservan sin forzar una relación.

## Datos automáticos
La fecha operativa se obtiene en este orden:
1. fecha fin de visita,
2. fecha inicio de visita,
3. fecha solicitud.

El tipo de ejecución:
- tipo de trabajo con INSTALACION -> `INSTALACION`
- demás coincidencias Mapa -> `VISITA TECNICA`
- sin Mapa -> se conserva dato anterior o se infiere por modalidad de cuadrilla.

No se sobrescriben históricos solo porque el Mapa actual tenga un dato diferente.

Comparación sobre 2,253 vínculos:
- misma fecha de gestión: 2,248.
- mismo tipo de ejecución: 2,241.
- mismo DNI: 2,230.

Las diferencias quedan auditables porque Mapa puede haber cambiado después del registro histórico.

## Protección de partidas ambiguas
Se detectaron códigos del catálogo que representan más de una descripción de partida.

Actas afectadas actualmente:
- CAT6MESH2: 1.
- MESHPV: 26.
- REUSR: 17.

Total: **44**.

La migración 044 impide completar `TIPO_PARTIDA` cuando el código no tiene una descripción única.

Validación:
- ambiguas detectadas: 44.
- ambiguas protegidas sin autocompletado arbitrario: **44/44**.

## Flujo transaccional portado
Se implementó:
- registro de acta por técnico;
- registro de acta faltante por Almacén/Jefatura Almacén;
- completado de acta faltante por técnico;
- reemplazo de PDF únicamente cuando corresponde;
- validación Almacén;
- validación Jefatura Almacén;
- entrega física;
- reversión de entrega solo por Jefatura Almacén;
- confirmación manual de fecha por Supervisor/Almacén/Jefatura;
- versionado;
- auditoría de eventos.

### Reglas de reemplazo
Permitido:
- registro creado por Almacén como faltante y todavía sin PDF;
- resultado Almacén = OBSERVADO;
- resultado Jefatura = OBSERVADO.

Bloqueado:
- acta PENDIENTE normal;
- acta FINALIZADA;
- resultado Jefatura = CORRECTO;
- orden/acta perteneciente a otra cuadrilla.

## Bug detectado durante pruebas
La primera portación de la regla de reemplazo tenía una diferencia entre booleanos JavaScript y SQL:
- `NULL OR NULL` produce `NULL` en PostgreSQL;
- por ello una acta PENDIENTE podía pasar accidentalmente la condición de reemplazo.

No afectó datos reales: fue encontrado en pruebas ejecutadas dentro de `ROLLBACK`.

Se corrigió en:
- `045_actas_reemplazo_pendiente_fix.sql`

Resultado posterior:
- PENDIENTE -> reemplazo bloqueado.
- OBSERVADO -> reemplazo permitido.
- FINALIZADO -> re-subida bloqueada.

## Pruebas transaccionales
Todas las pruebas de escritura se ejecutaron dentro de transacciones terminadas con `ROLLBACK`.

Flujo probado:
1. registrar;
2. observar por Almacén;
3. reemplazar PDF;
4. confirmar fecha manualmente;
5. validar correcto por Almacén;
6. validar correcto por Jefatura;
7. confirmar entrega física.

Resultado temporal antes del rollback:
- estado: FINALIZADO;
- versión: 2;
- resultado Almacén: CORRECTO;
- resultado Jefatura: CORRECTO;
- entrega física: ENTREGADA;
- fecha carpeta: CONFIRMADA;
- eventos de auditoría: 7.

Pruebas negativas:
- Técnico intentando validar -> bloqueado.
- PENDIENTE intentando reemplazar -> bloqueado.
- FINALIZADO intentando volver a subir -> bloqueado.
- Almacén intentando revertir entrega -> bloqueado.
- Jefatura Almacén revirtiendo entrega -> permitido.
- Acta faltante creada por Almacén y completada por técnico -> permitido.

## Fechas pendientes
Existen 7 registros `PENDIENTE_MAPA`.

Estado actual del motor:
- 3 ya tienen coincidencia Mapa disponible -> `UBICADA_MAPA`.
- 4 requieren confirmación manual -> `REQUIERE_CONFIRMACION`.

La base PostgreSQL determina la acción. El movimiento físico del archivo entre carpetas Drive se mantiene como integración externa para la fase de frontend/backend de archivos; no se simula desde SQL.

## Seguridad
- RLS habilitado en las tablas nuevas.
- Vistas con `security_invoker=true`.
- Permisos directos `anon/authenticated`: **0**.
- Funciones `mv_actas_*`: ejecución `anon=false`, `authenticated=false`, `service_role=true`.

La exposición al usuario final deberá hacerse posteriormente mediante RPC/API autenticada, respetando el perfil y sede.

## Pendiente para fase de módulos/frontend
- subir PDF a Drive y luego confirmar metadatos en PostgreSQL;
- eliminar/enviar a papelera el PDF anterior únicamente después de confirmar reemplazo;
- ejecutar/marcar la revisión periódica de fechas pendientes;
- mover físicamente el PDF cuando la fecha sea confirmada;
- listar/resumir según perfil y sede;
- conectar UI de Gestión de Actas;
- pruebas end-to-end con Auth real.

Estas tareas no cambian la lógica operativa ya cerrada en PostgreSQL.
