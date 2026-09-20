# Capacitación — piloto y Mis Funciones

Fecha: 20/09/2026 UTC. Rama: migracion-supabase. LIVE_VALIDAR, sin cutover.

## Catálogo

Fuente real: CAPACITACION (gid 459416480), no CATALOGO_CAPACITACION como indicaba el inventario. Ocho registros, cuatro columnas (ID, Nombre, TIPO, Link), 32 celdas. Copia capacitacion_catalogo_migracion: 8/8, cero diferencias. Segunda lectura del origen posterior a pruebas: sin cambios.

La hoja declara siete VIDEO y una IMAGEN. Enlaces Drive preservados; los archivos binarios y sus permisos no se movieron ni modificaron. No se verificó reproducción o apertura de cada archivo con usuarios reales.

El catálogo legacy no filtra por destino individual. Se conserva catálogo común para perfiles con permiso CAPACITACION. La autorización del módulo se valida antes de devolver recursos: sesión getUser, vínculo app_users, estado ACTIVO, permiso activo/ver y sin alcance SIN ACCESO. La selección por usuario/perfil nunca se toma del cliente. URLs admitidas HTTP/HTTPS; contenido dinámico con textContent.

## Mis Funciones

Se incluyeron copias piloto de los cuatro scripts vigentes:

- capacitacion_mis_funciones_v460.js: contenido final V467. Blob original 627e5687b3a883929df995d3eb6265570972f164.
- ejemplos V468: 5a2faa7ef5b76163db14fa6333780db66fa418a1.
- audio V473: ec529f812291f2e333e100edf0beec840ff26b95.
- evaluación V474: b9142244d59f8633ae3ab4fe2d13709604f7f0dc.

Solo el script base cambia su comprobación de perfil: deja de leer localStorage legacy y utiliza el contexto devuelto por API piloto. Contenido, ejemplos, lectura speechSynthesis, preguntas, respuestas y cálculo conservados. Técnico ve el acceso al minicurso; Supervisor/Jefatura no lo ven, preservando la restricción vigente. El contenido estático no es un recurso confidencial ni esa visibilidad sustituye autorización de API.

Diez pantallas (inicio, ocho partes y cierre), cierre de orden en siete etapas y Culminación reportada como punto 5. Evaluación: ocho preguntas, porcentaje redondeado, refuerzo de errores y posibilidad de repetir. No hay nota mínima ni persistencia de resultados en el original; no se creó una tabla de notas ni se afirmó migrar progreso inexistente. Progreso se reinicia al abrir el curso, igual que legacy.

## Backend

- capacitacion-pilot v1 ACTIVE, verify_jwt=true.
- Tabla con RLS, SELECT revocado a anon/authenticated y disponible para backend service_role.
- Solo GET/OPTIONS, no-store y errores sin datos internos.
- SQL supabase/migrations/20260920024751_capacitacion_catalogo_piloto.sql.
- Página migration/pilot/capacitacion-pilot.html, scripts en capacitacion-assets.
- Limpieza de catálogo/contexto y cancelación de voz al salir o recargar.

## Verificación

- 8/8 nombres, tipos y enlaces devueltos coinciden con origen.
- Diez casos de handler simulados: ausencia/invalidación sesión, sin vínculo, inactivo, sin permiso, SIN ACCESO, Supervisor, Técnico, POST y error interno. Verifica filtrado de URL insegura/vacía y categorías.
- Curso con DOM mínimo simulado: restricción de perfil, diez pantallas, bloqueo de siguiente hasta completar cierre, evaluación de ocho preguntas al 100% y 0%, ocho refuerzos de error y bloqueo tras limpiar contexto.
- Pruebas reproducibles: node supabase/functions/capacitacion-pilot/test.cjs; node migration/pilot/capacitacion-assets/test-course.cjs.
- Sintaxis UI verificada. Chromium no estaba instalado: no se afirma prueba visual ni reproducción de audio.
- HTTP real sin JWT: 401.
- Ensayo SQL BEGIN/ROLLBACK: cero residuos, ocho filas al terminar.
- Privilegios y RLS comprobados en base; asesor informa RLS sin políticas, intencional para acceso exclusivo backend. [Referencia Supabase](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

## Pendientes

Auth real y navegación con cuentas actuales, validación visual en navegador/móvil, ejemplos/audio/evaluación interactiva integral, apertura de recursos Drive, integración de menú y resync antes del corte. Prueba Auth Técnico sigue diferida por indicación del usuario: solo Jefatura y Supervisor Chiclayo habilitados. Sin cuentas nuevas ni invitaciones. main, Apps Script, Sheets y Drive sin escrituras.
