# Migración MI VISUAL -> Supabase/PostgreSQL

Estado: INICIO DE MIGRACIÓN
Rama: migracion-supabase
Producción actual: no modificar durante Fase 0

## Objetivo
Migrar MI VISUAL de Google Sheets + Apps Script como backend operativo hacia una arquitectura con PostgreSQL/Supabase, manteniendo el frontend actual y Google Drive para archivos durante la primera etapa.

## Principios
1. No cortar producción.
2. No borrar ni reemplazar datos actuales.
3. Migración por módulos.
4. Comparación paralela viejo vs nuevo antes de publicar.
5. Mapa Operativo será el piloto.
6. Una sola fuente operacional para órdenes, producción y valorización.
7. Toda modificación nueva se prueba primero fuera de main.

## Arquitectura objetivo
Frontend GitHub Pages
  -> Supabase API
    -> PostgreSQL
  -> Google Drive (PDF/evidencias en primera etapa)

## Fase 0 - Inventario y diseño
- Levantar módulos frontend activos.
- Levantar hojas/tablas y columnas.
- Identificar lecturas y escrituras por módulo.
- Identificar claves operativas: orden, pedido, ticket, DNI, cuadrilla, sede, periodo.
- Diseñar modelo SQL.
- Diseñar perfiles y permisos.
- Definir importación inicial y sincronización temporal.

## Primer piloto: Mapa Operativo
Objetivo:
- Buscar por código sin descargar toda la base.
- Filtros por sede, fecha, cuadrilla, estado y pedido.
- Preparar índices SQL.
- Mantener el Mapa actual disponible hasta validar equivalencia.

## Módulos principales detectados en frontend
- Mapa Operativo
- Base Operativa / Producción
- Análisis Económico
- Dashboard
- Indicadores
- Ranking
- VTR/GAR
- Validación Técnica
- Actas
- Observaciones
- Actividad en Campo
- Programación de Descansos
- Checklist
- Bonos
- Seguridad
- Capacitación
- Asignaciones de Campo
- Equipos Averiados

## Riesgo técnico detectado
El repositorio contiene numerosas capas/patches históricos por módulo. La migración debe consolidar reglas vigentes antes de trasladarlas a SQL/API; no se migrarán parches obsoletos de forma mecánica.

## Siguiente paso
Construir inventario de fuentes de datos y dependencias del Mapa Operativo y diseñar las primeras tablas PostgreSQL.
