# MI VISUAL — Shell integrado del piloto

Fecha: 20/09/2026  
Rama: `migracion-supabase`  
Producción `main`: sin cambios

## Objetivo
Eliminar la experiencia fragmentada de pilotos separados y volver al principio original de MI VISUAL:

- un solo login;
- un solo menú;
- sesión única;
- módulos dentro de la misma aplicación;
- permisos dinámicos desde `app_permissions`;
- páginas piloto aisladas conservadas solo como componentes/harnesses internos.

## Implementación

### Shell
`migration/pilot/index.html`

Flujo:
1. Supabase Auth inicia la sesión.
2. `app-shell-pilot` valida el JWT.
3. El backend resuelve `app_users`.
4. El backend devuelve `app_permissions`.
5. El navegador muestra únicamente filas con:
   - `activo=true`;
   - `mostrar_modulo=true`;
   - `ver=true`;
   - `alcance_datos <> SIN ACCESO`.
6. El módulo se abre dentro del mismo shell.
7. Cerrar sesión invalida la sesión común y vuelve al login único.

No se autoriza un módulo por parámetros de perfil enviados por el navegador.

### Edge Function
`app-shell-pilot` V2:
- ACTIVE;
- JWT obligatorio;
- servicio interno con service role;
- identidad desde Auth real;
- sin excepciones de menú codificadas por perfil;
- matriz `app_permissions` como fuente única del menú.

### Modo embebido
`migration/pilot/shell-embed.js`

Cuando un piloto abre con `?embed=1&shell=1`:
- reutiliza la sesión Supabase existente;
- oculta su formulario de login propio;
- conserva su lógica/API original;
- puede continuar abriéndose de forma aislada para QA.

Módulos adaptados:
- Mapa Operativo
- Equipos Averiados
- Seguridad ATS/PETAR
- Accesos
- Biblioteca
- Capacitación
- Mesa de Ayuda
- Bonos Supervisores
- Publicador WIN

## Permisos centralizados
Se aplicó `117_shell_permissions_integrated_modules.sql`.

La matriz pasó de 275 a 297 filas:
- 267 permisos legacy;
- 8 permisos piloto de Plantilla Orden;
- 15 filas explícitas de Mesa Ayuda;
- 5 filas explícitas de Bonos Supervisores;
- 2 filas explícitas de Publicador WIN.

No se consideran esas 30 filas adicionales como drift de Sheets; son configuración explícita del piloto y deben conservar trazabilidad separada.

Regla histórica preservada:
`MOSTRAR_MODULO=false` implica que el módulo no se muestra aunque `VER=true`.

Por ello Seguridad continúa sin aparecer en el menú cuando la matriz productiva la mantiene oculta.

## Validación por perfiles actuales

### JEFATURA
- módulos visibles según matriz: 21;
- UI integrada disponible: 8;
- pendientes de integración visual: 13.

Integrados:
- Accesos
- Biblioteca
- Capacitación
- Equipos Averiados
- Mapa Operativo
- Mesa Ayuda
- Bonos Supervisores
- Publicador WIN

### SUPERVISOR
- módulos visibles según matriz: 17;
- UI integrada disponible: 6;
- pendientes de integración visual: 11.

Integrados:
- Accesos
- Biblioteca
- Capacitación
- Mapa Operativo
- Mesa Ayuda
- Bonos Supervisores

## Navegación
- Inicio mantiene el shell.
- Abrir módulo no realiza un nuevo login.
- Volver a Inicio limpia la ruta/hash.
- Se corrigió el riesgo de doble `signOut` al cerrar sesión.
- En móvil el menú lateral es colapsable.

## Hosting piloto
Se añadió `netlify.toml` en la rama de migración para fijar:
`publish = "migration/pilot"`.

También se añadió `migration/pilot/_headers`.

Esto evita que un despliegue futuro del piloto publique accidentalmente el `index.html` productivo del repositorio.

### Estado de publicación
El sitio Netlify existente sigue en el deploy anterior `6ab03082193c47bec980fa6c`.

El conector de Netlify exige una subida CLI desde un directorio fuente local para publicar. El entorno actual no puede descargar/clonar el repositorio por red, por lo que el nuevo shell queda **versionado y listo para deploy**, pero no se afirma que ya esté visible en la URL pública.

No se modificó:
- `main`;
- GitHub Pages productivo;
- Apps Script;
- Google Sheets;
- Google Drive;
- sitio productivo.

## Próximo bloque
Integrar dentro del mismo shell las UIs que ya tienen backend cerrado:
1. Validación Técnica.
2. Actas.
3. Programación de Descansos.
4. Ranking / Dashboard.
5. Observaciones.

No crear nuevas aplicaciones separadas.
