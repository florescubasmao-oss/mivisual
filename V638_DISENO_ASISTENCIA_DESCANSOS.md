# V638 — Asistencia integrada con Programación de Descansos (fase de diseño protegido)
Fecha: 2026-10-17. Rama aislada. NO publicar en main sin validación.

## Fuente y momento de corte
- Únicamente cargas de MAPA OPERATIVO completadas después de las 08:20 hora Perú (hora de IMPORTACIÓN real, no hora de descarga).
- Fuente: MAPA_ORDENES. Claves ORDEN_ID, CUADRILLA, REGION, FECHA_SOLICITUD, HORA_SOLICITUD, FECHA_INICIO_VISITA, ESTADO, FECHA_IMPORTACION.
- Tomar SOLO órdenes del tramo 08:00, primera FECHA_INICIO_VISITA válida de cada cuadrilla por día. El estado final nunca invalida un inicio: finalizada, cancelada, reprogramada, etc.
- FECHA_IMPORTACION no sustituye a FECHA_INICIO_VISITA. Si no hay fecha/hora de inicio, PV.
- La base actual NO tiene fecha/hora inequívoca de asignación WIN: no inferirla de FECHA_SOLICITUD; excepciones por asignación tardía se revisan manualmente.
- Se necesita garantizar en backend que una carga anterior a 08:20 no marque A/T/TD. Una carga posterior deberá recalcular de modo idempotente y conservar la primera hora de inicio válida y su orden de evidencia.

## Códigos para perfiles autorizados
- A verde: hora <=08:05:00
- T amarillo: 08:05:01..08:15:00
- TD naranja: >08:15:00
- F rojo: falta ratificada por supervisor, nunca por ausencia de orden de forma automática
- PV gris: pendiente de validación (sin orden/hora o asignación tardía planteada).
- D descanso azul; V vacaciones violeta; SA sin actividad turquesa.
- Perfil autorizado: TECNICO, SUPERVISOR, JEFATURA, GERENCIA, GERENCIA LIMA, GERENCIA GENERAL. Confirmar alias reales de perfiles en USUARIOS/PERMISOS_MODULOS; la autorización de lectura y acción se valida **también en backend** por usuario, sede y cuadrilla.
- Otros perfiles: mantienen estrictamente CAMPO y DESCANSO. Su API no debe entregar detalles de asistencia.

## Precedencia e historial
- Descansos, vacaciones y sin actividad registrados por supervisor no se pisan con importaciones; inconsistencias con una orden iniciada se marcan para revisión.
- Campo Bolsa desaparece de elecciones y recuadros NUEVOS, pero se mantienen las filas históricas y se respeta su interpretación existente en informes hasta migración verificada.
- La programación de descanso, aprobaciones, cobertura y solicitudes del técnico existentes no se reescriben.
- Conservar auditoría para F/PV (motivo, supervisor, hora, cuadrilla, fecha, estado anterior y nuevo).

## Optimización sugerida
- Snapshot compacto ASISTENCIA_DIARIA por fecha+cuadrilla, no cálculo sobre todo MAPA_ORDENES en cada render.
- Indexar fecha/cuadrilla durante importación posterior a las 08:20; consolidación incremental y operación idempotente.
- Lectura por periodo/perfil/alcance mediante ruta GET separada con caché corta; no agregar coste al módulo de otros perfiles.
- La UI de descansos nunca bloqueará si falla asistencia: fallback a programación original.

## Validaciones antes de desplegar
1. Comparar importaciones antes/después 08:20, zona horaria America/Lima.
2. Probar primera orden con varios estados, múltiples órdenes y múltiples cargas, mismas fechas e históricos.
3. Confirmar fechas de tramo vs inicio, casos sin FechaIniVisi, retrasos de carga y correcciones.
4. Probar PV por asignación tardía, F supervisor, auditoría y acceso restringido.
5. Probar conservación Descanso/Vacaciones/SA, Campo Bolsa histórico, coberturas, Excel y rol almacén/otros.
6. Paridad y tiempos de carga frente a main; rollback por rama.
7. Sin modificaciones de prod/backend/main hasta pasar pruebas y aprobación.

## Diagnóstico inicial del repositorio
- js/mapa_operativo.js importa FechaIniVisi como fechaInicioVisita; F.Soli y hora derivada como fechaSolicitud/horaSolicitud; no identifica hora de asignación.
- js/programacion_descansos.js mezcla personal y cuadrillas, contempla Campo Bolsa en pdNormalizarEstado, pdEtiquetaEstado, pdClaseDia, pdRenderConsultaOperativa, Excel.
- MAPA_ORDENES tiene FECHA_INICIO_VISITA, FECHA_IMPORTACION y HORA_SOLICITUD; PROGRAMACION_DESCANSOS registra ESTADO_DIA y aprobaciones.
- Diseño aquí documentado; NO se considera implementación concluida ni lista para probar.
