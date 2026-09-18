# MI VISUAL — Requisitos Maestros de Migración
Fecha de consolidación: 2026-09-18
Rama de trabajo: migracion-supabase
Alcance: MI VISUAL Zona Norte / APP CUADRILLAS WIN

Este documento consolida las reglas, módulos, dependencias y restricciones históricas que deben preservarse durante la migración a Supabase/PostgreSQL. No sustituye las pruebas contra producción: sirve como checklist obligatorio para evitar omisiones.

## 1. Arquitectura vigente que NO se corta todavía

- Frontend: GitHub Pages (HTML/CSS/JS)
- Backend: Google Apps Script Web App
- Datos: Google Sheets
- Evidencias/PDF: Google Drive
- Notificaciones históricas: Telegram en algunos flujos
- Libro maestro Zona Norte: APP CUADRILLAS WIN
- ID maestro: 1WuKWc7Javfv8rRMOTVvsH6sJSH2mvbTZoTiIUpt-MQM
- Repositorio frontend: florescubasmao-oss/mivisual
- Rama productiva: main
- Rama de migración: migracion-supabase

Regla: main y la Web App productiva no se sustituyen hasta validar equivalencia funcional y de datos.

## 2. Fuentes y sistemas que NO deben confundirse

### MI VISUAL Zona Norte
Es el sistema que se está migrando.

### MI VISUAL LIMA
Proyecto separado. No mezclar su esquema, usuarios, permisos ni datos con Zona Norte salvo decisión expresa posterior.

### CONTROL DE HERRAMIENTAS
Sistema independiente. Puede compartir usuarios/cuadrillas/sedes, pero no debe ser absorbido ni modificado accidentalmente por la migración de MI VISUAL.

### AppSheet / prototipos anteriores
Son superficies históricas/legacy que deben inventariarse antes de retirarse. No asumir que siguen siendo fuente oficial.

## 3. Regla general de desarrollo

- Cambios incrementales.
- No romper módulos existentes.
- No eliminar históricos.
- No reescribir lógica vigente sin equivalencia comprobada.
- No publicar cambios masivos sin pruebas.
- Crear primero entorno de prueba.
- Comparar sistema viejo vs nuevo.
- Mantener rollback.
- Conservar evidencia de cada versión/cambio.
- El usuario no programa: la implementación técnica debe ser ejecutada por el asistente siempre que las herramientas lo permitan.

## 4. Reglas históricas de períodos

- Cada mes debe quedar separado.
- Cargas de un período no pueden borrar otro período.
- JULIO 2026 quedó congelado y protegido.
- AGOSTO 2026 tuvo cierre/reconciliación especial; no recalcularlo ni sobrescribirlo sin una corrección expresa.
- La fuente oficial para reconciliación operativa es WIN / MAPA_ORDENES.
- Partner es auxiliar/comparativo; nunca reemplaza WIN ciegamente.
- En reportes históricos, el usuario debe poder seleccionar período antes de descargar/comparar.
- Bonos y producción deben conservar períodos anteriores.
- Deben mantenerse snapshots/rollback donde actualmente existan.

## 5. Fuente operacional y reglas de órdenes

### MAPA_ORDENES
Fuente operativa principal para órdenes.

Reglas consolidadas:
- ORDEN_ID es identificador principal.
- Una nueva carga de la misma orden actualiza la existente.
- No duplicar una orden por recarga.
- No retroceder el estado con una versión más antigua.
- Preservar valores anteriores cuando la nueva carga venga incompleta, según lógica vigente.
- Conservar histórico aunque una orden desaparezca de una descarga posterior.
- Usar fecha/hora más reciente para resolver versión.
- La carga debe conservar información necesaria para Producción, VTR/GAR, Actas, Dashboard y demás módulos.

Filtros históricos del Mapa:
- período
- sede
- fecha
- grupo de trabajo
- estado
- cuadrilla
- código de orden
- pedido / código cliente cuando aplique
- DNI
- visualización CTO

Grupos de trabajo relevantes:
- INSTALACIONES
- RECABLEADOS - VISITA TECNICA
- TRASLADOS
- POSTVENTA / EQUIPOS ADICIONALES
- DESCARTES Y MEJORAS TECNOLOGICAS
- ULTIMA MILLA / OTRAS ATENCIONES
- VTR Y GAR

## 6. Producción / Base Operativa

