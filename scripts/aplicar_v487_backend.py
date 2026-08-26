from pathlib import Path

code_path = Path("apps_script/Code.gs")
publisher_path = Path("apps_script/V487_Publicador.gs")
loader_path = Path("js/modulos_loader.js")
index_path = Path("index.html")
out_path = Path("Code_V487_COMPLETO.gs")

code = code_path.read_text(encoding="utf-8")
publisher = publisher_path.read_text(encoding="utf-8")
loader = loader_path.read_text(encoding="utf-8")
index = index_path.read_text(encoding="utf-8")

route_marker = 'if (data.accion === "previsualizarProduccionWinParalelaV487") return respuestaJson(previsualizarProduccionWinParalelaV487(data));'
route_block = '''if (data.accion === "previsualizarProduccionWinParalelaV487") return respuestaJson(previsualizarProduccionWinParalelaV487(data));
    // V487.12: publicacion controlada de indicadores WIN desde agosto 2026.
    if (data.accion === "previsualizarPublicacionIndicadoresWinV487") return respuestaJson(previsualizarPublicacionIndicadoresWinV487(data));
    if (data.accion === "publicarIndicadoresWinV487") return respuestaJson(publicarIndicadoresWinV487(data));
    if (data.accion === "estadoPublicadorIndicadoresWinV487") return respuestaJson(estadoPublicadorIndicadoresWinV487());'''
if 'data.accion === "publicarIndicadoresWinV487"' not in code:
    if route_marker not in code:
        raise SystemExit("No se encontro el punto seguro de insercion de rutas V487")
    code = code.replace(route_marker, route_block, 1)
    code_path.write_text(code, encoding="utf-8")

loader_marker = '`./js/mapa_partner_visual_v386.js?v=V408-RESTAURA-V403`,'
loader_block = '''`./js/mapa_partner_visual_v386.js?v=V48712-ESTADO-WIN`,
        `./js/indicadores_win_sync_v4879.js?v=V48712-PUBLICADOR-ACTIVO`,'''
if 'indicadores_win_sync_v4879.js?v=V48712-PUBLICADOR-ACTIVO' not in loader:
    if loader_marker not in loader:
        raise SystemExit("No se encontro el punto seguro del modulo Mapa")
    loader = loader.replace(loader_marker, loader_block, 1)
    loader_path.write_text(loader, encoding="utf-8")

# Fuerza a navegadores y al service worker a descargar el cargador nuevo.
for old in [
    './js/modulos_loader.js?v=V454-VT-GAR-VTR-OBSERVAR-REENVIAR',
    './js/modulos_loader.js?v=V408-RESTAURACION-CONTROLADA',
]:
    index = index.replace(old, './js/modulos_loader.js?v=V48712-PUBLICADOR-ACTIVO')
index = index.replace('./sw.js?v=V408-RESTAURACION-CONTROLADA', './sw.js?v=V48712-PUBLICADOR-ACTIVO')
index_path.write_text(index, encoding="utf-8")

combined = code.rstrip() + "\n\n\n" + publisher.strip() + "\n"
out_path.write_text(combined, encoding="utf-8")

checks = [
    'data.accion === "publicarIndicadoresWinV487"',
    'function publicarIndicadoresWinV487',
    'MV487_PUBLICADOR_ESCRITURA_COMPILADA_ = true',
    'MV487_PUBLICADOR_PERIODO_MINIMO_ = "2026-08"',
    'function previsualizarProduccionWinParalelaV487',
]
for token in checks:
    if token not in combined:
        raise SystemExit(f"Falta control obligatorio V487: {token}")
if 'indicadores_win_sync_v4879.js?v=V48712-PUBLICADOR-ACTIVO' not in loader:
    raise SystemExit("El sincronizador V487.12 no quedo conectado al Mapa")
if './js/modulos_loader.js?v=V48712-PUBLICADOR-ACTIVO' not in index:
    raise SystemExit("index.html no fuerza el loader V487.12")
if './sw.js?v=V48712-PUBLICADOR-ACTIVO' not in index:
    raise SystemExit("index.html no fuerza el service worker V487.12")

print(f"Code V487 completo: {len(combined)} bytes")
