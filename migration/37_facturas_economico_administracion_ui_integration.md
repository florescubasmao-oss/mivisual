# Integración UI — Facturas, Análisis Económico y Administración

Fecha: 20/09/2026  
Rama: `migracion-supabase`  
Producción `main`: sin cambios.

## Resultado de este bloque
Se completó la cobertura visual del shell para todos los módulos visibles de Jefatura y Supervisor.

Cobertura UI:
- JEFATURA: 21 visibles / 21 con UI.
- SUPERVISOR: 17 visibles / 17 con UI.

Esto significa cobertura de interfaz, NO equivalencia de cutover.

## Facturas de Combustible

### Diagnóstico legacy
Hojas:
- FACTURAS_CONFIG: configuración existente.
- FACTURAS_PENDIENTES: 0 registros al corte.
- FACTURAS_DETALLE: 0 registros al corte.

Configuración migrada:
- monto obligatorio: S/ 100.
- máximo: 10 comprobantes.
- ancho de compresión: 1280 px.
- calidad JPEG: 0.72.

`app_users` ya contenía:
- tiene_unidad;
- placa_unidad;
- frecuencia_combustible;
- facturas_activo.

Responsables Técnicos activos con Facturas: 20.

### Backend nuevo
Migración:
- `119_facturas_combustible_backend.sql`

Objetos:
- `facturas_config_migracion`
- `facturas_pendientes_migracion`
- `facturas_detalle_migracion`

RPC:
- `mv_facturas_usuario`
- `mv_facturas_estado_visible`
- `mv_facturas_contexto`
- `mv_facturas_crear_pendiente`
- `mv_facturas_detalle`
- `mv_facturas_presentar`
- `mv_facturas_observar_detalle`
- `mv_facturas_aprobar_presentacion`

Flujo:
1. Gerencia General crea pendiente.
2. Responsable carga comprobantes.
3. Total vigente debe ser exactamente S/ 100.
4. Gerencia puede observar una factura.
5. Responsable reemplaza todas las facturas observadas.
6. Gerencia aprueba la presentación.

Estado VENCIDO es derivado por fecha, no reescribe el pendiente.

### Edge / Storage
- `facturas-pilot` V1 ACTIVE.
- JWT obligatorio.
- Imágenes en bucket privado `mi-visual-evidencias`.
- signed URL temporal para lectura.
- si SQL falla después de upload, la Edge elimina los archivos recién subidos.

UI:
- `migration/pilot/facturas-pilot.html`

### Pruebas
Prueba completa en transacción:
- crear pendiente;
- presentar S/60 + S/40;
- observar comprobante de S/60;
- reemplazarlo;
- aprobar;
- total vigente S/100.

Resultado: correcto.
Se ejecutó ROLLBACK.
Estado real posterior:
- pendientes: 0;
- detalles: 0.

Se corrigió además:
- `mv_facturas_estado_visible`: STABLE, no IMMUTABLE.
- ordenamiento del contexto Facturas en `122_facturas_contexto_order_fix.sql`.

Contextos verificados:
- GERGENERAL
- JEFZNORTE
- SUPCHICLAYO
- P1TRASLADOVISUAL2

### Estado de migración
FACTURAS = LIVE_VALIDAR.
Requiere comprobación/resync final antes del cutover mientras Apps Script continúe activo.

## Análisis Económico

### Edge/UI
- `analisis-economico-pilot` V2 ACTIVE / JWT.
- `migration/pilot/analisis-economico-pilot.html`

Incluye:
- resumen por período;
- conciliación;
- utilidad activa por cuadrilla;
- materiales por cuadrilla;
- estado/frescura de fuentes.

Solo lectura.

### Defecto histórico detectado y corregido
El supuesto `SNAPSHOT_PROTEGIDO` de julio/agosto utilizaba:
`produccion_legacy_snapshot + catálogo de tarifas mutable`.

Por tanto, al cambiar el catálogo, los períodos cerrados se revalorizaron:
- julio pasó indebidamente de S/ 289,440 a S/ 291,954;
- agosto pasó indebidamente de S/ 314,570 a S/ 318,440.

La diferencia correspondía exactamente a recuperaciones que nunca debían aplicarse retroactivamente.

### Protección real
Migración:
- `121_economico_proteccion_historica_real.sql`