Hitos que deben preservarse:
- V2.12: carga universal + UPSERT histórico.
- V2.13.5: histórico rápido.
- V275: Base Operativa unificada.
- V486: reconstrucción por período sin arrastrar registros antiguos.
- V487+: Producción basada en WIN con Partner solo auxiliar.
- V503/V517D y posteriores: publicación integrada con indicadores y control GAR/VTR.
- V521.1: prevalidación de reglas/partidas antes de publicar.

Reglas:
- WIN es fuente oficial.
- Solo FINALIZADAS cuentan para Producción oficial cuando corresponda.
- Canceladas, anuladas, regestiones y agendadas no deben entrar como producción finalizada.
- No alterar catálogo de partidas/puntajes durante migración.
- No hacer sumas/restas ciegas.
- Evitar duplicación y acumulación al republicar.
- Mantener correcciones manuales validadas.
- Publicación debe abortar cuando existan casos dudosos que la lógica vigente marque como bloqueantes.
- Debe existir idempotencia: repetir la misma carga/publicación no debe duplicar resultados.

## 7. Partidas / puntajes

Preservar:
- catálogo oficial de partidas y puntos.
- reglas V513 y derivados.
- AJUSTES_PARTIDA_WIN.
- REGLAS_PARTIDA_WIN.
- simulaciones/prevalidaciones antes de publicación.
- correcciones puntuales como UM y otros casos ya validados.
- no cambiar partida/puntaje por inferencia insegura.

## 8. VTR / GAR — regla crítica bidireccional

Fuente de decisión:
- WIN detecta/candidatea.
- VALIDACION_TECNICA confirma clasificación.
- JEFZNORTE tiene la capacidad de validar/modificar casos según la configuración vigente; otros perfiles tienen alcance limitado/lectura según permisos.
- Técnico puede registrar donde corresponda.

Reglas consolidadas:
- SÍ GAR/VTR: retirar de Producción normal cuando corresponde.
- NO ES GAR/VTR: restaurar Producción normal si la orden está FINALIZADA y el vínculo es seguro.
- Nunca permitir simultáneamente Producción normal y GAR/VTR para la misma orden.
- No inventar tickets desde nombres de producto.
- Cruzar por orden/código y decisiones validadas.
- Preservar decisiones anteriores.
- PROPIA y ASIGNADA tienen tratamiento distinto.
- ASIGNADA confirmada suma según regla vigente.
- PROPIA depende de BONO / NO BONO.
- NO BONO no debe sumar incentivo.
- RESERVA queda pendiente hasta resolución posterior.
- El indicador puede usar ventana de últimos 30 días según lógica vigente.
- Atribuir al ejecutor real, no a una cuadrilla incorrecta.
- Mantener la opción manual “NO ES GAR/VTR”.

## 9. Ranking

No migrar solo el valor final; migrar la lógica y su trazabilidad.

Pesos vigentes posteriores:
- Producción 40%
- Efectividad 20%
- SLA 10%
- Observaciones 10%
- Recableado 10%
- VTR/GAR 10%

Históricamente existieron pesos anteriores; no usar valores antiguos para períodos nuevos.

Debe preservarse:
- ranking por período.
- continuidad de cuadrillas.
- reglas de homologación/continuidad cuando cambian códigos de cuadrilla.
- indicadores de apoyo.
- histórico.
- recalcular solo después de cargas válidas.

## 10. Efectividad

- Mantener carga por período.
- No borrar meses previos.
- Mantener atribución correcta por cuadrilla.
- Mantener relación con Producción/Ranking.
- No modificar retroactivamente históricos cerrados salvo corrección expresa.

## 11. Recableado

- Mantener porcentaje por cuadrilla/período.
- Mantener relación con Ranking.
- No mezclar con VTR/GAR aunque históricamente hayan compartido pantalla/código.
- Las descargas/informes deben respetar permisos.

## 12. SLA

- Preservar SLA_ORDENES_RESUMEN y excepciones vigentes.
- No modificar reglas SLA durante la migración salvo auditoría específica.
- Mantener relación con Ranking y Dashboard.

## 13. Validación Técnica

Este es un módulo crítico y un cuello de botella histórico.

Preservar:
- registros y estados.
- vínculo con VTR/GAR.
- timeout de “Sin respuesta” / cierre automático según lógica vigente.
- clasificación manual.
- búsquedas por DNI/código.
- segmentación.
- historial.

Problema a eliminar:
- procesarValidacionesTecnicasVencidas ha fallado repetidamente por:
  - límite de ejecución de Apps Script
  - concurrencia de triggers
  - errores internos/servidor
  - timeouts del servicio Spreadsheet

En Supabase, este proceso debe rediseñarse sin depender de escanear Sheets en cada ejecución.

