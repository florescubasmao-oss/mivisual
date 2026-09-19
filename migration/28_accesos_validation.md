# Accesos — piloto de consulta

Fecha: 19/09/2026. Rama: migracion-supabase. Estado: LIVE_VALIDAR, sin cutover.

## Fuente y conciliación

El inventario anterior indicaba CATALOGO_ACCESOS; esa pestaña no existe en el maestro. La fuente real verificada es ACCESOS (gid 177192408), consumida por js/accesos.js.

- 42 filas / 5 columnas (ID, DESTINO, PERFIL, NOMBRE, LINK): 210 celdas.
- Copia PostgreSQL: accesos_catalogo_migracion, conservando source_row.
- 42/42 y cero diferencias en las cinco columnas; lectura de Sheets repetida después de las pruebas, sin cambios.
- El registro ID 37 no tiene enlace. Se conserva para conciliación y no se muestra, igual que legacy.
- Algunos destinos conservan nombres antiguos, por ejemplo P12 César Moisés Fernández. No se aplicaron equivalencias de continuidad a grupos privados automáticamente. Requiere revisión funcional antes del corte.

## Reglas preservadas

Se portan normalizarDestinoAcceso, esPerfilJefaturaAcceso, accesoVisiblePorDestino y accesoVisiblePorPerfil de js/accesos.js (blob 9027482e2c27d318583db9e0c3676c306ae389c3).

Se conserva la combinación destino + perfil y la excepción Jefatura/Admin del código vigente. Los datos del actor se obtienen de app_users a través del usuario autenticado; nunca de parámetros de perfil, usuario, sede o cuadrilla enviados por el navegador. Antes de consultar se exige estado ACTIVO y permiso ACCESOS activo/ver, sin alcance SIN ACCESO.

Además se portan cinco enlaces de certificación V362 y el simulacro V383. Son visibles solo después de autorizar el módulo. El piloto consulta, no administra ni cambia enlaces.

## Backend y seguridad

- accesos-pilot v1 ACTIVE, verify_jwt=true.
- getUser valida la sesión; app_users y app_permissions determinan autorización.
- RLS activo en la nueva tabla; SELECT denegado a anon/authenticated; service_role tiene SELECT.
- GET y OPTIONS únicamente. Respuestas no-store y mensajes de error sin datos internos.
- Esquemas URL limitados a HTTP/HTTPS; UI usa textContent y noopener/noreferrer.
- Aviso informativo del asesor: RLS habilitado sin políticas, intencional para tabla con acceso directo revocado y lectura exclusiva por backend. [Referencia](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
- [Referencia de autenticación consultada](https://supabase.com/docs/reference/javascript/auth-getuser).

## Verificación realizada

- 3360 comparaciones (80 usuarios × 42 filas) del filtro portado contra funciones legacy: cero discrepancias.
- Handler con dependencias simuladas: sin cabecera 401, sesión inválida 401, usuario inactivo 403, sin permiso 403 y sin leer catálogo, Supervisor autorizado 200, POST 405.
- Parámetros maliciosos perfil=ADMIN/sede=PIURA no alteran alcance del Supervisor Chiclayo: 14 enlaces de catálogo más cinco certificaciones y un simulacro.
- URL javascript rechazada.
- Inserción de ensayo en BEGIN/ROLLBACK: cero residuos, total posterior 42.
- Consulta HTTP real al endpoint sin JWT: 401.
- Sintaxis JavaScript de pantalla verificada; no se afirma QA visual de navegador ni sesión Auth real.

## Archivos

- supabase/migrations/20260919225208_accesos_catalogo_piloto.sql
- supabase/functions/accesos-pilot/index.ts
- migration/pilot/accesos-pilot.html

La página piloto cuenta con inicio/cierre de sesión, búsqueda y enlaces autorizados. No se cambió el menú productivo ni se publicó main.

## Pendientes

Prueba real con las dos cuentas ya vinculadas (Jefatura y Supervisor Chiclayo), QA visual, integración en menú final, revisión de destinos antiguos y enlace faltante, y resync final antes del corte. Ningún usuario adicional habilitado, ninguna invitación enviada. Apps Script, Sheets y Drive sin escrituras. LIVE_VALIDAR no significa habilitación productiva.
