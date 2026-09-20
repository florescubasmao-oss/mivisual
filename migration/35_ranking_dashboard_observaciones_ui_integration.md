# Integración UI — Ranking, Dashboard y Observaciones

Fecha: 20/09/2026
Rama: `migracion-supabase`
Producción `main`: sin cambios.

## Objetivo
Integrar dentro del shell único de MI VISUAL:
- Ranking
- Dashboard por perfil
- Observaciones / Penalidades

Sin crear aplicaciones separadas y sin recalcular históricos cerrados.

## Ranking
Nueva Edge Function compartida:
- `ranking-dashboard-pilot` V1
- ACTIVE
- JWT obligatorio

UI:
- `migration/pilot/ranking-pilot.html`

Características:
- selector de período;
- filtro de sede para perfiles con alcance zona;
- ranking regional/sede/plataforma según datos existentes;
- producción, efectividad, SLA, observaciones, recableado y VTR/GAR;
- puntaje final;
- exportación CSV;
- visualización del estado de frescura de las fuentes.

Reglas preservadas:
- pesos por período;
- julio/agosto históricos protegidos;
- septiembre vigente 50 / 20 / 5 / 5 / 5 / 15;
- no existe acción de recalcular históricos desde la UI.

Lectura actual septiembre:
- 33 cuadrillas total;
- 16 Chiclayo.

## Dashboard
Usa la misma Edge Function:
- `ranking-dashboard-pilot` V1

UI:
- `migration/pilot/dashboard-pilot.html`

Rutas de menú:
- `DASHBOARD JEFATURA`
- `DASHBOARD SUPERVISOR`

Características:
- KPIs consolidados por período;
- alcance dinámico por permiso;
- Jefatura: Zona Norte;
- Supervisor: sede;
- detalle bajo demanda para:
  - Producción
  - Efectividad
  - Recableado
  - VTR/GAR
  - Observaciones
  - SLA
- indicadores de frescura / resync pendientes.

Corrección UI aplicada:
- si Jefatura filtra una sede, las métricas superiores se recalculan sobre esa misma selección y no sobre el total Zona Norte.

Lectura actual septiembre:
- 33 cuadrillas total;
- 16 Chiclayo.

## Observaciones
Nueva Edge Function:
- `observaciones-pilot` V1
- ACTIVE
- JWT obligatorio

UI:
- `migration/pilot/observaciones-pilot.html`

RPC reutilizadas:
- `mv_observaciones_registrar`
- `mv_observaciones_actualizar_estado`
- `mv_observaciones_registrar_descargo`

Funciones:
- listado por período/estado/sede;
- búsqueda por ticket/cuadrilla/descripción;
- métricas económicas;
- registro Supervisor/Jefatura según permisos;
- cambio de estado según reglas portadas;
- descargo Técnico según su propia cuadrilla;
- enlaces de evidencias existentes;
- exportación CSV.

Almacenamiento:
- evidencia física continúa en Google Drive;
- esta UI no realiza upload de archivos;
- no se migró ni borró evidencia histórica.

Advertencia de convivencia visible:
- mientras la app legacy siga activa, una escritura del piloto va solo a PostgreSQL;
- no usar la pantalla como operación oficial paralela a Sheets antes del cutover.

## Conciliación Observaciones
Revalidación de conteo el 20/09/2026:
- Sheets: 78
- PostgreSQL: 78

Septiembre PostgreSQL:
- 21 observaciones
- S/ 4,130.00 monto total
- S/ 1,618.00 monto afectado

La igualdad 78/78 en esta revisión es de conteo; la última comparación completa de campos mutables sigue siendo la auditoría del 19/09/2026.

## Alcance por perfil
Permisos vigentes:

### JEFATURA
- Ranking: Zona Norte
- Dashboard Jefatura: Zona Norte
- Observaciones: ver/registrar/editar, Zona Norte

### SUPERVISOR
- Ranking: Sede
- Dashboard Supervisor: Sede
- Observaciones: ver/registrar/editar, Sede

### TECNICO
- Ranking: propia cuadrilla
- Observaciones: propia cuadrilla + descargo
- Dashboard de Jefatura/Supervisor: sin acceso

## Shell
Rutas añadidas:
- RANKING -> `ranking-pilot.html`
- DASHBOARD JEFATURA -> `dashboard-pilot.html`
- DASHBOARD SUPERVISOR -> `dashboard-pilot.html`
- OBSERVACIONES -> `observaciones-pilot.html`

Todos reutilizan:
- una sesión Supabase;
- `app_permissions`;
- `shell-embed.js`.

## Cobertura UI después de este bloque
JEFATURA:
- visibles: 21
- integrados: 14
- pendientes UI: 7

SUPERVISOR:
- visibles: 17
- integrados: 12
- pendientes UI: 5

## QA
Sintaxis validada:
- shell
- Ranking
- Dashboard
- Observaciones

Resultado: 4/4 correcto.

Edge Functions:
- ranking-dashboard-pilot: ACTIVE / JWT
- observaciones-pilot: ACTIVE / JWT

## Frescura / resync
Ranking y Dashboard muestran explícitamente el estado de fuentes.

Continúan con resync obligatorio antes de cutover, entre otras:
- MAPA_OPERATIVO
- PRODUCCION
- EFECTIVIDAD
- RECABLEADO
- VALIDACION_TECNICA
- PROGRAMACION_DESCANSOS

Por tanto:
- UI integrada != datos finales de cutover;
- no se debe declarar equivalencia definitiva mientras las fuentes legacy sigan cambiando.

## Producción
No se modificó:
- `main`
- Apps Script
- Google Sheets
- Google Drive
- GitHub Pages productivo

## Próximo bloque recomendado
Revisar los módulos visibles aún pendientes de UI por perfil y priorizar:
1. Actividad en Campo
2. Checklist Almacén
3. PEXT
4. Plantilla Orden
5. Facturas
6. Análisis Económico / Administración según perfil

En paralelo continuar con resync seguro de fuentes vivas.
