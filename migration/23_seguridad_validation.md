# Validación de migración — Seguridad ATS / PETAR

Fecha: 19/09/2026  
Rama: `migracion-supabase`  
Estado: **LIVE_VALIDAR / SIN CUTOVER PRODUCTIVO**

## Fuente productiva

Hojas auditadas:

- `SEGURIDAD_ATS`: 1 registro / 32 columnas.
- `SEGURIDAD_PETAR`: 1 registro / 18 columnas.
- `SEGURIDAD_FIRMAS`: 5 registros / 12 columnas.
- `SEGURIDAD_FIRMA_SOLICITUDES`: 0 registros / 9 columnas.

Reconciliación viva:

- ATS: 1/1, 0 diferencias.
- PETAR: 1/1, 0 diferencias.
- Firmas: 5/5, 0 diferencias.
- Solicitudes: 0/0, 0 diferencias.

La app legacy continúa activa en Apps Script + Sheets + Drive.

## Frontend vigente identificado

La app productiva carga Seguridad mediante:

- `js/modulos_loader.js`
- módulo actual: `js/seguridad_v443.js?v=V443-GUIA-SIN-PREMARCADO-FIX`

Acciones legacy identificadas:

- `obtenerContextoSeguridadV432`
- `crearAtsDiaSeguridadV432`
- `obtenerDocumentoSeguridadV432`
- `guardarAtsSeguridadV432`
- `aceptarAtsSeguridadV432`
- `revisarAtsSupervisorV432`
- `validarAtsFinalV432`
- `registrarFirmaSeguridadV432`
- `solicitarCambioFirmaSeguridadV432`
- `resolverCambioFirmaSeguridadV432`
- `reiniciarFirmaSeguridadV433`

El backend V432 no está versionado en GitHub, respaldos grandes ni archivos Apps Script accesibles por Google Drive.

## PostgreSQL implementado

Tablas:

- `seguridad_legacy_snapshot`
- `seguridad_ats_migracion`
- `seguridad_petar_migracion`
- `seguridad_firmas_migracion`
- `seguridad_firma_solicitudes_migracion`
- `seguridad_eventos_migracion`

SQL:

- `091_seguridad_modelo_snapshot.sql`
- `092_seguridad_import_historico.sql`
- `093_seguridad_lecturas_contexto.sql`
- `094_seguridad_serializacion_fix.sql`
- `095_seguridad_transacciones_documento.sql`
- `096_seguridad_firmas_transacciones.sql`
- `097_seguridad_autocompletado_autorizador.sql`

## Acceso preservado

- Técnico: su cuadrilla.
- Supervisor: su sede.
- Jefatura/Gerencia/Admin: Zona Norte.
- Permisos derivados desde `app_permissions`.

## Lógica ATS/PETAR migrada

- Técnico edita únicamente BORRADOR / OBSERVADO.
- Trabajo y lugar obligatorios.
- EPP obligatorio.
- Al menos una tarea.
- Cada tarea requiere daño(s) y medida(s) de control.
- PETAR exige CUMPLE / NO CUMPLE / NO APLICA en cada ítem.
- Todo NO CUMPLE requiere observación.
- Un NO CUMPLE crítico bloquea la autorización.
- Aceptación técnica requiere firma digital activa.
- Con una aceptación técnica Supervisor/Jefatura puede finalizar según V443.
- Las aceptaciones faltantes se autocompletan bajo firma/responsabilidad del autorizador y quedan marcadas:
  - `autocompletada=SI`
  - `firmaOrigen=AUTORIZADOR`
  - `autorizadaPor`
  - `autorizadaNombre`
  - `autorizadaPerfil`
- OBSERVAR devuelve a corrección y limpia aceptaciones/firmas de aprobación para evitar firmas obsoletas.
- RECHAZAR marca el documento como RECHAZADO.
- AUTORIZAR / VALIDAR finaliza ATS y PETAR.

## Firma digital

Implementado:

- versionado de firma.
- DNI 8–12 dígitos.
- registro con GPS.
- una sola firma activa.
- V2+ requiere solicitud aprobada.
- solicitud de cambio.
- aprobación/rechazo por Jefatura.
- aprobación desactiva firma anterior.
- reinicio controlado para pruebas.
- nuevas firmas se almacenan en bucket privado `mi-visual-evidencias`.
- DB guarda referencia estable `storage://...`.
- Edge Function entrega URL firmada temporal para visualizarla.

Firmas históricas de Drive se conservaron sin alterar.

## Pruebas con ROLLBACK

Flujo completo:

1. T1 acepta.
2. Supervisor autoriza.
3. T2 faltante se autocompleta con trazabilidad.
4. ATS → FINALIZADO.
5. PETAR → FINALIZADO.

Resultado:
- aceptaciones: 2/2.
- autocompletada: 1.
- firma Supervisor: presente.
- registros persistidos de prueba: 0.

Cambio de firma:
- solicitud temporal.
- aprobación temporal por Jefatura.
- firma desactivada dentro de transacción.
- rollback restauró firma activa.
- solicitudes persistidas: 0.
- eventos de prueba: 0.

PETAR crítico:
- caso temporal con NO CUMPLE crítico.
- no se dejó ATS/PETAR de prueba.
- regla bloqueante implementada en backend.

## Seguridad técnica

- RLS activo en las 6 tablas.
- 0 privilegios directos para `anon` / `authenticated`.
- funciones con `search_path=public`.
- mutaciones solo mediante backend `service_role`.
- Edge Function `seguridad-pilot`: ACTIVE, JWT obligatorio.

## Piloto

Backend:
- `migration/supabase/functions/seguridad-pilot/index.ts`

Frontend:
- `migration/pilot/seguridad-pilot.html`
- validación sintáctica JavaScript: OK.

La creación ATS diaria está bloqueada intencionalmente en el piloto.

## Pendientes bloqueantes para cierre total

### 1. Catálogo completo V432 para creación ATS diaria

La base histórica solo permite recuperar una tarea real:
- `TRASLADO AL PUNTO DE TRABAJO`.

También se identificó el nombre legacy:
- `REVISION DE UNIDAD, HERRAMIENTAS Y MATERIALES`.

No se inventarán las demás tareas/riesgos/controles.

Se necesita recuperar del Apps Script productivo el bloque que implementa:
- `crearAtsDiaSeguridadV432`
- catálogo de tareas.
- plantilla inicial ATS/PETAR.

### 2. Generación PDF final

PostgreSQL devuelve `requierePdf=true` al finalizar.
La generación del PDF ATS/PETAR debe portar exactamente la plantilla productiva V432 antes del cutover.

## Cutover

Antes de producción:

1. Recuperar catálogo/creación V432.
2. Portar PDF final.
3. Probar usuario Técnico con Auth real.
4. Probar Supervisor con Auth real.
5. Probar Jefatura.
6. Reconciliar nuevamente las 4 hojas.
7. Confirmar 0 diferencias.
8. Solo después cambiar la UI productiva.

`main`, Apps Script, Sheets y Drive productivos permanecen sin cambios.
