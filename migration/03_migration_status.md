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

## Producción actual

No se modificó la rama main ni se cambió la aplicación productiva.
Toda la preparación de código está en:

migracion-supabase

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
