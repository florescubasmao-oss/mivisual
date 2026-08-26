from pathlib import Path

code_path = Path("apps_script/Code.gs")
publisher_path = Path("apps_script/V487_Publicador.gs")
loader_path = Path("js/modulos_loader.js")
out_path = Path("Code_V487_COMPLETO.gs")

code = code_path.read_text(encoding="utf-8")
publisher = publisher_path.read_text(encoding="utf-8")
loader = loader_path.read_text(encoding="utf-8")

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

# La importacion del Mapa debe cargar el sincronizador antes de que el usuario
# confirme una carga WIN. Solo cambiamos estos dos scripts del modulo Mapa.
loader_marker = '`./js/mapa_partner_visual_v386.js?v=V408-RESTAURA-V403`,'
loader_block = '''`./js/mapa_partner_visual_v386.js?v=V48712-ESTADO-WIN`,
        `./js/indicadores_win_sync_v4879.js?v=V48712-PUBLICADOR-ACTIVO`,'''
if 'indicadores_win_sync_v4879.js?v=V48712-PUBLICADOR-ACTIVO' not in loader:
    if loader_marker not in loader:
        raise SystemExit("No se encontro el punto seguro del modulo Mapa")
    loader = loader.replace(loader_marker, loader_block, 1)
    loader_path.write_text(loader, encoding="utf-8")

# El artefacto completo permite reemplazar un unico Code.gs en Apps Script.
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

print(f"Code V487 completo: {len(combined)} bytes")
