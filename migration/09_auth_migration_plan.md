# MI VISUAL — Plan de migración de autenticación
Fecha: 2026-09-18

## Problema heredado
El login actual del frontend consulta una publicación CSV del Sheet USUARIOS y compara la clave en el navegador. La nueva arquitectura no debe conservar este diseño.

## Datos de usuarios ya preparados
- 80 perfiles migrados a app_users
- 79 activos
- 65 con correo informado
- 15 sin correo
- 13 correos informados no cumplen formato estándar de email
- 0 correos duplicados entre los correos no vacíos

La columna Clave NO fue migrada a PostgreSQL.

## Diseño nuevo
- Supabase Auth administra credenciales y sesiones.
- app_users conserva metadatos operativos: usuario, cuadrilla, sede, plataforma, perfil, nivel y supervisor.
- auth_user_id relaciona Auth con app_users.
- Trigger seguro vincula automáticamente un usuario Auth con app_users cuando el correo coincide.
- RLS protege datos.
- El frontend puede seguir mostrando el nombre de usuario actual aunque internamente la sesión sea Supabase Auth.

## Transición
1. Probar primero con un usuario autorizado.
2. Validar perfil/permisos/alcance.
3. Definir mecanismo para usuarios sin correo o con correo inválido.
4. Migrar usuarios por lotes.
5. Retirar la dependencia del CSV público.
6. Invalidar/cambiar las credenciales heredadas después del corte.

No se retirará el login actual hasta que el nuevo inicio de sesión esté validado.
