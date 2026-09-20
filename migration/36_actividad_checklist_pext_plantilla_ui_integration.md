# Integración UI — Actividad Campo, Checklist, PEXT y Plantilla Orden

Fecha: 20/09/2026
Rama: `migracion-supabase`
Producción `main`: sin cambios.

## Objetivo
Integrar dentro del shell único de MI VISUAL:
- Actividad en Campo
- Checklist Almacén
- PEXT / Trabajos Conjunta
- Plantilla de Orden

Sin duplicar reglas ya cerradas en PostgreSQL y sin crear aplicaciones separadas.

## Actividad en Campo
Nueva Edge Function:
- `actividad-campo-pilot` V2
- ACTIVE
- JWT obligatorio

UI:
- `migration/pilot/actividad-campo-pilot.html`

RPC reutilizadas:
- `mv_actividad_listar`
- `mv_actividad_resumen`
- `mv_actividad_listar_cuadrillas`
- `mv_actividad_buscar_datos_auditoria`
- `mv_actividad_registrar`

Funciones integradas:
- listado y filtros;
- resumen operativo;
- consulta de detalle;
- exportación CSV;
- registro simple de:
  - SEGUIMIENTO
  - VALIDACION DE OBSERVACION
  - CAPACITACION

No se expuso un formulario incompleto para:
- AUDITORIA EN FRIO;
- AUDITORIA EN CALIENTE;
- CHECKLIST desde Actividad.

Esos formularios permanecen temporalmente en legacy hasta portar la matriz completa de criterios/evidencias sin perder campos.

Se detectó y corrigió un error de integración inicial:
- las RPC no aceptan `periodo` directamente;
- la Edge V2 convierte período a `fechaDesde/fechaHasta`.

Estado actual PostgreSQL:
- 72 registros históricos;
- 11 registros de septiembre;
- fecha mínima 09/07/2026;
- fecha máxima 14/09/2026;
- 0 escrituras piloto persistentes.

Prueba de registro simple:
- ejecutada dentro de transacción;
- ROLLBACK;
- 0 residuos.

Conteo actual Sheets:
- 72.

## Checklist Almacén
Nueva Edge Function:
- `checklist-almacen-pilot` V2
- ACTIVE
- JWT obligatorio

UI:
- `migration/pilot/checklist-almacen-pilot.html`

RPC reutilizadas:
- `mv_checklist_listar`
- `mv_checklist_catalogo_herramientas`
- `mv_checklist_registrar`
- `mv_checklist_validar`

Funciones integradas:
- lectura por perfil;
- filtros por tipo/sede/cuadrilla/período;
- detalle completo;
- validación conforme a matriz:
  - Almacén: Materiales/Herramientas;
  - Supervisor: Unidad Vehicular/Documentación/EPP;
  - Jefatura Almacén: Materiales/Herramientas;
  - Jefatura: Unidad Vehicular/Documentación/EPP;
- exportación CSV.

No se creó un formulario recortado de registro V141.
El formulario completo tiene 5 tipos y numerosas evidencias/campos obligatorios; seguirá temporalmente en legacy hasta portar paridad completa.

Corrección de período:
- `mv_checklist_listar` no filtra por período nativamente;
- Edge V2 aplica período sobre la salida ya filtrada por alcance.

Estado actual:
- Sheets: 114;
- PostgreSQL: 114;
- septiembre PostgreSQL: 25;
- Chiclayo septiembre: 8.

## PEXT / Trabajos Conjunta
Edge existente actualizada:
- `pext-pilot` V2
- ACTIVE
- JWT obligatorio

UI:
- `migration/pilot/pext-pilot.html`

Funciones:
- listado;
- Bonos PEXT;
- registro Supervisor;
- tipos:
  - CONJUNTA PEXT
  - NORMALIZACION
  - ORDENAMIENTO
- 1 a 3 evidencias privadas;
- cálculo de puntos en backend;
- visto bueno Técnico;
- validación Jefatura;
- jornada validada;
- conformidad final.

No se reimplementó la fórmula en la UI; manda el backend V152/V517D.

### Drift detectado 20/09/2026
Fuente viva:
- TRABAJOS_CONJUNTA Sheets: 30
- PostgreSQL: 28

Diferencia:
- al menos 2 registros legacy nuevos desde la conciliación anterior.

Control maestro actualizado:
- `PEXT_CONJUNTA.status = REQUIERE_RESYNC_FINAL`
- `content_match=false`
- `requires_final_resync=true`

Migración:
- `118_pext_live_drift_20260920.sql`

Por seguridad no se copiaron automáticamente esas filas privadas desde Drive/Sheets hacia Supabase mediante conectores.

PostgreSQL actual:
- total 28;
- septiembre: 1.

La UI muestra advertencia de convivencia y no debe utilizarse como operación oficial paralela a Sheets antes del cutover.

## Plantilla de Orden
Backend existente:
- `plantilla-orden-pilot` V2
- ACTIVE
- JWT obligatorio

UI:
- `migration/pilot/plantilla-orden-pilot.html`

Funciones:
- búsqueda por:
  - código de cliente;
  - DNI;
  - código de orden;
  - código de pedido;
- alcance según perfil;
- generación de plantilla textual;
- copiar plantilla;
- búsqueda CTO cercanas cuando existen coordenadas;
- solo lectura.

## Shell
Rutas añadidas:
- ACTIVIDAD CAMPO
- CHECKLIST ALMACEN
- PEXT
- PLANTILLA ORDEN

Todos reutilizan:
- una sesión Supabase;
- `app_permissions`;
- `shell-embed.js`.

## Cobertura UI actual

### JEFATURA
- módulos visibles: 21
- integrados: 18
- pendientes: 3

Pendientes:
- ADMINISTRACION
- ANALISIS ECONOMICO
- FACTURAS

### SUPERVISOR
- módulos visibles: 17
- integrados: 16
- pendiente: 1

Pendiente:
- FACTURAS

## QA
Sintaxis:
- shell
- Actividad Campo
- Checklist Almacén
- PEXT
- Plantilla Orden

Resultado:
- 5/5 correcto.

Edge Functions:
- actividad-campo-pilot V2 ACTIVE / JWT
- checklist-almacen-pilot V2 ACTIVE / JWT
- pext-pilot V2 ACTIVE / JWT
- plantilla-orden-pilot V2 ACTIVE / JWT

## Producción
Sin cambios en:
- `main`;
- Apps Script;
- Google Sheets;
- Google Drive;
- GitHub Pages productivo.

## Próximo bloque
Prioridad:
1. FACTURAS
2. ANALISIS ECONOMICO
3. ADMINISTRACION

Después:
- ampliar Auth a perfiles adicionales;
- cerrar formularios complejos de Actividad/Checklist;
- completar resync final de fuentes vivas;
- ensayo de cutover.
