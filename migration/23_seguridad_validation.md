# Validación de migración — Seguridad ATS / PETAR

Fecha: 19/09/2026  
Rama: `migracion-supabase`  
Estado: **LIVE_VALIDAR / SIN CUTOVER PRODUCTIVO**

## Fuente productiva y reconciliación

Hojas productivas auditadas:

- `SEGURIDAD_ATS`: 1 registro / 32 columnas.
- `SEGURIDAD_PETAR`: 1 registro / 18 columnas.
- `SEGURIDAD_FIRMAS`: 5 registros / 12 columnas.
- `SEGURIDAD_FIRMA_SOLICITUDES`: 0 registros / 9 columnas.

Última reconciliación posterior al puerto PDF:

- ATS: 1/1, 0 diferencias.
- PETAR: 1/1, 0 diferencias.
- Firmas: 5/5, 0 diferencias.
- Solicitudes: 0/0, 0 diferencias.

La app legacy continúa activa en Apps Script + Sheets + Drive.

## Código productivo recuperado

El 19/09/2026 se recibió el `Código.gs` productivo completo.

Bloque identificado:

- V437 Seguridad ATS/PETAR digital sobre V432.
- frontend vigente: `js/seguridad_v443.js?v=V443-GUIA-SIN-PREMARCADO-FIX`.
- PDF vigente: diseño compacto V442/V439.

Acciones preservadas:

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

El proyecto Apps Script contiene otros archivos `.gs` además de `Código.gs`. Antes del cutover se deben revisar los archivos relacionados que puedan redefinir o complementar Seguridad, especialmente `V490_SEGURIDAD_VTRGAR.gs`.

## PostgreSQL

Tablas:

- `seguridad_legacy_snapshot`
- `seguridad_ats_migracion`
- `seguridad_petar_migracion`
- `seguridad_firmas_migracion`
- `seguridad_firma_solicitudes_migracion`
- `seguridad_eventos_migracion`
- `seguridad_config_migracion`

SQL versionado:

- `091_seguridad_modelo_snapshot.sql`
- `092_seguridad_import_historico.sql`
- `093_seguridad_lecturas_contexto.sql`
- `094_seguridad_serializacion_fix.sql`
- `095_seguridad_transacciones_documento.sql`
- `096_seguridad_firmas_transacciones.sql`
- `097_seguridad_autocompletado_autorizador.sql`
- `098_seguridad_alineacion_v437.sql`
- `099_seguridad_contexto_v437_piloto.sql`
- `100_seguridad_cierre_pdf_v442.sql`

## Catálogo V437 recuperado

Migrado desde el código productivo, sin inventar reglas:

- 16 tareas ATS.
- 8 opciones EPP ATS.
- 11 opciones EPP PETAR.
- 10 controles PETAR.
- catálogo dinámico de herramientas desde `catalogo_herramientas_migracion`.

Creación diaria preservada:

- solo Técnico con permiso REGISTRAR.
- un ATS por cuadrilla/día.
- correlativo global ATS.
- correlativo global PETAR.
- hora inicial `07:45 AM`.
- EPP por defecto sin `OTROS`.
- primera tarea: `TRASLADO AL PUNTO DE TRABAJO`.
- PETAR relacionado creado en la misma operación.
- bloqueo transaccional de numeración mediante advisory lock.

## Alcances y permisos

- Técnico: su cuadrilla.
- Supervisor: su sede.
- Jefatura/Gerencia/Admin: alcance según `app_permissions`.
- Guardado ATS usa permiso EDITAR.
- Creación ATS usa permiso REGISTRAR.
- Supervisor usa APROBAR.
- Jefatura/Gerencia usa VALIDAR.

## Flujo ATS/PETAR

Preservado:

- BORRADOR / OBSERVADO editables por Técnico.
- firma digital activa obligatoria para aceptación.
- una aceptación técnica permite intervención de Supervisor/Jefatura según V443.
- PETAR con NO CUMPLE crítico bloquea autorización.
- checklist PETAR completo obligatorio al autorizar.
- OBSERVAR devuelve a corrección.
- RECHAZAR cierra como rechazado.

Autocompletado V437:

1. Si el técnico faltante tiene firma activa, se usa su firma registrada.
2. Si no tiene firma activa, se usa la firma del autorizador como suplencia.
3. Se registra trazabilidad:
   - `autocompletada=SI`
   - `fuente=FIRMA_TECNICO_REGISTRADA` o `FIRMA_AUTORIZADOR_SUPLENCIA`
   - `autorizadaPor`
   - `autorizadaNombre`
   - `autorizadaPerfil`
   - `origen`

