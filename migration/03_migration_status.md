# Checkpoint Administración / Base Operativa — 20/09/2026

- BASE_OPERATIVA_HISTORICA alineada: 4,144 Sheets / 4,144 PostgreSQL.
- BASE_OPERATIVA registrada en control maestro como LIVE_VALIDAR.
- Nueva RPC mv_base_operativa_preview_staging.
- Nueva Edge base-operativa-pilot V1 ACTIVE/JWT.
- Carga por bloques + staging + preview; SIN APPLY.
- Prueba septiembre: 3 filas, corte 18/09, 2 finalizadas, 0 faltantes, puedeAplicar=true; ROLLBACK y 0 residuos.
- Nueva UI base-operativa-pilot.html enlazada desde Administración.
- Administración completa sigue PENDIENTE_MIGRACION hasta portar APPLY y subprocesos restantes.
- main/Apps Script/Sheets/Drive productivos sin cambios.

# Checkpoint Auth / Materiales / Utilidad — 20/09/2026

- Auth Admin Edge V2: provisión gradual sin contraseña disponible, sin invitación automática.
- No se ejecutó alta masiva; 2/80 usuarios siguen vinculados Auth.
- Materiales: 1,392/1,392 filas; catálogo limpio 25 (24 activos, 1 pendiente).
- MATERIALES: LIVE_VALIDAR.
- UTILIDAD_CUADRILLA: LIVE_VALIDAR.
- Analisis Económico Edge V3: catálogo, lotes y resúmenes de materiales añadidos.
- Facturas: source_mode corregido a SHEET_LIVE_SNAPSHOT + LIVE_VALIDAR.
- Deploy Netlify pendiente por falta de repo local accesible desde el entorno; no se hizo deploy parcial.
- main/Apps Script/Sheets/Drive productivos sin cambios.

# Checkpoint Facturas / Económico / Administración — 20/09/2026

- Cobertura UI JEFATURA: 21/21.
- Cobertura UI SUPERVISOR: 17/17.
- Cobertura UI completa NO significa cutover completo.
- Facturas backend creado y probado transaccionalmente; Edge ACTIVE/JWT; 0 datos de prueba persistentes.
- Facturas legacy tenía 0 pendientes / 0 detalles al corte.
- Análisis Económico V2 ACTIVE/JWT.
- Protección histórica económica corregida:
  - JUL 2026 producción S/ 289,440; utilidad S/ 104,839.54.
  - AGO 2026 producción S/ 314,570; utilidad parcial S/ 228,129.30.
- Detalle monetario por cuadrilla de JUL/AGO queda bloqueado hasta snapshot inmutable por cuadrilla.
- Administración UI integrada solo para usuarios/Auth; módulo completo continúa PENDIENTE_MIGRACION.
- Auth: 2/80 usuarios vinculados.
- Security Advisor sin nuevos errores de views/search_path; Leaked Password Protection sigue pendiente.
- `main`, Apps Script, Sheets y Drive productivos sin cambios.

# Checkpoint UI Actividad / Checklist / PEXT / Plantilla — 20/09/2026

- Actividad Campo integrada al shell.
- Checklist Almacén integrado al shell.
- PEXT integrado al shell.
- Plantilla Orden integrada al shell.
- Edge Actividad V2 ACTIVE/JWT.
- Edge Checklist V2 ACTIVE/JWT.
- Edge PEXT V2 ACTIVE/JWT.
- Plantilla Orden V2 ACTIVE/JWT.
- JEFATURA: 18/21 módulos visibles integrados.
- SUPERVISOR: 16/17 módulos visibles integrados.
- PEXT drift nuevo: 30 Sheets / 28 PostgreSQL -> REQUIERE_RESYNC_FINAL.
- Actividad: 72/72 por conteo; 11 registros septiembre; 0 escrituras piloto persistentes.
- Checklist: 114/114 por conteo; 25 registros septiembre.
- Formularios complejos de Auditoría/Checklist no se recortaron: continúan en legacy hasta paridad completa.
- `main`, Apps Script, Sheets y Drive sin cambios.

# Checkpoint UI Ranking / Dashboard / Observaciones — 20/09/2026

