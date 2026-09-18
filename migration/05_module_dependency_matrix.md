# MI VISUAL — Matriz de Dependencias de Migración
Fecha: 2026-09-18

| Módulo | Fuente/Dependencia actual | Destino principal | Riesgo | Regla de corte |
|---|---|---|---|---|
| Mapa Operativo | MAPA_ORDENES, CATALOGO_CTO, Apps Script | PostgreSQL + API | Alto | Equivalencia total de filtros, búsqueda, CTO e importación |
| Usuarios/Accesos | USUARIOS, PERMISOS, MODULOS, sesión Apps Script | Supabase Auth + app_users + RLS | Crítico | Login/alcances iguales o más seguros |
| Producción | MAPA_ORDENES, PRODUCCION_APP, catálogo, reglas | PostgreSQL + vistas/funciones | Crítico | Cierres/históricos/partidas coinciden |
| Análisis Económico | Producción + catálogo + descansos | PostgreSQL vistas/funciones | Alto | Valorización diaria/mensual coincide |
| Efectividad | EFECTIVIDAD/Base Operativa | PostgreSQL | Alto | % por cuadrilla/período coincide |
| Recableado | PORCENTAJE REC/Base Operativa | PostgreSQL | Alto | % e histórico coinciden |
| VTR/GAR | MAPA, VALIDACION_TECNICA, bases VTR/GAR | PostgreSQL + reglas | Crítico | Bidireccionalidad sin doble conteo |
| Validación Técnica | Sheets + trigger vencimientos | PostgreSQL + job programado | Crítico | Sin timeouts, estados y vencimientos correctos |
| Ranking | Producción/Efectividad/SLA/Obs/Rec/VTRGAR | vista/materialización | Crítico | pesos y continuidad coinciden |
| SLA | SLA_ORDENES_RESUMEN/excepciones | PostgreSQL | Alto | SLA y excepciones iguales |
| Dashboard | múltiples hojas/resúmenes/caché | vistas API | Alto | mismo corte de datos para todos los widgets |
| Actas | MAPA, Producción, Drive, ACTAS_ESCANEADAS | PostgreSQL + Drive | Crítico | no duplicar PDF/registro; búsqueda rápida |
| Observaciones | OBSERVACIONES + Drive | PostgreSQL + Drive | Alto | estados/montos/descargos/histórico |
| Descansos | hojas de programación/cache | PostgreSQL | Medio/Alto | aprobaciones y efecto en metas |
| Actividad Campo | ACTIVIDAD_CAMPO + Drive | PostgreSQL + Drive | Medio/Alto | permisos/evidencias/galería |
| Checklist | CHECKLIST_ALMACEN | PostgreSQL | Medio | histórico mensual completo |
| Bonos | producción + reglas + históricos | PostgreSQL | Alto | cálculo y períodos coinciden |
| PEXT | producción/conjunta/reglas | PostgreSQL | Alto | puntos/bonos oficiales coinciden |
| Informes Excel | múltiples módulos | exportadores desde PostgreSQL | Medio | mismo contenido + permisos |
| Capacitación | frontend + biblioteca | mantener frontend / datos a migrar después | Bajo | sin impacto en operación |
| Seguridad | módulo propio + Drive/registro | PostgreSQL + Drive | Alto | trazabilidad y evidencias |
| Equipos Averiados | hoja completa / recepción | PostgreSQL | Medio | estados y recepción coinciden |

## Dependencias transversales

### Fechas y zona horaria
Toda fecha/hora operacional debe interpretarse en hora Perú. No mezclar UTC visible con fecha local de operación.

### Claves
- orden_id: clave única de orden.
- codigo_cto: clave única catálogo CTO.
- usuario: clave funcional heredada, luego asociada a auth_user_id.
- período: YYYY-MM para histórico.
- cuadrilla: debe contemplar continuidad/homologación histórica.

### Archivos
Los binarios continúan en Google Drive inicialmente. PostgreSQL guarda metadatos y referencias.

### Seguridad
Toda tabla pública expuesta por API debe tener RLS y políticas explícitas antes de habilitar acceso al frontend.

### Auditoría
Toda importación o cambio crítico debe guardar:
- usuario
- fecha/hora
- origen
- versión/lote
- resultado
- errores/rechazos
