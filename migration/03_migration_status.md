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

## Avance de autenticación, permisos y API del piloto

- PERMISOS_MODULOS migrado: 267 reglas.
- CONFIG_MODULOS migrado: 2 configuraciones.
- ACCESOS migrado: 42 enlaces.
- app_users conserva metadatos, sin copiar contraseñas.
- Se detectaron 80 usuarios: 65 con correo informado, 15 sin correo; 13 de los correos informados no tienen formato válido para Auth.
- Se creó vínculo automático auth.users -> app_users por correo cuando exista coincidencia válida.
- app_users solo permite lectura del propio perfil mediante RLS.
- ordenes, catalogo_cto, permisos, configuraciones y enlaces permanecen bloqueados para acceso directo de anon/authenticated.
- Se desplegó Edge Function protegida: mapa-operativo-pilot (JWT obligatorio).
- Se desplegó pantalla aislada de prueba: mapa-pilot-web. No modifica producción.
- Consultas del piloto ya usan índices PostgreSQL y funciones RPC restringidas a service_role.
- Validación puntual: SETIEMBRE 2026 / CHICLAYO = 887 filas tanto en Google Sheets como en PostgreSQL.
- La búsqueda relacional de pedido que depende de otras fuentes legacy aún está marcada como pendiente antes de cualquier corte productivo.


## Actualización 18/09/2026 — Piloto Mapa Operativo

Validado con Auth real JEFZNORTE:
- login Supabase Auth: OK
- vínculo Auth -> app_users: OK
- perfil/permisos JEFATURA: OK
- catálogos PostgreSQL: OK
- búsqueda por ORDEN: OK
- búsqueda por PEDIDO: OK
- búsqueda por DNI: OK
- filtro 2026-09 + CHICLAYO: 887 / 887
- CTO cercanas: OK
- main / Apps Script productivo: SIN CAMBIOS

Pendiente para cierre total del piloto:
- validar alcance real de SUPERVISOR por cuadrillas: APROBADO (SUPCHICLAYO 841/841)
- prueba móvil
- definir tratamiento de calidad de datos CTO con sufijo `Latitud`
- relación Pedido -> Orden del Mapa: CERRADA en PostgreSQL; fallbacks de Actas/Actividad se migran con esos módulos


## Cierre funcional del piloto Mapa Operativo — 18/09/2026

Estado: **FUNCIONALMENTE CERRADO**

Aprobado:
- Auth JEFATURA
- Auth SUPERVISOR
- permisos y alcance por cuadrillas
- catálogos PostgreSQL
- búsqueda Orden / Pedido / DNI
- filtros período / sede / grupo / estado / cuadrilla
- CTO cercanas
- prueba móvil
- relación Pedido -> Orden sin dependencia legacy del módulo Mapa

Pendientes no bloqueantes:
- mejora visual de tabla móvil
- saneamiento controlado de códigos CTO con sufijo `Latitud`
- integración productiva futura cuando corresponda al plan de migración

`main`, Apps Script y Google Sheets productivos permanecen sin cambios.