- Edge `ranking-dashboard-pilot` V1 ACTIVE + JWT.
- Edge `observaciones-pilot` V1 ACTIVE + JWT.
- Ranking integrado al shell.
- Dashboard Jefatura/Supervisor integrado al shell.
- Observaciones integrado al shell.
- JEFATURA: 14/21 módulos visibles con UI integrada.
- SUPERVISOR: 12/17 módulos visibles con UI integrada.
- Observaciones: 78 Sheets / 78 PostgreSQL por conteo.
- Septiembre Observaciones: 21 / S/ 4,130 / S/ 1,618 afectado.
- Ranking/Dashboard septiembre: 33 cuadrillas, 16 Chiclayo.
- QA sintáctico: shell + 3 pantallas = 4/4 correcto.
- Advertencia de convivencia agregada a Observaciones.
- `main`, Apps Script, Sheets y Drive sin cambios.

# Checkpoint UI Validación / Actas / Descansos — 20/09/2026

- Validación Técnica integrada al shell.
- Edge `actas-pilot` V1 ACTIVE + UI Actas integrada.
- Edge `descansos-pilot` V1 ACTIVE + UI Descansos integrada.
- JEFATURA: 11/21 módulos visibles ya tienen UI integrada.
- SUPERVISOR: 9/17 módulos visibles ya tienen UI integrada.
- QA sintáctico: shell + 3 nuevas pantallas = 4/4 correcto.
- Drive sigue vigente para PDFs de Actas; no se migró almacenamiento físico.
- Fuentes legacy continúan vivas: resync final sigue obligatorio.
- `main`, Apps Script y Sheets sin cambios.

# Checkpoint shell integrado — 20/09/2026

- Shell único MI VISUAL creado en `migration/pilot/index.html`.
- `app-shell-pilot` V2 ACTIVE con JWT.
- Menú gobernado exclusivamente por `app_permissions`.
- 9 páginas piloto adaptadas a sesión compartida/embedded.
- Matriz de permisos PostgreSQL: 297 filas = 267 legacy + 30 explícitas del piloto.
- JEFATURA: 8 módulos con UI ya integrada; SUPERVISOR: 6.
- `MOSTRAR_MODULO=false` continúa ocultando el módulo.
- `main`, Apps Script y Sheets sin cambios.
- Config Netlify preparada para publicar solo `migration/pilot`.
- Deploy público del nuevo shell aún no ejecutado: Netlify requiere fuente local y este entorno no puede clonar el repo.

# Checkpoint integral de migración — 20/09/2026

## Decisión
La migración a Supabase/PostgreSQL continúa siendo viable. No reiniciar. No tocar `main` ni cortar la app Apps Script/Sheets todavía.

## Seguridad corregida
- 52 vistas legacy pasaron a `security_invoker=true`.
- 22 funciones public.* quedaron con `search_path=public,pg_temp`.
- Grants directos de `anon` / `authenticated` sobre `app_users` y vistas public.* fueron revocados.
- Edge Functions continúan como frontera de acceso a datos.
- Security Advisor ya no reporta `security_definer_view` ni `function_search_path_mutable`.
- Pendiente externo: activar Leaked Password Protection en Supabase Auth.
- Las tablas permanecen con RLS habilitado y sin políticas públicas directas por diseño backend-only.

## Convivencia / drift detectado
Auditoría directa contra las hojas productivas activas:
- MAPA_ORDENES: 6786 filas vs PostgreSQL 6549.
- CATALOGO_CTO: 6994 vs 6815.
- ACTAS_ESCANEADAS: 2339 vs 2294.
- VALIDACION_TECNICA: 687 vs 674.
- PROGRAMACION_DESCANSOS: 723 vs 705.
- OBSERVACIONES: 78 vs 78.
- ACTIVIDAD_CAMPO: 72 vs 72.
- CHECKLIST_ALMACEN: 114 vs 114.
- USUARIOS: 80 vs 80.
- PERMISOS legacy: 267. PostgreSQL: 275 = 267 legacy + 8 permisos deliberados del piloto PLANTILLA ORDEN.

Conclusión: mientras la app antigua siga escribiendo, PostgreSQL puede quedar desfasado. No declarar cutover con snapshots viejos.

## Sincronización segura
Se incorporó:
- `migration_sync_runs`
- `migration_sync_staging`
- `mv_migration_sync_status`
- Edge Function `legacy-sync-pilot` V2, JWT obligatorio.
- staging por bloques con hash de fila, conteo e idempotencia por `run_id + source_key`.
- validación obligatoria antes de aplicar.
- cancelación sin tocar tablas operativas.
- primer aplicador específico: `mv_sync_apply_validacion_tecnica`.
- acción Edge `aplicarValidacionTecnica` con confirmación explícita.

Prueba transaccional del staging: 1/1 VALIDATED y rollback correcto.