## 14. Mapa Operativo

Piloto de migración.

Preservar:
- filtros.
- búsqueda puntual por código.
- carga Excel.
- deduplicación/upsert.
- estado más reciente.
- CTO.
- catálogo CTO.
- navegación Google Maps.
- colores/identificación por estado y cuadrilla.
- opción de CTO cercanas.
- histórico mensual.

Objetivo nuevo:
- consulta SQL indexada.
- no descargar miles de filas al navegador.
- cargar por filtros y, para mapa, por viewport cuando corresponda.

## 15. CTO / Catálogo CTO

Preservar:
- código CTO
- coordenadas
- sede
- primera detección
- última actualización
- orden referencia
- cliente
- tipo de trabajo
- puerto
- usuario actualización
- veces detectada

No perder primera detección al actualizar.

## 16. Actas

Dependencias actuales:
- MAPA_ORDENES
- PRODUCCION_APP
- Drive
- validaciones de estado
- PDFs
- trazabilidad

Preservar:
- consulta automática por orden.
- datos de cliente/cuadrilla.
- carga de PDF.
- IDs.
- historial.
- descarga por período.
- múltiples trabajos cuando aplique.
- observaciones/material errado.
- confirmación idempotente.
- si una subida queda incierta, no duplicar el registro por reintento ciego.

Drive continuará como almacenamiento inicial durante la migración.

## 17. Observaciones y penalidades

Preservar campos:
- sede
- plataforma
- fecha
- ticket
- DNI
- código
- cuadrilla
- observación
- estado
- fuente
- monto
- descargo
- evidencia

Estados:
- Derivado
- En Proceso
- Penalizado
- Subsanado

Fuentes históricas:
- WIN
- LAUS/App
- Correo

Debe mantenerse histórico por sede/cuadrilla, descargos y evidencias en Drive.

## 18. Actividad en Campo

Preservar:
- registro de actividades.
- evidencias.
- galería.
- asignaciones.
- privacidad/alcance por técnico/supervisor.
- relación con órdenes y cuadrillas cuando aplique.

## 19. Programación de Descansos

Preservar:
- programación.
- validación.
- estados aprobados.
- efecto sobre metas/proyección donde corresponda.
- lectura rápida/cache de la lógica vigente.
- permisos por perfil.

## 20. Checklist / Almacén

Preservar:
- checklist mensual.
- registro al finalizar jornada o al inicio del día siguiente.
- confirmación.
- lectura rápida.
- histórico por período.

## 21. Bonos y Producción valorizada

Preservar:
- reglas de valorización.
- tarifas/catálogo vigente.
- proyección/metas.
- descansos aprobados.
- bonos de supervisores.
- PEXT.
- producción valorizada por período.
- no usar una hoja derivada desactualizada como fuente cuando existe una fuente operacional más reciente.

## 22. Dashboard / Resúmenes

Debe leer una fuente única o vistas derivadas consistentes.

Evitar el problema histórico:
- MAPA actualizado
- PRODUCCION_APP atrasado
- ANALISIS_ECONOMICO con otro corte
- Dashboard con otro resultado

Preservar:
- resumen por período
- trabajos diarios
- cumplimiento diario
- indicadores
- sello/fecha de actualización
- vistas Supervisor/Jefatura según permisos

## 23. Accesos, perfiles y permisos

Modelo histórico:
- permisos dinámicos por módulo/acción.
- el mismo perfil puede tener acciones diferentes según configuración.
- acciones como VER, REGISTRAR, EDITAR, APROBAR, ANULAR, DESCARGAR, ADMINISTRAR.
- scopes/alcances por sede/cuadrilla/supervisión.
- Técnico: alcance restringido.
- Supervisor: cuadrillas asignadas / sede según reglas.
- Jefatura/Admin: alcance ampliado.
- descargas requieren permiso DESCARGAR donde aplique.
- mantener trazabilidad de accesos.

Sesión histórica:
- duración aproximada 6 horas.
- prefijos MVL_SESSION_ / MVL_PWD_ en legado.

Migración:
- no migrar contraseñas en texto plano.
- usar Supabase Auth.
- app_users solo guarda metadatos/perfil/alcance.
- asociar usuario de Auth mediante auth_user_id.

## 24. Seguridad y control de acceso

Obligatorio:
- Row Level Security en tablas expuestas.
- nunca exponer service_role/secret keys en GitHub o navegador.
- frontend solo puede usar publishable key + RLS.
- operaciones administrativas sensibles deben ir por backend/Edge Function o políticas controladas.
- registrar auditoría de cambios importantes.