## PDF V442

Implementado en:

- `migration/supabase/functions/seguridad-pdf/index.ts`
- Edge Function `seguridad-pdf`: ACTIVE, versión 2, JWT obligatorio.

Características portadas:

- A4 horizontal.
- encabezado corporativo.
- correlativo de 6 dígitos.
- datos ATS/PETAR.
- EPP y herramientas.
- matriz ATS con 11 riesgos.
- medidas de control.
- checklist PETAR.
- firmas de técnicos.
- trazabilidad de aceptación autocompletada.
- firma de Supervisor/Jefatura.
- archivos almacenados en bucket privado `mi-visual-evidencias`.
- PostgreSQL conserva referencias estables `storage://...`.
- frontend recibe URLs firmadas temporales.

Regla transaccional crítica preservada:

1. `PREPARAR CIERRE` construye el snapshot final sin cerrar el registro.
2. Edge Function genera y almacena ATS/PETAR PDF.
3. `CONFIRMAR CIERRE` verifica `updated_at`.
4. Solo entonces ATS/PETAR pasan a `FINALIZADO`.
5. Si falla PDF o el documento cambia durante la generación, no se finaliza y los archivos nuevos se eliminan.

También se conserva reparación de un `FINALIZADO` histórico sin PDF.

## Pruebas realizadas

Todas las pruebas de escritura SQL se ejecutaron con `ROLLBACK`.

Validado:

- creación ATS/PETAR diaria.
- idempotencia de un ATS por cuadrilla/día.
- correlativos.
- tarea inicial.
- catálogo completo.
- aceptación técnica.
- autorización Supervisor.
- autocompletado de integrante faltante.
- cambio de firma.
- bloqueo de PETAR crítico.
- cierre en dos fases con PDF obligatorio.
- ATS y PETAR finalizados únicamente después de recibir referencias PDF.

Residuos después de pruebas:

- ATS PostgreSQL de prueba: 0.
- PETAR PostgreSQL de prueba: 0.
- eventos de prueba: 0.
- solicitudes de prueba: 0.

## Seguridad técnica

- RLS activo en las 7 tablas de Seguridad.
- 0 privilegios directos para `anon` / `authenticated`.
- mutaciones únicamente mediante backend `service_role`.
- `seguridad-pilot`: ACTIVE, versión 4, JWT obligatorio.
- `seguridad-pdf`: ACTIVE, versión 2, JWT obligatorio.

## Piloto

Backend:
- `migration/supabase/functions/seguridad-pilot/index.ts`
- `migration/supabase/functions/seguridad-pdf/index.ts`

Frontend:
- `migration/pilot/seguridad-pilot.html`
- JavaScript validado sintácticamente.

Funciones disponibles en piloto:

- generar ATS/PETAR del día.
- abrir documento.
- editar checklist PETAR.
- guardar.
- aceptar como Técnico.
- observar/rechazar como Supervisor/Jefatura.
- autorizar como Supervisor con PDF.
- validar como Jefatura/Gerencia con PDF.
- registrar firma.
- solicitar/resolver cambio de firma.
- abrir PDFs finalizados mediante URL temporal.

## Pendientes antes del cutover

1. Probar flujo real con Auth:
   - Técnico.
   - Supervisor.
   - Jefatura/Gerencia.
2. Reconciliación final de las 4 hojas inmediatamente antes del cambio de fuente.
3. Confirmar visualmente un PDF generado por la Edge Function con datos reales de piloto.
4. Solo después sustituir la ruta productiva del frontend.

### Archivos posteriores revisados

- `V490_SEGURIDAD_VTRGAR.gs`: no redefine ATS/PETAR; endurece exclusivamente roles de Validación Técnica GAR/VTR. La regla ya fue trasladada a `validacion-tecnica-pilot` v2.
- `V493_RANKING_VTRGAR_SOLO_PROPIAS.gs`: no redefine ATS/PETAR; afecta únicamente el componente VTR/GAR usado por Ranking.
- `V496_CONTINUIDAD_CUADRILLAS.gs`: no reescribe históricos y actúa sobre continuidad de identidad, Ranking y Dashboard.
- `V497_SINCRONIZACION_WIN_COMPLETA.gs`: no redefine ATS/PETAR; gobierna publicación WIN/Producción/Efectividad/Recableado/VTR-GAR.

`main`, Apps Script, Sheets y Drive productivos permanecen sin cambios.
