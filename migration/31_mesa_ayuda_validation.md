# Mesa de Ayuda — piloto Supabase

20/09/2026 UTC. Rama `migracion-supabase`; proyecto `uudvodiaizfarodjpetb`. Estado: LIVE_VALIDAR, sin corte de producción.

## Datos y procedencia

Se importaron 7 casos (28 columnas), 12 movimientos (11 columnas) y 15 filas de catálogo (6 columnas). Comparación completa de los valores de origen: cero diferencias. Segunda lectura de las tres hojas al finalizar: sin cambios. Las fechas históricas, texto libre de evidencias, detalle por día, códigos con ceros iniciales y enlaces Drive se conservan. El JSON `source_raw` mantiene cada fila original sin rellenar ni reformatear sus valores; `datos` contiene la representación operativa. Los datos personales de las filas no se incluyen en esta rama como semillas SQL.

Origen: documento maestro `1WuKWc7Javfv8rRMOTVvsH6sJSH2mvbTZoTiIUpt-MQM`, pestañas CONSULTAS_RECLAMOS, HISTORIAL_RECLAMOS y CATALOGOS_RECLAMOS. Backend guardado `Pasted text(20260919-162716).txt`, SHA256 `e3bdce5ff3dc16a96cca03f9197553bd4b77681a17f7c651dadad2188f44ec04`; funciones Mesa de Ayuda V204, líneas 14479–14658 y normalizadores/perfiles del mismo archivo. Cliente original `js/consultas_reclamos.js`, SHA256 `02a6cc58af3c2c509b5b3d64d5e35638c08230a7f7acdd3a975660e6d10c9aac`.

El catálogo de Sheets combina listas independientes de estados, urgencias y confirmaciones en sus primeras filas. No se interpreta cada estado como exclusivo de una categoría. La pantalla original contiene tres subcategorías adicionales a Sheets; se preservan. No se inventa una acción de confirmación técnica: el backend original no la implementa.

## Implementación

- Tablas `mesa_casos_migracion`, `mesa_historial_migracion`, `mesa_catalogo_migracion`, `mesa_operaciones_piloto`.
- RPC `mesa_pilot_rpc`: consultar, historial, registrar, comentar, cambiar estado y restablecer. Cambios de caso, anulación de movimiento e historial dentro de una transacción. Bloqueo de fila, versión esperada y recibo por usuario/UUID de operación.
- Edge `mesa-ayuda-pilot` v1 ACTIVE, `verify_jwt=true`; identidad obtenida con Auth `getUser`. No confía en usuario/perfil/actor enviados por el cliente. Cuenta activa y vínculo se validan en SQL.
- Pantalla independiente `migration/pilot/mesa-ayuda-pilot.html`, con su `mesa-pilot-ui.js`; todavía sin conexión al menú de producción.
- Actas históricas permanecen en Drive. Nuevas actas en bucket privado `mesa-ayuda-pilot`, URL firmada de 10 minutos tras verificar visibilidad del caso. PDF/JPEG/PNG/WEBP, máximo 5 MB por archivo y 10 MB por solicitud codificada. Nombre de objeto determinista por actor, request UUID, posición y SHA256; reintentos aceptan objetos ya existentes sin sobrescribirlos. No se cargaron archivos reales durante las pruebas.

## Permisos

Mesa no tiene fila propia en `app_permissions`; se trasladan las reglas concretas del backend, sin añadir permisos a esa tabla. Jefatura ve todos; jefaturas especializadas ven su área; supervisor ve su sede excepto reclamos contra supervisores; otros perfiles ven autor o misma cuadrilla. Solo el área responsable resuelve/restablece. Finalizados no admiten comentarios ni cambio normal de estado. Restablecer anula el último comentario/cambio y conserva la auditoría. CERRADO se muestra como SOLUCIONADO, como en origen.

Dos cierres deliberados de brechas: cuadrillas o sedes vacías no conceden acceso compartido; Gerencia Lima se mantiene de solo lectura también en servidor (el cliente original ya lo imponía, el backend no lo hacía). No se amplía su visibilidad histórica.

RLS activado en cuatro tablas, sin grants a anon/authenticated; RPC y helpers solo ejecutables por service_role. Bucket privado sin políticas de acceso directo. Advisor informa [RLS Enabled No Policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), esperado para tablas exclusivas del backend. Las claves privilegiadas no están en el HTML.

## Validación realizada

- 80 usuarios × 7 casos = 560 pares, comprobando visibilidad y resolución: 1120 resultados coinciden con las funciones originales.
- `test.sql` ejecutado en Supabase: creación, reintento exacto, rechazo de reutilización con otro contenido, confidencialidad, responsable incorrecto, resolver, bloqueo de finalizado, restablecer estado/fechas, anular comentario, versión obsoleta, Gerencia sin escritura, usuario no vinculado, días y puntos. Todo dentro de BEGIN/ROLLBACK. Los perfiles de las dos cuentas existentes se sustituyen solo dentro de la transacción de prueba; no se crean usuarios Auth ni se modifica su vínculo. Resultado posterior: 7 casos, 12 historiales, 0 recibos de prueba; ambos perfiles originales intactos.
- `node supabase/functions/mesa-ayuda-pilot/test.cjs`: handler probado con dependencias simuladas para autenticación, suplantación de actor, formato/límites de entrada, contenido de PDF, objetos deterministas, URLs privadas y ocultamiento de errores internos.
- Endpoint desplegado sin sesión: HTTP 401 real.
- JavaScript de pantalla y scripts inline: sintaxis válida. Sin prueba visual real de navegador en esta sesión.

## Pendiente antes del corte

Validar con las dos sesiones reales habilitadas; probar interfaz en móvil, subida real, descarga y expiración de actas, así como reintento tras pérdida de conexión. Aún no se ha probado extremo a extremo Auth–Edge–Storage con una cuenta real. Un envío fallido puede dejar un objeto privado sin caso; antes de uso general definir limpieza de huérfanos con antigüedad y comprobación de referencias (no borrar automáticamente tras una respuesta incierta). El recibo de reintento de pantalla se conserva en sessionStorage y cubre recargas en la misma pestaña, no su cierre.

Antes de integrar el menú, resíncronizar las tres hojas: la app actual sigue escribiendo allí. Conservar o separar casos de prueba del piloto al resíncronizar; no sustituir filas modificadas a ciegas. Ningún cambio en main, Apps Script, Sheets ni Drive; ningún usuario adicional creado o invitado.
