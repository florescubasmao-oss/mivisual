# Host temporal de QA Supabase — 20/09/2026

## Objetivo

Permitir visualizar el MI VISUAL integrado mientras el deploy Netlify continúa bloqueado por DNS/npm en el entorno local.

## Implementación

Edge Function:
- mi-visual-pilot-web
- V1 ACTIVE
- verify_jwt=false intencionalmente porque solo sirve archivos frontend públicos;
- no contiene service role;
- no consulta tablas;
- no entrega datos operativos;
- sirve archivos estáticos desde la rama pública migracion-supabase.

Los Edge de datos continúan con JWT obligatorio.

URL base:
https://uudvodiaizfarodjpetb.supabase.co/functions/v1/mi-visual-pilot-web/

## QA externo

Workflow:
.github/workflows/qa-supabase-pilot-host.yml

Run:
35560642372

Resultado:
SUCCESS

Validó:
- shell MI VISUAL integrado;
- ruta Administración;
- administracion-control.js;
- Resync Final;
- botón Capturar Mapa vivo;
- botón Capturar Actas vivas.

## Recuperación

Se cambiaron rutas locales de recuperación para volver al shell integrado.
El correo de recuperación continúa usando el redirect oficial configurado en Netlify hasta el cutover de hosting.

## Alcance

Este host es QA temporal, no reemplaza el dominio productivo ni el deploy Netlify actual.
