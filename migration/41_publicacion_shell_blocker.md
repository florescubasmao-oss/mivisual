# Bloqueo de publicación Netlify — 20/09/2026

## Estado

La versión integrada actual del piloto está empaquetada correctamente desde la rama `migracion-supabase`.

Artefacto GitHub Actions:
- workflow: Package MI VISUAL migration pilot
- run: 35559064452
- head SHA: 9fbbde8aeb35f42b7facf96f46a9746a6dc75deb
- artifact id: 10621745703
- artifact digest: sha256:6ca0063cceee941546602b7194bae2237a11bfc46f141dc7f31f9c336b18a515
- archivos del deploy source: 51
- publish directory: migration/pilot

El paquete contiene Administración completa, Actas Storage, Observaciones con evidencias, Checklist completo y el shell integrado.

## Netlify

Sitio:
- mi-visual-piloto
- site id: cf591dbc-2acc-4cfb-afd0-495909d18161

El conector Netlify autoriza el deploy y genera el comando/proxy correctamente.

El bloqueo está en el entorno de ejecución local:
- Node y npm están instalados.
- `npm view @netlify/mcp` falla con `EAI_AGAIN`.
- el entorno no puede resolver `registry.npmjs.org`.
- por ese motivo `npx @netlify/mcp` no llega a descargar/iniciar el cliente.
- Netlify no recibió un deploy nuevo.
- current deploy continúa siendo `6ab03082193c47bec980fa6c`.

## Seguridad

No se:
- tocó `main`;
- cambió el deploy público actual;
- expusieron secretos;
- hizo un deploy parcial;
- repitió una carga incierta.

## Siguiente acción para publicación

Se requiere ejecutar el deploy desde un entorno con acceso DNS/npm o disponer de un método de deploy de Netlify que acepte directamente el artefacto/ZIP sin depender del CLI.

Hasta entonces, el paquete exacto de publicación queda reproducible mediante el workflow de la rama de migración.
