# MI VISUAL V637 – Validación técnica (17/10/2026)

Estado: RAMA DE PRUEBA. NO PUBLICADO EN main.

## Alcance gráfico
- Resumen general: KPI originales + barras de avance.
- Sede: mismos filtros, KPI originales + barras; ningún dato filtrado se modifica.
- Cuadrilla: ficha original + barras de indicadores.
- Trabajos diarios: detalle original + barras por estado.
- Indicadores: Producción, Cumplimiento al día, Efectividad, Recableado, VTR/GAR, Observaciones, Metas, Ranking: tabla original + barras ordenadas.

## Protecciones verificadas por inspección de código
- No se editó dashboards.js, resumen_dashboard_v361.js, dashboard_consolidado_v365.js ni sw.js.
- No se editó Code.gs, base de datos, hojas ni las rutas del servidor.
- El script nuevo no invoca fetch y solo recibe datos de los renderizadores originales.
- Respeta el loader (script final dentro de dashboards_core), sin nuevas consultas.
- Mantiene los filtros originales de periodo/sede/indicador/cuadrilla/fecha y el control por perfil preexistente.
- No escribe ni cambia arreglos fuente; crea arreglos locales al graficar.
- Gráficos con details colapsables; tablas, KPI y listado original siempre presentes.
- Hay escape de HTML de nombres y títulos para evitar inyección desde etiquetas.

## Pruebas ejecutadas en un entorno JavaScript simulado
- Análisis sintáctico: correcto (new Function).
- Ocho opciones de indicador: gráficos presentes y tablas originales conservadas.
- Resumen general: KPI original y gráfico; ficha de cuadrilla: ficha original y gráfico.
- Trabajos diarios: resultado original y gráfico adicional.
- Entradas nulas/vacías, indicador desconocido: fallback al resultado original.
- Inmutabilidad de datos de entrada: confirmada en muestra.
- Nombre con caracteres HTML: escapado.
- Fallo simulado en resumen: se devuelve HTML original.
- Doble inicialización: protegida por marca de instalación.
- Cero llamadas fetch nuevas detectadas por inspección.

## Restricciones de validación
- Son PRUEBAS ESTÁTICAS Y SIMULADAS, no una auditoría visual en navegador ni paridad con datos reales.
- Falta contrastar la interfaz en móvil/escritorio, los diez filtros/variaciones con sesión real,
  y verificar que los números visibles coincidan con los originales para los tres perfiles habilitados.
- Los tiempos de carga reales no pueden certificarse sin ejecutar en la aplicación.

## Criterios de publicación
- Comparar cifra por cifra contra dashboard actual, sobre periodos actuales e históricos.
- Confirmar Jefatura y Supervisor; no exponer datos restringidos al Técnico.
- Verificar continuidad P12/P13 y filtros mixtos, y funcionamiento de detalles de trabajos.
- Confirmar que el volumen y tiempo de peticiones de red no aumentaron.
- Mantener rollback al estado actual de main.