No se transfirieron automáticamente filas privadas desde Google Drive a Supabase mediante los conectores: el control de seguridad de la plataforma bloqueó esa transferencia directa. Se verificó que no hubo escritura parcial: VALIDACION_TECNICA permanece en 674 filas y no existe run parcial del delta.

## Módulos omitidos/pendientes confirmados
- ASIGNACIONES_CAMPO: detectado como módulo legacy de riesgo alto; añadido al control maestro como PENDIENTE_MIGRACION.
- FACTURAS: pendiente.
- ADMINISTRACION completa: pendiente; Auth/usuarios/permisos no equivalen al módulo completo.
- MATERIALES/UTILIDAD: motor económico parcial; falta cierre funcional/resync.
- Frontend piloto único: pendiente de consolidación; las páginas por módulo siguen siendo harnesses de prueba, no arquitectura final.

## Ranking
Regla definitiva: pesos por período.
Septiembre 2026 vigente: 50 / 20 / 5 / 5 / 5 / 15.
Julio y agosto permanecen protegidos y no se recalculan.

## Archivos/migraciones nuevas de este checkpoint
- 111_ranking_pesos_por_periodo.sql
- 112_security_hardening_views_functions.sql
- 113_live_source_control_audit_20260920.sql
- 114_sync_staging_control.sql
- 115_security_revoke_direct_public_access.sql
- 116_sync_apply_validacion_tecnica.sql
- Edge `legacy-sync-pilot` V2.

## Orden recomendado desde aquí
1. Mantener seguridad backend-only y resolver Leaked Password Protection.
2. Completar aplicadores de sync por módulo sin escribir a ciegas.
3. Construir el shell único del piloto MI VISUAL (un login / un menú / módulos internos).
4. Cerrar módulos omitidos: Asignaciones Campo, Facturas, Administración y cierre Económico/Materiales.
5. Ampliar Auth por perfiles controlados.
6. Resync final de todas las fuentes vivas.
7. Ensayo de cutover y validación móvil/PC.
8. Solo después sustituir Apps Script/Sheets como backend productivo.


---

# Estado de migración — MI VISUAL

Fecha: 2026-09-18

## Infraestructura creada

- Organización Supabase: Mi Visual
- Proyecto: MI VISUAL MIGRACION
- Región: sa-east-1 (São Paulo)
- Costo confirmado al crear el proyecto: US$0/mes
- Estado del proyecto al crear: ACTIVE_HEALTHY

## Seguridad inicial

Las tablas del piloto tienen Row Level Security (RLS) habilitado.
Todavía no existen políticas de acceso público. Esto es intencional: los datos no se expondrán al frontend hasta definir autenticación y permisos.

## Mapa Operativo migrado a prueba

Tablas creadas:
- public.ordenes
- public.catalogo_cto

Carga inicial:
- MAPA_ORDENES -> 6,549 órdenes
- CATALOGO_CTO -> 6,815 CTO

Cobertura de órdenes:
- fecha mínima detectada: 2026-04-02
- fecha máxima detectada: 2026-09-18

Validación de equivalencia:
- 17/09/2026: Sheets 109 / PostgreSQL 109
- 18/09/2026: Sheets 41 / PostgreSQL 41

## Prueba de rendimiento inicial

Con 6,549 órdenes cargadas:

- Consulta sede + fecha:
  ejecución aproximada en PostgreSQL: 0.19 ms
- Búsqueda por ORDEN_ID usando índice único:
  ejecución aproximada: 0.13 ms

Estas mediciones corresponden al motor PostgreSQL, no incluyen latencia de red ni renderizado del navegador.

## Producción — BACKEND VALIDADO

Estado: **CERRADO EN MIGRACIÓN / SIN CUTOVER PRODUCTIVO**

Validación al corte `2026-09-17 20:34`:

- Snapshot legacy: **1,077 órdenes / 1,920 puntos**.
- Corrección validada `3404829`: **+1 orden / +1 punto**.
- Objetivo migración: **1,078 órdenes / 1,921 puntos**.
- Motor PostgreSQL: **1,078 órdenes / 1,921 puntos**.
- Pendientes sin partida: **0**.
- Diferencia final: **0 órdenes / 0 puntos**.

Bono diario:

- Regla 4.5 / base 4 preservada.
- Tarifa normal S/30 y especial S/45 preservadas.
- P7 SGI: PDG hasta 31/07; tarifa especial desde 01/08.
- P8 SGI Alex Bastidas: PDG.
- GAR/VTR activo setiembre: **6 BONO / 9 puntos**.
- PEXT setiembre: **0 puntos**.
- Única diferencia diaria válida: `02/09 P1 Traslado Dany Atencio`, de 4 a 5 pts por recuperación de `3404829`, generando **+S/45 por cuadrilla**.

Valorización base preparada:

- Legacy setiembre: **S/236,530**.
- Tarifa efectiva unívoca: **S/238,870**.
- Recuperable: **S/2,340** por `MESHPV` y `REUSR`.
- `CAT6MESH2` conserva ambigüedad S/90 vs S/105 y no se resuelve automáticamente; no afecta órdenes históricas Jul–Sep actuales.

Documento de validación: `migration/09_produccion_bonus_validation.md`.

## Siguiente fase

1. Diseñar autenticación/roles.
2. Construir API/RPC segura del Mapa.
3. Crear versión de prueba del frontend apuntando a Supabase.
4. Comparar filtros y búsquedas contra el Mapa actual.
5. Implementar sincronización temporal Sheets -> PostgreSQL mientras dure la transición.
6. Solo después de validar, planificar el cambio de producción.

## Usuarios — preparación de autenticación

Se creó public.app_users y se migraron 80 registros de metadatos de USUARIOS.

Importante: la columna Clave del Google Sheet NO fue copiada a PostgreSQL. Las contraseñas actuales no se migrarán como texto. La autenticación nueva se diseñará usando Supabase Auth y asociación mediante auth_user_id.

Resumen inicial:
- 80 perfiles migrados
- 79 marcados como activos en la fuente actual
- 65 registros con correo disponible

## Avance de autenticación, permisos y API del piloto

- PERMISOS_MODULOS migrado: 267 reglas.
- CONFIG_MODULOS migrado: 2 configuraciones.
- ACCESOS migrado: 42 enlaces.
- app_users conserva metadatos, sin copiar contraseñas.
- Se detectaron 80 usuarios: 65 con correo informado, 15 sin correo; 13 de los correos informados no tienen formato válido para Auth.
- Se creó vínculo automático auth.users -> app_users por correo cuando exista coincidencia válida.
- app_users solo permite lectura del propio perfil mediante RLS.
- ordenes, catalogo_cto, permisos, configuraciones y enlaces permanecen bloqueados para acceso directo de anon/authenticated.
- Se desplegó Edge Function protegida: mapa-operativo-pilot (JWT obligatorio).
- Se desplegó pantalla aislada de prueba: mapa-pilot-web. No modifica producción.
- Consultas del piloto ya usan índices PostgreSQL y funciones RPC restringidas a service_role.
- Validación puntual: SETIEMBRE 2026 / CHICLAYO = 887 filas tanto en Google Sheets como en PostgreSQL.
- La búsqueda relacional de pedido que depende de otras fuentes legacy aún está marcada como pendiente antes de cualquier corte productivo.


## Actualización 18/09/2026 — Piloto Mapa Operativo

Validado con Auth real JEFZNORTE:
- login Supabase Auth: OK
- vínculo Auth -> app_users: OK
- perfil/permisos JEFATURA: OK
- catálogos PostgreSQL: OK
- búsqueda por ORDEN: OK
- búsqueda por PEDIDO: OK
- búsqueda por DNI: OK
- filtro 2026-09 + CHICLAYO: 887 / 887
- CTO cercanas: OK
- main / Apps Script productivo: SIN CAMBIOS

Pendiente para cierre total del piloto:
- validar alcance real de SUPERVISOR por cuadrillas: APROBADO (SUPCHICLAYO 841/841)
- prueba móvil
- definir tratamiento de calidad de datos CTO con sufijo `Latitud`
- relación Pedido -> Orden del Mapa: CERRADA en PostgreSQL; fallbacks de Actas/Actividad se migran con esos módulos


## Cierre funcional del piloto Mapa Operativo — 18/09/2026

Estado: **FUNCIONALMENTE CERRADO**

Aprobado:
- Auth JEFATURA
- Auth SUPERVISOR
- permisos y alcance por cuadrillas
- catálogos PostgreSQL
- búsqueda Orden / Pedido / DNI
- filtros período / sede / grupo / estado / cuadrilla
- CTO cercanas
- prueba móvil
- relación Pedido -> Orden sin dependencia legacy del módulo Mapa

Pendientes no bloqueantes:
- mejora visual de tabla móvil
- saneamiento controlado de códigos CTO con sufijo `Latitud`
- integración productiva futura cuando corresponda al plan de migración

