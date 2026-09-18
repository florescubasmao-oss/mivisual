# Fase 0.1 — Inventario Mapa Operativo

Fecha: 2026-09-18
Fuente revisada: frontend actual de MI VISUAL + backend V560 entregado/implementado.
Objetivo: documentar el comportamiento vigente antes de migrarlo.

## Estado actual

El Mapa Operativo usa Google Apps Script y Google Sheets.

Frontend principal:
- js/mapa_operativo.js

Acciones actuales detectadas:
- GET catalogosMapaOperativo
- GET listarMapaOperativo
- GET listarCtosCercanasMapaOperativo
- POST importarMapaOperativo

Fuente principal:
- MAPA_ORDENES

Catálogo auxiliar:
- CATALOGO_CTO

## MAPA_ORDENES — 37 campos vigentes

1. ORDEN_ID
2. TIPO_TRABAJO
3. FECHA_SOLICITUD
4. HORA_SOLICITUD
5. CLIENTE
6. TIPO
7. PRODUCTO_ORIGEN
8. CUADRILLA
9. ESTADO
10. DIRECCION
11. DIRECCION_ADICIONAL
12. FECHA_ULTIMO_ESTADO
13. PRODUCTO_SERVICIO
14. REGION
15. CODIGO_CLIENTE
16. NUMERO_DOCUMENTO
17. TELEFONO_MOVIL
18. TELEFONO_FIJO
19. FECHA_FIN_VISITA
20. FECHA_INICIO_VISITA
21. MOTIVO_CANCELACION
22. MOTIVO_FINALIZACION
23. MOTIVO_ANULACION
24. LATITUD
25. LONGITUD
26. DETALLE
27. FECHA_IMPORTACION
28. USUARIO_IMPORTACION
29. CTO_1
30. COORDENADA_CTO_1
31. CTO_2
32. COORDENADA_CTO_2
33. CTO_3
34. COORDENADA_CTO_3
35. CTO
36. PUERTO
37. CODIGO_SEGUIMIENTO

## Regla de identidad / actualización vigente

ORDEN_ID es la clave principal.

Una nueva carga de la misma ORDEN_ID actualiza la fila existente incluso si cambia la fecha o se completan horas.

La versión de estado más reciente se decide por FECHA_ULTIMO_ESTADO. Una carga antigua no debe hacer retroceder una orden que ya tenga una versión más reciente.

La importación conserva valores anteriores cuando la nueva carga viene vacía.

## Filtros actuales

- período
- sede
- fecha
- grupo de trabajo
- estado
- cuadrilla
- código de orden
- código de pedido
- DNI

Grupos de trabajo vigentes:
- INSTALACIONES
- RECABLEADOS - VISITA TECNICA
- TRASLADOS
- POSTVENTA / EQUIPOS ADICIONALES
- DESCARTES Y MEJORAS TECNOLOGICAS
- ULTIMA MILLA / OTRAS ATENCIONES
- VTR Y GAR

## Problema estructural actual

Aunque V395 optimiza la lectura de Sheets leyendo primero columnas de filtro y luego filas completas, cada consulta todavía depende de Google Sheets y Apps Script.

La consulta evalúa filas de MAPA_ORDENES para resolver filtros. A medida que crece la hoja, el costo de lectura y procesamiento aumenta y puede competir con otros módulos del mismo Apps Script.

## Objetivo en PostgreSQL

La misma consulta debe resolverse mediante índices SQL, sin descargar ni recorrer toda la base.

Ejemplos:
- orden_id = ?
- numero_documento = ?
- codigo_cliente = ?
- sede + fecha_solicitud
- cuadrilla + fecha_solicitud
- estado + fecha_solicitud
- grupo_trabajo + fecha_solicitud

## Regla de migración

No se modifica main ni producción durante el piloto.

La nueva base se validará en paralelo con la actual y solo se publicará cuando:
1. conteos coincidan,
2. búsquedas coincidan,
3. filtros coincidan,
4. estados recientes coincidan,
5. importaciones no generen duplicados.