Nuevo snapshot:
- `economico_resumen_protegido_snapshot`

Julio congelado:
- producción: S/ 289,440.00
- costos: S/ 184,600.46
- utilidad: S/ 104,839.54
- 23 cuadrillas completas

Agosto congelado:
- producción: S/ 314,570.00
- costos parciales: S/ 86,440.70
- utilidad parcial: S/ 228,129.30
- 2 completas / 26 incompletas

Septiembre continúa dinámico:
- producción actual motor: S/ 238,950.00
- materiales: S/ 17,576.54
- bonos: S/ 18,877.50
- PDG: S/ 4,384.89
- penalidades: S/ 580.00
- costos parciales: S/ 41,418.93
- utilidad parcial: S/ 197,531.07
- 1 completa / 32 incompletas

Conciliación protegida:
- julio diferencia producción = S/ 0.
- agosto diferencia producción = S/ 0.

### Regla de seguridad histórica
El snapshot original no congeló monto por cuadrilla.

Por eso:
- resumen julio/agosto: AUTORITATIVO y congelado;
- detalle monetario por cuadrilla julio/agosto: NO AUTORITATIVO;
- la API V2 bloquea ese detalle en períodos protegidos;
- septiembre sí expone detalle por cuadrilla desde motor activo.

No se repartieron diferencias históricas a ciegas.

ANALISIS_ECONOMICO continúa REQUIERE_RESYNC_FINAL por septiembre/fuentes vivas.

## Administración

UI:
- `migration/pilot/administracion-pilot.html`

Backend utilizado:
- `auth-admin-pilot` ACTIVE / JWT.

Acciones integradas:
- contexto Auth Admin;
- resumen de migración Auth;
- listado/búsqueda de usuarios;
- creación controlada de acceso Supabase Auth.

Estado:
- usuarios: 80;
- activos: 79;
- Auth vinculados: 2.

La pantalla permite crear nuevos accesos solo para usuarios elegibles con correo válido y contraseña temporal de mínimo 8 caracteres.

### Límite explícito
ADMINISTRACION permanece PENDIENTE_MIGRACION.

Están integrados:
- usuarios operativos;
- permisos;
- identidad Auth;
- alta controlada Auth.

No se declaran migrados todavía:
- catálogos administrativos legacy;
- cargas operativas legacy;
- otras acciones administrativas que siguen dependiendo de Apps Script/Sheets.

## Seguridad
Nuevos objetos:
- RLS habilitado.
- 0 grants directos a anon/authenticated en Facturas y snapshot económico protegido.
- Edge Functions con JWT.
- service role no expuesto al navegador.

Security Advisor:
- sin reaparición de `security_definer_view`;
- sin reaparición de `function_search_path_mutable`;
- INFO de RLS sin políticas continúa intencional por arquitectura backend-only;
- WARN externo pendiente: Leaked Password Protection de Supabase Auth.

## Shell
Rutas añadidas:
- FACTURAS
- ANALISIS ECONOMICO
- ADMINISTRACION

El shell ya diferencia:
- INTEGRADO
- PILOTO · RESYNC FINAL
- PROTEGIDO · RESYNC FINAL
- PARCIAL · AUTH

Por tanto “tener UI” ya no equivale visualmente a “módulo listo para corte”.

## Migrations de este bloque
- 119_facturas_combustible_backend.sql
- 120_facturas_stability_admin_checkpoint.sql
- 121_economico_proteccion_historica_real.sql
- 122_facturas_contexto_order_fix.sql

## Producción
No se modificó:
- `main`
- Apps Script
- Google Sheets
- Google Drive productivo
- GitHub Pages productivo

## Bloqueadores reales para cutover
1. Expandir Supabase Auth más allá de 2 usuarios.
2. Resync final de fuentes que siguen cambiando.
3. Resolver Administración completa.
4. Cerrar MATERIALES / UTILIDAD_CUADRILLA como fuentes de migración.
5. Crear snapshot monetario por cuadrilla para históricos económicos si se requiere ese detalle histórico.
6. Portar formularios complejos restantes de Actividad/Checklist con paridad completa.
7. Activar/decidir Leaked Password Protection.
8. Publicar y probar el shell integrado en Netlify.
9. QA móvil/PC por perfiles reales.
10. Ensayo de cutover + rollback antes de reemplazar Apps Script/Sheets.