`main`, Apps Script y Google Sheets productivos permanecen sin cambios.


## Producción — migración iniciada 18/09/2026

Estado: EN CONCILIACIÓN, sin cambios en producción.

- PRODUCCION_APP copiado: 2,742 / 2,742.
- BASE_OPERATIVA_HISTORICA: 4,144 / 4,144.
- Catálogo: 33 filas preservando duplicados.
- Ajustes Partida V513: 33.
- Reglas V513: 80.
- Clasificación GAR/VTR mínima para dependencia de Producción: 160.
- Julio y agosto protegidos como snapshots.
- Setiembre usa elegibilidad por orden y regla GAR/VTR bidireccional.
- Diferencia controlada detectada: orden 3404829 debe recuperar Producción por NO_ES_GAR_VTR; snapshot actual aún no la contiene.
- Siguiente paso: Partida efectiva y puntos por orden, en diagnóstico.


## Análisis Económico — BACKEND VALIDADO

Estado: **MOTOR CERRADO / COSTOS OPERATIVOS PENDIENTES DE CARGA**

- Materiales: 1,392 / 1,392.
- Gastos directos: 84 registros, solo julio.
- Tarifario PDG: 32.
- Observaciones: 78.
- Setiembre valorizado migración: S/ 238,950.
- Setiembre legacy: S/ 236,530.
- Diferencia de ingreso: +S/ 2,420.
- Bono migración setiembre: S/ 18,877.50.
- PDG migración setiembre: S/ 4,384.89.
- Utilidad parcial setiembre: S/ 197,531.07.
- 32 cuadrillas quedan INCOMPLETO_GASTOS por ausencia de costos directos.
- P7 PDG solo hasta julio; desde agosto es regular con tarifa especial.
- Julio/agosto permanecen protegidos y no se reescriben.
- Documento: migration/10_economic_validation.md.


## Efectividad — BACKEND VALIDADO

Estado: **CERRADO EN MIGRACIÓN / SIN CUTOVER PRODUCTIVO**

- Snapshot EFECTIVIDAD: 83 / 83 filas.
- Lógica V487 recuperada y portada a PostgreSQL.
- Julio: 2,258 evaluables / 64.57%, protegido.
- Agosto: 2,423 evaluables / 64.59%, protegido.
- Setiembre snapshot 17/09: 1,735 / 63.80%.
- Setiembre Mapa actual: 1,738 / 63.81%.
- Diferencia: +2 Finalizadas, +1 Cancelada; corresponde a estados posteriores al corte 17/09 20:34.
- Reprogramadas: 240 / 240.
- Partner solo excluye reservas pendientes.
- Documento: migration/11_efectividad_validation.md.


## Recableado — BACKEND VALIDADO

Estado: CERRADO EN MIGRACIÓN / SIN CUTOVER PRODUCTIVO

- Snapshot PORCENTAJE REC: 83 / 83 filas.
- Regla V487 portada a PostgreSQL.
- Julio: 453 / 273 = 60.26%, protegido.
- Agosto: 445 / 290 = 65.17%, protegido.
- Setiembre: 244 / 153 = 62.70%.
- Conciliación setiembre por 33 cuadrillas: diferencia 0.
- Documento: migration/12_recableado_validation.md.


## Bonos Supervisores — BACKEND VALIDADO — 19/09/2026

Estado: **BACKEND CERRADO / API PILOTO DESPLEGADA / SIN CUTOVER PRODUCTIVO**

- 8 asignaciones históricas migradas.
- 3 evaluaciones de liderazgo migradas.
- 2 configuraciones históricas migradas.
- 0 registros de satisfacción legacy.
- 3 validaciones de actas migradas.
- 56 filas históricas de SLA preservadas.
- 28 parámetros SLA vigentes por período Jul–Sep.
- Capa editable SLA PostgreSQL validada sin alterar históricos.
- Cache operativo: Jul 24 / Ago 28 / Sep 33 cuadrillas.
- Lectura Jefatura 4 supervisores: ~55–184 ms.
- Refresco controlado setiembre: ~4.8 s.
- Escrituras evaluación/satisfacción/actas/configuración/SLA probadas con ROLLBACK.
- Datos de prueba persistentes: 0.
- Edge Function `bonos-supervisores-pilot`: ACTIVE, JWT obligatorio.
- Documento: `migration/22_bono_supervisores_validation.md`.
- `main`, Apps Script y Google Sheets productivos: SIN CAMBIOS.
