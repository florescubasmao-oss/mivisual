# Biblioteca — validación de catálogo piloto

Fecha: 19/09/2026. Rama: migracion-supabase. Estado: LIVE_VALIDAR, sin cutover.

## Fuente

Fuente real: BIBLIOTECA, gid 1577462287, del maestro APP CUADRILLAS WIN. La referencia CATALOGO_BIBLIOTECA del inventario era incorrecta. El comportamiento se recuperó de mostrarBiblioteca y categoriaBiblioteca en js/accesos.js (blob 9027482e2c27d318583db9e0c3676c306ae389c3).

6 filas, 3 columnas: ID, Nombre, Link. Copia exacta de 18 celdas; source_row preserva orden. Comparación PostgreSQL/Sheets: 6/6, cero diferencias. Segunda lectura de origen tras pruebas: sin cambios.

Recursos: Penalidades; SCTR SETIEMBRE; Procedimiento de instalaciones; Normas de seguridad y salud; Bonos; Manual ONT ZTE. Metadatos de los seis archivos recuperados mediante Drive: cinco application/pdf y un image/png. Esto verifica que el conector puede consultar los metadatos; NO acredita permisos de apertura para todos los usuarios ni vigencia del contenido. No se descargaron, trasladaron ni alteraron los documentos o su compartición. Se migró el catálogo de referencias, no los archivos binarios.

## Comportamiento

Biblioteca original no filtra filas por sede/cuadrilla: todos los perfiles autorizados para el módulo ven el mismo catálogo. Se conserva ese comportamiento; no se inventan destinos ausentes en la hoja aunque el permiso diga SEGUN DESTINO.

Se conservan nombres, enlaces, limpieza de comillas/espacios al presentar, exclusión de filas sin nombre/enlace y categorías (manuales/procedimientos, videos/tutoriales, seguridad y documentos). En piloto solo se admiten URLs HTTP/HTTPS. La UI usa textContent y abre enlaces con noopener/noreferrer, permite buscar y limpia resultados al cerrar sesión.

## Implementación

- biblioteca_catalogo_migracion: RLS habilitado; sin SELECT para anon/authenticated; lectura service_role.
- biblioteca-pilot v1 ACTIVE, verify_jwt=true, GET/OPTIONS.
- getUser valida sesión; identidad, estado ACTIVO y permisos BIBLIOTECA se consultan en servidor. No se aceptan perfil/sede/usuario del navegador como autorización.
- Respuestas no-store y errores sin detalles de base de datos.
- Página migration/pilot/biblioteca-pilot.html preparada; no publicada en main ni integrada aún al menú final.
- SQL supabase/migrations/20260919231358_biblioteca_catalogo_piloto.sql.
- API y prueba reproducible en supabase/functions/biblioteca-pilot/.

## Pruebas

1. Sin Authorization: 401.
2. Sesión inválida: 401.
3. Usuario sin vínculo: 403.
4. Usuario inactivo: 403.
5. Permiso ver=false: 403.
6. Alcance SIN ACCESO: 403. En rechazos no se consulta catálogo.
7. Supervisor autorizado: 200; parámetro perfil=ADMIN ignorado; enlaces vacíos e inseguros excluidos.
8. POST rechazado: 405.
9. Error de base: 500 sin exponer detalle interno.

Los nueve casos son pruebas de handler con dependencias simuladas. Ejecutar: node supabase/functions/biblioteca-pilot/test.cjs.

Adicionalmente: seis salidas/categorías comparadas contra las funciones legacy; sintaxis JavaScript UI verificada; petición HTTP real sin JWT devuelve 401; inserción de ensayo BEGIN/ROLLBACK deja cero residuos y seis filas; RLS y privilegios verificados en base real.

Asesor de seguridad: aviso informativo RLS habilitado sin políticas, intencional al revocar acceso directo y utilizar backend. [Referencia Supabase](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

## Pendientes

Prueba con sesión real de Jefatura y Supervisor Chiclayo, apertura de documentos con esas cuentas, QA visual, menú final y resync antes del corte. No se crearon cuentas ni se enviaron invitaciones. main, Apps Script, Sheets y Drive productivos sin modificaciones. LIVE_VALIDAR no implica prueba integral completada ni autorización de cutover.
