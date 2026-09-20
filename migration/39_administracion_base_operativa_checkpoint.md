# Checkpoint Administración / Base Operativa — 20/09/2026

## Inventario real de Administración legacy
Subprocesos detectados:
1. Actualizar Base Operativa.
2. Calificar VTR/GAR.
3. Catálogo de Partidas.
4. Actualizar Usuarios.
5. Actualizar Ranking.
6. Permisos por perfil.

Reutilización ya disponible:
- VTR/GAR: backend migrado.
- Catálogo de Partidas: catalogo_partidas_migracion.
- Usuarios/Auth: app_users + Supabase Auth + auth-admin-pilot V2.
- Ranking: backend migrado por período.
- Permisos: app_permissions.
- Bloque realmente faltante: Actualizar Base Operativa.

## Base Operativa histórica
Fuente:
- Sheet BASE_OPERATIVA_HISTORICA.

Conteo:
- Sheets: 4,145 filas incluyendo cabecera = 4,144 registros.
- PostgreSQL base_operativa_legacy: 4,144 registros.
- Resultado: 4,144 / 4,144.

Muestras verificadas:
- primeras filas: coinciden;
- últimas filas: coinciden;
- incluye duplicado exacto histórico LIQ|3381466 en filas consecutivas, preservado como en origen.

Control maestro:
- módulo BASE_OPERATIVA creado.
- source_mode: SHEET_LIVE_SNAPSHOT.
- status: LIVE_VALIDAR.
- content_match: true para el corte auditado.
- requires_final_resync: true.

## Staging / preview
Migración:
- 125_base_operativa_staging_preview.sql

Función:
- mv_base_operativa_preview_staging(run_id, actor)

Usa:
- migration_sync_runs
- migration_sync_staging

Valida:
- conteo completo;
- Fecha / Cuadrilla / Estado;
- existencia de FINALIZADAS;
- fecha de corte = última FINALIZADA;
- período;
- bloqueo de período protegido;
- duplicados exactos;
- partidas FINALIZADAS sin catálogo;
- cuadrillas no reconocidas;
- comparación Actual vs Nuevo.

No modifica:
- base_operativa_legacy;
- ordenes;
- Producción;
- Efectividad;
- Recableado;
- VTR/GAR;
- Ranking.

## Edge Function
base-operativa-pilot V1
- ACTIVE.
- verify_jwt=true.
- requiere permiso ADMINISTRACION.administrar.

Acciones:
- estado
- iniciarCarga
- cargarBloque
- previsualizarCarga
- cancelarCarga

Carga:
- máximo 30,000 filas por ejecución;
- bloques máximos de 800;
- row_hash SHA-256;
- ownership por usuario creador;
- sin acción APPLY.

## Prueba transaccional
Se probó con una carga sintética de septiembre:
- 3 registros.
- 2 FINALIZADAS.
- 1 CANCELADA.
- corte 18/09/2026.
- período 2026-09.
- duplicados: 0.
- partidas faltantes: 0.
- cuadrillas faltantes: 0.
- puedeAplicar: true.

Prueba ejecutada en transacción + ROLLBACK.
Residuo posterior: 0.

## UI
Nueva:
- migration/pilot/base-operativa-pilot.html

Soporta:
- XLSX
- XLS
- CSV
- HTML
- carpeta complementaria _archivos / sheetNNN.htm

La UI:
- detecta encabezados;
- normaliza fechas;
- muestra corte/período;
- detecta duplicados locales;
- sube staging en bloques;
- ejecuta previsualización PostgreSQL;
- permite cancelar staging;
- NO tiene botón de aplicar.

Administración piloto enlaza esta pantalla como "Base Operativa / carga segura".

## Estado Administración
Administración completa sigue PENDIENTE_MIGRACION porque:
- aplicación final de Base Operativa todavía no está habilitada;
- faltan terminar CRUD/orquestación de algunos subprocesos legacy en la nueva UI.

Sin embargo ya están migrados/integrados:
- Auth/usuarios;
- acceso gradual sin contraseña;
- staging de Base Operativa;
- previsualización de Base Operativa.

## Seguridad
Edge activas:
- auth-admin-pilot V2 / JWT.
- analisis-economico-pilot V3 / JWT.
- facturas-pilot V1 / JWT.
- base-operativa-pilot V1 / JWT.

Security Advisor:
- sin nuevas alertas de security_definer_view;
- sin nuevas alertas de mutable search_path;
- único WARN: leaked password protection de Auth deshabilitado.

## Producción
Sin cambios:
- main
- Apps Script
- Google Sheets
- Google Drive
- GitHub Pages productivo
