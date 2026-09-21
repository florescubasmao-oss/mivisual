# Checkpoint Administración completa — 20/09/2026

Estado: **UI Y CONTROLES ADMINISTRATIVOS INTEGRADOS EN MIGRACIÓN / SIN CUTOVER PRODUCTIVO**

## Alcance cerrado

El módulo Administración del piloto cubre las cinco funciones principales del módulo productivo:

1. Base Operativa
   - staging
   - conciliación
   - versión migrada
   - rollback
2. Calificación VTR/GAR
   - reutiliza Validación Técnica migrada
3. Catálogo de Partidas
   - consulta PostgreSQL
   - 33 partidas al corte
4. Usuarios/Auth
   - 80 usuarios
   - 79 activos
   - 2 vinculados a Supabase Auth
   - edición operativa individual
   - provisión Auth gradual existente
5. Ranking
   - configuración por período
   - septiembre 2026: 50 / 20 / 5 / 5 / 5 / 15
   - históricos anteriores a septiembre protegidos
   - refresco de cache después de cambio

Además:
- matriz de 297 permisos editable por fila existente;
- protección para no retirar acceso de Administración al propio perfil;
- auditoría de cambios en usuarios, permisos y Ranking;
- no se permite cambiar correo desde este panel cuando el usuario ya está vinculado a Auth.

## SQL / Edge / UI

SQL:
- 142_administracion_controles_migrados.sql
- 143_administracion_ranking_generated_total_fix.sql

Edge:
- administracion-control-pilot V1 ACTIVE / JWT obligatorio
- auth-admin-pilot V2 ACTIVE / JWT obligatorio

UI:
- administracion-pilot.html
- administracion-control.js
- shell actualizado: ADMINISTRACION sin etiqueta PARCIAL.

## QA

- sintaxis shell: OK
- sintaxis administracion-pilot.html: OK
- sintaxis administracion-control.js: OK
- usuarios: 80
- activos: 79
- Auth vinculados: 2
- permisos: 297
- catálogo partidas: 33
- cache Ranking septiembre: 33 cuadrillas
- QA transaccional usuarios/permisos/Ranking: OK con ROLLBACK
- protección histórico Ranking: OK
- autoprotección permiso Administración: OK
- eventos QA persistidos: 0

## Regla de coexistencia

Este cierre funcional **no significa cutover**. La app legacy continúa operativa y puede seguir cambiando Sheets. Antes del cambio productivo todavía se requiere:
- resync final de todas las fuentes vivas;
- ampliar Auth de forma controlada;
- publicar y validar el shell integrado;
- E2E móvil/PC;
- freeze de escrituras legacy y plan de rollback.

`main`, Apps Script, Sheets y Drive productivos no fueron modificados.
