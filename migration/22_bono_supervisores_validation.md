# Validación de migración — Bonos Supervisores

Fecha de auditoría: 19/09/2026  
Rama: `migracion-supabase`  
Producción legacy: continúa activa en Apps Script + Google Sheets.

## Estado

**BACKEND CERRADO / API PILOTO DESPLEGADA / SIN CUTOVER PRODUCTIVO**

Fuentes legacy auditadas:

- `ASIGNACION_BONO_SUPERVISORES`: 8 filas.
- `EVALUACION_BONO_SUPERVISORES_20`: 3 filas.
- `CONFIGURACION_BONO_SUPERVISORES`: 2 filas.
- `SATISFACCION_BONO_SUPERVISORES`: 0 filas.
- `ACTAS_BONO_SUPERVISORES`: 3 filas.
- Duplicados período + supervisor: 0.

SLA:

- `PARAMETROS_SLA_WIN`: 56 filas históricas.
- Julio 2026: 28 parámetros vigentes.
- Agosto 2026: 28 parámetros vigentes.
- Setiembre 2026: 28 parámetros vigentes.
- Hash julio antes/después de incorporar capa editable: `e7638bd8e2d8cc0dfb0cdfe0b83f6de1`.
- Hash agosto/setiembre antes/después: `d3339faa5d435eb49301eb1a36453f06`.
- Diferencias causadas por la migración SLA: 0.

## Lógica preservada

Componentes:

1. Productividad operativa.
2. Calidad de instalaciones y averías.
3. Tiempo de Gestión - SLA.
4. Satisfacción del cliente.
5. Liderazgo.

Metas del motor:

- Producción: 130 puntos por cuadrilla.
- Efectividad: 70%.
- Recableado: 42%.
- VTR/GAR: 3%.
- Observaciones WIN: monto meta S/300.

Reglas adicionales preservadas:

- Evaluación liderazgo: 20 preguntas.
- Puntajes válidos: 0 / 1.5 / 3.
- Actas sin pendientes: SI / NO.
- Llamadas de satisfacción opcionales.
- Satisfacción combina auditorías + llamadas cuando existan.
- SLA usa cumplimiento ajustado.
- Asignaciones históricas quedan congeladas por período.
- Cuando no existe asignación histórica del período actual, se resuelve desde `app_users`.

## Configuración histórica

Julio 2026:

- Bono máximo: S/500.
- Configuración histórica conservada.

Agosto 2026:

- Bono máximo: S/500.
- Configuración histórica conservada.

Setiembre 2026:

- Sin configuración manual persistida.
- Default actual del motor: S/1,000.

## Cache y rendimiento

Se creó cache operativo mensual por cuadrilla:

- Julio: 24 cuadrillas.
- Agosto: 28 cuadrillas.
- Setiembre: 33 cuadrillas.

Refresco operativo medido:

- Julio histórico: ~40 s.
- Agosto histórico: ~28 s.
- Setiembre actual: ~4–5 s.

La reconstrucción histórica es una operación forzada, no una carga normal de pantalla.

Lectura normal después del cache:

- Jefatura / 4 supervisores: ~55–184 ms.
- Supervisor / 1 ficha: ~142 ms.

Refresco controlado setiembre:

- 33 cuadrillas.
- 4 supervisores.
- ~4.8 s.

## Conciliación de resultados

Resultados comprobados antes/después del cambio al cache operativo:

### Julio — SUPCHICLAYO

- Monto provisional: S/225.
- Porcentaje: 45%.
- Productividad: 94.03% / S/100.
- Calidad: 81.16% / S/75.
- SLA: 66.34% / S/0.
- Satisfacción: pendiente / S/0.
- Liderazgo: 83.13% / S/50.

### Agosto — SUPCHICLAYO

- Monto provisional: S/125.
- Porcentaje: 25%.
- Productividad: 85.61% / S/75.
- Calidad: 67.69% / S/0.
- SLA: 54.60% / S/0.
- Satisfacción: 95.56% / S/50.
- Liderazgo: 28.18% / S/0.

### Setiembre — SUPPIURA

- Monto provisional: S/250.
- Porcentaje: 25%.
- Productividad: 60.98% / S/0.
- Calidad: 89.48% / S/150.
- SLA: 54.17% / S/0.
- Satisfacción: 98.10% / S/100.
- Liderazgo: 22.78% / S/0.

Los resultados se mantuvieron iguales antes y después de optimizar el motor.

## Escrituras probadas con ROLLBACK

Se probaron sin persistir datos:

- guardar evaluación de liderazgo.
- guardar llamadas de satisfacción.
- guardar actas sin pendientes.
- guardar configuración del bono.
- guardar parámetros SLA WIN.

Resultado final de pruebas en setiembre:

- Evaluaciones falsas persistidas: 0.
- Satisfacción falsa persistida: 0.
- Actas falsas persistidas: 0.
- Configuraciones falsas persistidas: 0.
- Eventos falsos persistidos: 0.
- Configuración SLA falsa persistida: 0.

Prueba SLA:

- Se intentó temporalmente cambiar Atención de Averías Última Milla de 80 a 81 min.
- Después del rollback: 80 min.
- Eventos de prueba: 0.

## Seguridad

- Tablas nuevas con RLS.
- Sin acceso directo para `anon` / `authenticated`.
- Acceso backend por `service_role`.
- Supervisor: solo lectura de su propia ficha.
- Jefatura/Admin: puede editar.
- Gerencia Lima: lectura.
- Edge Function con JWT obligatorio.

## API piloto

Edge Function:

- `bonos-supervisores-pilot`
- Estado: ACTIVE.
- Versión inicial: 1.
- JWT: obligatorio.

Acciones preparadas:

- `contextoBonoSupervisores`
- `obtenerBonosSupervisores`
- `refrescarBonosSupervisores`
- `estadoBonosSupervisores`
- `listarParametrosSlaWin`
- `guardarEvaluacionBonoSupervisor`
- `guardarSatisfaccionBonoSupervisor`
- `guardarActasSinPendientesBonoSupervisor`
- `guardarConfiguracionBonoSupervisores`
- `guardarParametrosSlaWin`

El API usa nombres compatibles con Apps Script para reducir cambios en el frontend.

## SQL versionado

- 079_bono_supervisores_modelo.sql
- 080_bono_supervisores_motor_calculo.sql
- 081_bono_supervisores_calculo_alias_fix.sql
- 082_bono_supervisores_api_control.sql
- 083_bono_supervisores_cache.sql
- 084_bono_supervisores_cache_operativo.sql
- 085_bono_supervisores_motor_cache_operativo.sql
- 086_bono_supervisores_refresco_controlado.sql
- 087_sla_parametros_configuracion_postgresql.sql
- 088_bono_supervisores_cache_refresh_autorizados.sql
- 089_sla_parametros_configurables.sql
- 090_bono_supervisores_parametros_sla_configurables.sql

## Pendiente antes de cutover

1. Probar `bonos-supervisores-pilot` con sesión Auth real desde frontend piloto.
2. Comparar respuesta visual contra Bonos Supervisores actual.
3. Probar guardados desde UI piloto con datos controlados.
4. Hacer resync final de hojas manuales de Bonos.
5. Confirmar 0 diferencias.
6. Recién después cambiar la UI productiva.

`main`, Apps Script y Google Sheets productivos permanecen sin cambios.
