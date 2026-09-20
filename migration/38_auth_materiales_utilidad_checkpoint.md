# Checkpoint Auth + Materiales + Utilidad — 20/09/2026

## Auth
- auth-admin-pilot actualizado a V2.
- JWT obligatorio.
- Se añadió provisión gradual sin contraseña.
- createUser usa email_confirm=true, no genera contraseña temporal y no envía invitación.
- La operación exige confirmación explícita y solo admite perfiles controlados.
- Si Auth se crea pero app_users no queda enlazado, el alta se revierte.
- Auditoría en auth_access_audit.
- Estado actual: 80 usuarios, 79 activos, 2 Auth vinculados.
- Elegibles sin Auth: 3 supervisores y 42 técnicos, además de perfiles menores.
- No se ejecutó provisión masiva automática.

## Materiales
Fuente productiva:
- CONSUMO_MATERIALES: 1,392 filas de datos.
- PostgreSQL economico_materiales_snapshot: 1,392.
- Muestras de primeros y últimos registros revisadas: coincidentes.

Catálogo:
- snapshot bruto contenía 2 filas no operativas de texto/cabecera.
- nueva vista mv_economico_catalogo_materiales_limpio.
- catálogo operativo: 25 materiales.
- 24 ACTIVO.
- 1 PENDIENTE: TELEFONO sin precio.

Resumen PostgreSQL:
- 2026-07: S/ 57,960.71; 495 filas; 23 cuadrillas.
- 2026-08: S/ 54,039.97; 504 filas; 26 cuadrillas.
- 2026-09: S/ 17,576.54; 393 filas; 26 cuadrillas.

Objetos nuevos:
- mv_economico_catalogo_materiales_limpio
- mv_economico_materiales_lotes
- mv_economico_materiales_resumen_periodo

MATERIALES pasa de PENDIENTE_MIGRACION a LIVE_VALIDAR.
Sigue requiriendo resync final porque IMPORTAR_MATERIALES/CONSUMO_MATERIALES permanecen vivos en legacy.

## Utilidad Cuadrilla
UTILIDAD_CUADRILLA pasa a LIVE_VALIDAR:
- motor activo: mv_economico_utilidad_migracion
- resumen: mv_economico_resumen_periodo
- julio/agosto: economico_resumen_protegido_snapshot
- detalle monetario histórico por cuadrilla sigue no autoritativo y bloqueado.
- septiembre continúa dinámico.

## API / UI Económico
analisis-economico-pilot actualizado a V3:
- utilidad por cuadrilla
- materiales por cuadrilla
- catálogo de materiales
- lotes
- resumen por período
- protección histórica

Pantalla analisis-economico-pilot.html actualizada con Catálogo y Lotes.

## Facturas
Control de fuente corregido a SHEET_LIVE_SNAPSHOT + LIVE_VALIDAR.
El backend piloto está listo pero legacy sigue siendo productivo hasta el corte.

## Netlify
Netlify generó el comando de despliegue para mi-visual-piloto, pero exige ejecutarlo dentro del repo local.
El entorno de ejecución actual no tiene resolución de red hacia github.com, por lo que no se forzó un deploy parcial.
No se modificó el sitio con archivos incompletos.

## Seguridad
- Edge Auth Admin V2: ACTIVE / JWT.
- Edge Análisis Económico V3: ACTIVE / JWT.
- Edge Facturas V1: ACTIVE / JWT.
- UI Administración y Económico: sintaxis JavaScript validada.
- Sin nuevas alertas WARN/ERROR de views o search_path.
- Único WARN actual: Auth leaked password protection deshabilitado.

## Producción
Sin cambios en:
- main
- Apps Script
- Google Sheets
- Drive productivo
- GitHub Pages productivo
