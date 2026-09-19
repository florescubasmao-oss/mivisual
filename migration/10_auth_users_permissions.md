# MI VISUAL — Auth, usuarios y permisos

Fecha de corte: 18/09/2026  
Rama: `migracion-supabase`  
Producción `main`: sin cambios

## Arquitectura definida

- Supabase Auth gestiona credenciales nuevas.
- `public.app_users` conserva identidad operativa, perfil, sede, cuadrilla y vínculo `auth_user_id`.
- `public.app_permissions` conserva permisos por perfil y módulo.
- El navegador nunca recibe service role / secret.
- Alta de accesos se hace por Edge Function protegida con JWT.
- La función general es `auth-admin-pilot`.
- Autorización de administración: módulo `ADMINISTRACION` con `activo=true`, `ver=true` y `administrar=true`.
- Registro público de Supabase Auth permanece desactivado.
- Inicio anónimo permanece desactivado.
- No se migran ni almacenan contraseñas legacy en texto plano.

## Inventario actual

- usuarios metadata: 80
- activos: 79
- Auth vinculados: 2
- sin correo: 15
- correo no válido para alta Auth: 14
- correos duplicados: 0

Vinculados y validados:
- `JEFZNORTE` — JEFATURA
- `SUPCHICLAYO` — SUPERVISOR

## Integridad

`app_users` dispone de:
- usuario único
- auth_user_id único
- correo único no vacío por `lower(trim(correo))`
- RLS habilitado
- lectura directa authenticated limitada al propio `auth_user_id`

`app_permissions`:
- RLS habilitado
- acceso operativo administrado por API/Edge Function

## Vinculación Auth -> app_users

Trigger activo:
- `mv_link_auth_user_after_insert`

Función:
- `public.mv_link_auth_user()`
- SECURITY DEFINER
- EXECUTE restringido a postgres/service_role
- vincula por correo normalizado

## Administración controlada

Edge Function `auth-admin-pilot`:
- `contextoAuthAdmin`
- `resumenAuthMigracion`
- `listarUsuariosAuth`
- `crearAccesoAuth`

Reglas de alta:
1. el actor debe estar autenticado y activo;
2. debe tener permiso `ADMINISTRACION.administrar=true`;
3. el usuario objetivo debe existir en `app_users`;
4. debe estar ACTIVO;
5. debe tener correo válido;
6. no se crea duplicado si ya tiene `auth_user_id`;
7. Auth se crea con correo confirmado de forma administrativa;
8. el trigger debe vincular el UUID a `app_users`;
9. si la vinculación falla, el alta Auth se revierte;
10. la contraseña temporal nunca se registra en auditoría.

## Auditoría

Tabla: `public.auth_access_audit`

- RLS habilitado
- sin grants para anon/authenticated
- escritura mediante service role desde Edge Function
- registra actor, objetivo, acción, resultado y metadata no sensible
- no registra contraseñas

## Pendientes antes del corte de Auth

- validar la pantalla nueva con JEFZNORTE;
- confirmar que `SUPERVISOR` no pueda abrir administración;
- definir/corregir correos de los usuarios sin correo o con correo inválido antes de crearles Auth;
- planificar cambio de contraseña inicial / recuperación para despliegue general.

## Regla de migración

No crear Auth masivamente para usuarios con correo faltante/inválido y no inventar correos. La metadata operativa se conserva intacta hasta validación del dato.
