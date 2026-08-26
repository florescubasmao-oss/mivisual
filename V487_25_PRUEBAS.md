# V487.25 – Gestión VTR/GAR dentro de Validación Técnica

## Alcance
- **WIN es la fuente principal** para detectar y proponer la cuadrilla responsable.
- **Partner queda solo como respaldo/manual** cuando WIN no permite resolver el caso con seguridad.
- **Recableados no se modifican.**
- El submódulo VTR/GAR se habilita únicamente para usuarios con `VALIDACION TECNICA / VALIDAR`:
  - Supervisor: alcance de su sede.
  - Jefatura/Admin: alcance Zona Norte según permisos.
- `BONO / NO BONO` es independiente de `CONFIRMADO / REASIGNADO / ANULADO`.

## Regla WIN
Por `ORDEN_ID`, el estado vigente se resuelve así:
1. `FECHA_ULTIMO_ESTADO`.
2. Si falta, fecha/hora operativa más reciente.
3. Si empatan, `FECHA_IMPORTACION` más reciente.

Para proponer responsable:
- DNI exacto.
- Antecedente WIN `FINALIZADA`.
- Entre 1 y 30 días antes.
- GAR: antecedente de instalación.
- VTR: antecedente de servicio compatible.
- Otra GAR/VTR no se usa como antecedente.
- La propuesta nunca se aplica automáticamente.

## Casos reales de control
### Caso A – VTR propia
- Incidencia: `VTR-46128271`, 05/08/2026.
- DNI: `45774536`.
- Ejecutora: `P1 VISUAL SGI ELVI RONALD ATARAMA HERNANDEZ`.
- WIN anterior: orden `3292320`, 19/07/2026, `LOS ROJO`, Finalizada.
- Misma cuadrilla.
- Esperado: **PROPIA**.

### Caso B – GAR asignada
- Incidencia: `GAR-46249523`, 08/08/2026.
- DNI: `10463982444`.
- Ejecutora: `P2 VISUAL SGI WILMER ANTONIO RACCHUMI SANTISTEBAN`.
- WIN anterior: orden `3314122`, 28/07/2026, `INSTALACION`, Finalizada.
- Cuadrilla anterior: `P4 VISUAL SGI CESAR AUGUSTO INGOL RODRIGUEZ`.
- Esperado: **ASIGNADA a P4**, pendiente de confirmación manual.

### Caso C – sin antecedente seguro
- Incidencia: `VTR-46866989`, 25/08/2026.
- DNI: `60790023`.
- En MAPA_ORDENES solo aparece la propia incidencia.
- Esperado: **REVISIÓN MANUAL**. Partner no reasigna automáticamente.

## Pruebas obligatorias antes de merge
1. Técnico no ve Gestión VTR/GAR.
2. Supervisor ve únicamente su sede.
3. Jefatura ve Zona Norte.
4. Recableados mantienen botones y validación actuales.
5. Caso A propone PROPIA sin escribir nada.
6. Caso B propone ASIGNADA a P4 sin escribir nada.
7. Caso C permanece REVISIÓN MANUAL.
8. SIN REGISTRO en Validación Técnica no crea solicitud automática.
9. Registro pendiente permite BONO / NO BONO.
10. Confirmar/Reasignar/Anular modifica solo responsabilidad VTR/GAR y conserva historial.
11. Solo CONFIRMADO + REASIGNADO afectan `% VTR/GAR`.
12. Reasignación de Supervisor fuera de su sede debe ser rechazada por backend.
13. Producción, Efectividad y Recableado no cambian.
