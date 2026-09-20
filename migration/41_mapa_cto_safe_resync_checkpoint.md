# Checkpoint Mapa + CTO — Resync seguro — 20/09/2026

## Alcance
Se completó el tooling de resync para:
- MAPA_OPERATIVO / MAPA_ORDENES
- CATALOGO_CTO

No se ejecutó todavía el resync real de los datos productivos.

## Drift vigente
Sin cabeceras:
- MAPA_ORDENES: 6788 filas en Google Sheets vs 6549 en PostgreSQL → +239.
- CATALOGO_CTO: 6995 filas en Google Sheets vs 6815 en PostgreSQL → +180.

## Legacy Sync
legacy-sync-pilot:
- versión V4-LEGACY-SYNC-MAPA-CTO-20260920
- ACTIVE
- JWT obligatorio
- JEFATURA / JEFATURA GENERAL.

Acciones nuevas:
- previewMapa
- aplicarMapa
- rollbackMapa
- previewCto
- aplicarCto
- rollbackCto

## Mapa Operativo
Funciones:
- mv_sync_preview_mapa
- mv_sync_apply_mapa
- mv_sync_rollback_mapa
- mv_mapa_grupo_trabajo

Reglas:
- requiere staging completo + VALIDATED.
- detecta inválidos y duplicados.
- distingue registros existentes y nuevos.
- detecta períodos protegidos.
- nuevas órdenes en período protegido bloquean APPLY.
- nuevas órdenes activas sin clasificación de grupo bloquean APPLY.
- filas existentes de períodos protegidos no se actualizan.
- julio 2026: protegido.
- agosto 2026: protegido.
- septiembre 2026: activo.
- genera backup por run antes del upsert.
- PostgreSQL genera IDENTITY y columnas normalizadas; el importador no las escribe.
- rollback:
  - restaura filas existentes desde backup;
  - elimina filas nuevas creadas por el run;
  - marca run ROLLED_BACK.

## Catálogo CTO
Funciones:
- mv_sync_preview_cto
- mv_sync_apply_cto
- mv_sync_rollback_cto

Reglas:
- staging completo + VALIDATED.
- clave estable codigo_cto.
- detecta inválidos y duplicados.
- backup antes del upsert.
- PostgreSQL genera IDENTITY.
- rollback restaura existentes y elimina nuevos.

## UI
migration/pilot/resync-final-pilot.html ahora procesa:
- VALIDACION_TECNICA
- PROGRAMACION_DESCANSOS
- ACTAS_ESCANEADAS
- MAPA_ORDENES
- CATALOGO_CTO

Mapa/CTO:
1. leer Excel actual;
2. normalizar;
3. crear staging en bloques;
4. VALIDATED;
5. preview obligatorio;
6. APPLY solo si puedeAplicar=true;
7. rollback disponible después del APPLY.

Se evitó crear un segundo staging mientras exista uno pendiente. Si preview bloquea, la UI permite cancelar ese run antes de continuar.

## QA Mapa
Caso:
- existente: orden 3448924, septiembre.
- nueva temporal: MV-QA-MAPA-20260920-01.

Resultado:
- preview: OK.
- existentes 1.
- nuevas 1.
- protegidas 0.
- nuevas protegidas 0.
- nuevas sin clasificar 0.
- APPLY: 2 filas.
- backup: 2.
- fila nueva creada: 1.
- rollback: restored 1 / deleted 1.
- fila existente tras rollback: igualdad JSON exacta = true.
- nueva restante = 0.
- run durante prueba = ROLLED_BACK.
- transacción externa ROLLBACK: 0 residuos.

Prueba adicional:
- nueva orden temporal julio 2026.
- preview puedeAplicar=false.
- filasProtegidas=1.
- nuevasEnProtegidos=1.
- no se ejecutó APPLY.

## QA CTO
Caso:
- existente: OB-510-140580.
- nueva temporal: MV-QA-CTO-20260920-01.

Resultado:
- preview OK.
- existentes 1.
- nuevas 1.
- APPLY 2 filas.
- backup 2.
- rollback restored 1 / deleted 1.
- fila existente tras rollback: igualdad JSON exacta = true.
- nueva restante = 0.
- run durante prueba = ROLLED_BACK.
- transacción externa ROLLBACK: 0 residuos.

## Estado final de QA
- ordenes: 6549.
- catalogo_cto: 6815.
- runs QA: 0.
- staging QA: 0.
- backup QA: 0.
- códigos temporales Mapa: 0.
- códigos temporales CTO: 0.

## Seguridad
- migration_sync_apply_backup tiene RLS.
- anon/authenticated sin acceso directo.
- service_role solo servidor.
- Security Advisor no generó nuevos WARN/ERROR.
- WARN conocido pendiente: auth_leaked_password_protection.

## Producción
Sin cambios en:
- main
- Apps Script
- Google Sheets
- Google Drive
- GitHub Pages productivo.

## Próximo paso
Ejecutar el resync real desde la UI autenticada usando un Excel actual de MI VISUAL.
No transferir datos privados Drive → Supabase directamente entre conectores.
Después del resync:
1. comparar conteos;
2. comparar campos mutables;
3. recalcular/validar Producción, Efectividad, Recableado, VTR/GAR, SLA, Actas y búsquedas de Mapa;
4. mantener legacy activo hasta delta final/cutover.
