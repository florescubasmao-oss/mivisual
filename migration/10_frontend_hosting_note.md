# Piloto frontend: hosting temporal

Fecha: 2026-09-18

## Hallazgo

Supabase Edge Functions en el dominio estándar no sirven HTML como página web: las respuestas GET con `text/html` se reescriben como `text/plain`. Por eso el primer enlace del piloto mostró el código fuente HTML en lugar de renderizar la interfaz.

## Corrección

- La Edge Function `mapa-operativo-pilot` se mantiene únicamente como API JSON protegida.
- `mapa-pilot-web` no debe usarse como hosting del frontend.
- El frontend del piloto debe ejecutarse desde un archivo HTML/hosting estático independiente.
- La arquitectura final conserva GitHub Pages (o un host estático equivalente) para frontend y Supabase para Auth/API/PostgreSQL.

## Regla

No usar Supabase Edge Functions como servidor HTML del frontend, salvo que en el futuro exista un dominio/configuración expresamente compatible.
