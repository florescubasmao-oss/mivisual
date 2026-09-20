# Integración UI — Validación Técnica, Actas y Descansos

Fecha: 20/09/2026  
Rama: `migracion-supabase`  
Producción `main`: sin cambios.

## Objetivo
Integrar tres módulos ya migrados al shell único de MI VISUAL sin crear aplicaciones separadas:
- Validación Técnica
- Gestión de Actas
- Programación de Descansos

## Validación Técnica
UI:
- `migration/pilot/validacion-tecnica-pilot.html`

Backend:
- `validacion-tecnica-pilot` V2 existente
- JWT obligatorio
- reglas V490 preservadas

Incluye:
- filtros por período/tipo/estado/sede;
- listado por alcance;
- resumen operativo;
- selección y validación;
- GAR/VTR: Jefatura -> BONO / NO BONO;
- Recableado/Otro: flujo de validación permitido por backend;
- registro Técnico basado en búsqueda validada de órdenes;
- exportación CSV de la lista cargada.

La UI no decide permisos; el backend vuelve a validar perfil, sede, cuadrilla y permiso VALIDAR/REGISTRAR.

Lectura PostgreSQL de septiembre:
- total: 163;
- Chiclayo: 112.

La fuente legacy sigue viva. La UI piloto no implica que el delta actual de Sheets ya se haya aplicado.

## Gestión de Actas
Nueva Edge Function:
- `actas-pilot` V1
- ACTIVE
- JWT obligatorio

UI:
- `migration/pilot/actas-pilot.html`

Incluye:
- listado por período/estado/sede;
- búsqueda por orden/pedido/acta/DNI;
- métricas de pendientes/finalizadas/observadas/entrega/fecha;
- acceso al PDF histórico de Drive;
- validación Almacén/Jefatura Almacén cuando corresponde;
- entrega física y reversión conforme a perfil;
- confirmación manual de fecha para perfiles permitidos;
- exportación CSV de la lista cargada.

No se migró ni sustituyó todavía la subida/reemplazo físico de PDF:
- Drive continúa como almacenamiento operativo;
- no se simula una subida a Supabase Storage;
- no se elimina ni mueve ningún archivo de Drive desde este piloto.

Lectura PostgreSQL de septiembre:
- total: 733;
- Chiclayo: 356.

La hoja productiva tiene registros posteriores al snapshot, por lo que el resync sigue obligatorio antes del cutover.

## Programación de Descansos
Nueva Edge Function:
- `descansos-pilot` V1
- ACTIVE
- JWT obligatorio

UI:
- `migration/pilot/descansos-pilot.html`

RPC reutilizadas:
- `mv_descansos_listar`
- `mv_descansos_notificaciones`
- `mv_descansos_resumen_cobertura`
- `mv_descansos_guardar`
- `mv_descansos_solicitar_cambio`
- `mv_descansos_validar_supervisor`
- `mv_descansos_resolver_jefatura`

Incluye:
- listado por período/sede;
- programación vigente;
- historial;
- cobertura por sede/plataforma/fecha;
- programación Supervisor/Jefatura;
- solicitud de cambio Técnico;
- validación Supervisor;
- resolución Jefatura.

Prueba read-only:
- JEFZNORTE: 38 entidades, 171 registros vigentes en septiembre.
- SUPCHICLAYO: 17 entidades, 83 registros vigentes.
- pendientes actuales Jefatura: 0.
- pendientes actuales Supervisor Chiclayo: 0.

Cobertura 20/09/2026:
- la RPC devuelve las 9 combinaciones esperadas para Jefatura (3 sedes x 3 plataformas).

## Shell
Rutas nuevas:
- VALIDACION TECNICA -> `validacion-tecnica-pilot.html`
- ACTAS ESCANEADAS -> `actas-pilot.html`
- PROGRAMACION DESCANSOS -> `descansos-pilot.html`

Todos abren dentro del mismo shell con:
`?embed=1&shell=1`

Sesión:
- única;
- compartida;
- sin segundo login.

Menú después de esta integración:
- JEFATURA: 21 módulos visibles, 11 con UI integrada, 10 pendientes de UI.
- SUPERVISOR: 17 visibles, 9 integrados, 8 pendientes de UI.

## QA técnico
Se validó sintaxis de JavaScript embebido en:
- shell;
- Validación Técnica;
- Actas;
- Descansos.

Resultado:
- 4/4 sintaxis correcta;
- HTML cerrado correctamente;
- los tres módulos nuevos incluyen `shell-embed.js`.

## Seguridad
- nuevas Edge Functions con `verify_jwt=true`;
- sin exposición de service role al navegador;
- funciones SQL continúan restringidas al backend;
- las operaciones SQL vuelven a comprobar actor/perfil/sede antes de escribir.

## Producción
Sin cambios en:
- `main`;
- Apps Script;
- Google Sheets;
- Google Drive;
- GitHub Pages productivo.

## Pendientes de estos módulos
Validación Técnica:
- resincronizar delta legacy antes de cutover;
- reemplazar exportación CSV por XLSX si se requiere paridad exacta del informe histórico.

Actas:
- definir flujo final Drive/API para subida/reemplazo de PDF;
- resync de filas nuevas/modificadas;
- prueba E2E con perfil Almacén/Jefatura Almacén/Técnico Auth.

Descansos:
- resync de filas nuevas/modificadas;
- prueba E2E de escritura con cuentas Auth Supervisor/Técnico/Jefatura.

## Próximo bloque recomendado
Integrar:
1. Ranking + Dashboard
2. Observaciones
3. Producción / Efectividad / Recableado / VTR-GAR

Mantener un solo shell y una sola sesión.