## 25. Evidencias / Drive

Drive seguirá inicialmente para:
- PDF de actas
- fotos
- evidencias
- descargos

Reglas históricas:
- evidencias con tamaño controlado.
- evitar duplicar guardados.
- conservar nombres/relación con cuadrilla/código/fecha cuando aplique.
- migrar referencia/URL/ID a PostgreSQL, no necesariamente mover el archivo.

## 26. Concurrencia e idempotencia

Problemas históricos:
- múltiples ejecuciones Apps Script simultáneas.
- ScriptLock.
- timeouts.
- POST con respuestas HTML/redirecciones.
- reintentos que podían duplicar operaciones.

Nueva arquitectura debe garantizar:
- UPSERT con claves únicas.
- transacciones.
- constraints.
- jobs sin solapamiento.
- escritura idempotente.
- estados de importación.
- trazabilidad de errores.

## 27. Cachés y Service Worker

El frontend actual usa cache busting/versionado y service worker.

Durante migración:
- no asumir que actualizar un JS invalida todos los clientes.
- controlar versiones de assets.
- evitar caché de respuestas operativas sensibles.
- separar recursos estáticos de API.

## 28. Descargas / Excel / reportes

Preservar:
- informes por período.
- Excel de Validación Técnica / GAR-VTR.
- informes gerenciales.
- ranking.
- observaciones.
- actas.
- producción/valorización.
- permisos DESCARGAR.

El reporte se puede generar desde PostgreSQL, pero el resultado funcional debe coincidir con el sistema vigente.

## 29. Capacitación / Biblioteca

Preservar como módulo.
No debe bloquear ni degradar los módulos operativos.
Incluye minicursos interactivos, contenido, evaluación y biblioteca.

## 30. Otros módulos identificados a inventariar antes de migrar

- Seguridad
- Equipos Averiados
- Asignaciones de Campo
- Bonos
- Bono Supervisores
- Facturas
- Consultas/Reclamos
- Plantilla de Orden
- Trabajos Conjunta
- Informe Gerencial
- Mi Desempeño
- PEXT
- Permisos de módulos

## 31. Reglas operativas que afectan la app

Aunque no todas son reglas de base de datos, deben conservarse donde el sistema las muestra/valida:
- inicio de jornada.
- EPP.
- ATS/PETAR.
- certificación WIN.
- técnico no certificado no debe salir a campo.
- metas y límites operativos.
- auditorías.
- bonos y penalidades.
- descansos.
- fechas/horarios en hora Perú.

## 32. Autoridad de fuentes para la migración

Orden de confianza:
1. Sistema productivo actual y datos reales.
2. Code.gs V560 desplegado/última versión entregada.
3. Reglas vigentes cerradas en chats/archivos.
4. GitHub frontend actual.
5. Copias/patches históricos solo como referencia.

Advertencia:
El Code.gs alojado en GitHub puede estar atrasado respecto al Apps Script desplegado. No debe usarse como única fuente para reconstruir la lógica actual.

## 33. Condiciones de aceptación antes de cambiar producción

Un módulo solo puede pasar a Supabase cuando:
1. conteos coincidan.
2. búsquedas coincidan.
3. filtros coincidan.
4. estados coincidan.
5. históricos coincidan.
6. permisos coincidan.
7. descargas coincidan.
8. no haya duplicados.
9. no se alteren meses cerrados.
10. exista rollback.
11. seguridad revisada.
12. rendimiento sea igual o mejor.
13. pruebas en móvil y PC.
14. usuario valide funcionalmente.

## 34. Orden de migración recomendado

1. Mapa Operativo + CTO
2. Usuarios/Auth/Permisos
3. Producción/Base Operativa
4. Análisis Económico/Producción Valorizada
5. Efectividad
6. Recableado
7. VTR/GAR + Validación Técnica
8. Ranking + SLA + Dashboard
9. Actas
10. Observaciones
11. Descansos
12. Actividad Campo / Checklist
13. Bonos / PEXT / Informes
14. módulos auxiliares restantes

Este orden puede ajustarse por dependencia, pero no se omitirán módulos.

## 35. Exclusiones explícitas actuales

- No tocar MI VISUAL LIMA dentro de esta migración.
- No migrar/controlar CONTROL DE HERRAMIENTAS como parte de MI VISUAL Zona Norte.
- No borrar Sheets actuales.
- No mover masivamente archivos de Drive en la primera etapa.
- No publicar frontend Supabase en main hasta terminar piloto.
- No copiar contraseñas actuales a PostgreSQL.
