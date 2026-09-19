# Validación PEXT / PEXT Conjunta

Fecha: 19/09/2026
Rama: `migracion-supabase`
Estado: **LIVE_VALIDAR / SIN CUTOVER PRODUCTIVO**

## Fuente productiva

Hoja: `TRABAJOS_CONJUNTA`

Lógica recuperada de Apps Script V152/V287/V517D:

- Tipos: `CONJUNTA PEXT`, `NORMALIZACION`, `ORDENAMIENTO`.
- Supervisor registra.
- Técnico da VISTO BUENO u OBSERVA.
- Área con permiso VALIDAR: APROBADO / OBSERVADO / RECHAZADO.
- Conformidad final: CONFORME / SIN CONFORMIDAD.
- Visto bueno automático después de 24 h sin respuesta del Técnico.
- Evidencias: mínimo 1, máximo 3.
- Jornada validada: MEDIO DÍA / DÍA COMPLETO.
- La validación del área puede ocurrir antes del visto bueno técnico.

## Puntaje

CONJUNTA PEXT:

- Cada recableado = 2 puntos.
- 1–2 conectorizados = 1 punto.
- 3–6 = 2 puntos.
- 7–12 = 3 puntos.
- 13 o más = 4 puntos, igual que el código productivo vigente.
- Si recableados + conectorizados dan 0 puntos, se acepta puntaje manual del Supervisor.

NORMALIZACION / ORDENAMIENTO:

- Puntos manuales del Supervisor.

Bonos:

- Solo suma cuando existe visto bueno técnico (manual o automático) + aprobación del área.
- PENDIENTE no suma.
- Cada ID se contabiliza una sola vez.

## Conciliación

Comparación completa de las 37 columnas, incluida `JORNADA_VALIDADA`:

- Hoja productiva: 28 registros.
- PostgreSQL legacy snapshot: 28 registros.
- Diferencias: **0**.
- Escrituras piloto persistentes: 0.

Periodo de registros:

- Primera fecha de trabajo: 08/07/2026.
- Última fecha de trabajo: 07/09/2026.

Estados actuales legacy:

- PENDIENTE CONFORMIDAD FINAL: 14.
- PENDIENTE DE VALIDACION JEFATURA: 14.

## Bonos PEXT derivados

Vista: `mv_pext_bonos_v1`

- IDs totales que tienen puntaje > 0: 26.
- IDs únicos: 26.
- Duplicados: 0.

Por período:

- Julio 2026: 15 registros con puntaje; 13 VALIDADO; 2 PENDIENTE; 47 puntos validados.
- Agosto 2026: 10 registros; 0 VALIDADO; 10 PENDIENTE.
- Septiembre 2026: 1 registro; 0 VALIDADO; 1 PENDIENTE.

No se recalculó ni modificó la hoja productiva.

## PostgreSQL

Tabla:

- `pext_trabajos_migracion`

Vistas:

- `mv_pext_trabajos_v1`
- `mv_pext_bonos_v1`

Funciones:

- `mv_pext_puntos_conectorizados`
- `mv_pext_calcular_puntos`
- `mv_pext_aplicar_vistos_buenos_automaticos`
- `mv_pext_responder_tecnico`
- `mv_pext_validar_jefatura`
- `mv_pext_conformidad_final`

Migración principal:

- `109_pext_conjunta_v152.sql`

## Prueba transaccional

Se creó un registro sintético dentro de una transacción para probar:

1. Registro PEXT.
2. Cálculo automático.
3. Visto bueno técnico.
4. Aprobación del área.
5. Jornada validada.
6. Aparición como VALIDADO en Bonos.
7. Conformidad final.
8. Visto bueno automático después de 24 h.

La transacción terminó con `ROLLBACK`.

Resultado posterior:

- residuos de prueba: 0.

## API piloto

Edge Function:

- `pext-pilot`
- ACTIVE v1
- JWT obligatorio.

Acciones portadas:

- `obtenerConfiguracionPext`
- `guardarConfiguracionPext`
- `listarCuadrillasTrabajosConjunta`
- `registrarTrabajoConjunta`
- `listarTrabajosConjunta`
- `listarBonosPextConjunta`
- `responderTrabajoConjuntaTecnico`
- `validarTrabajoConjuntaJefatura`
- `conformidadFinalTrabajoConjunta`

Evidencias nuevas se almacenan en bucket privado `mi-visual-evidencias` y se entregan por URL firmada temporal.

## Seguridad

- RLS activo en `pext_trabajos_migracion` y `bono_pext_snapshot`.
- 0 grants directos para `anon` / `authenticated`.
- Acceso mediante backend `service_role`.
- Edge Function con JWT.
- Alcance dinámico por perfil/sede/cuadrilla.

## Pendientes antes del cutover

1. Prueba Auth real:
   - Supervisor registra.
   - Técnico responde.
   - Área valida.
   - Jefatura da conformidad final.
2. Reconciliación final de `TRABAJOS_CONJUNTA`.
3. Mantener hoja y Apps Script activos hasta el corte general.
4. Integración visual final del módulo en la nueva app.

Apps Script, Google Sheets, Drive y `main` continúan sin cambios.
