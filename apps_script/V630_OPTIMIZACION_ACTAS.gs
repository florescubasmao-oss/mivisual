/**
 * V630 - Ruta rápida conservadora, DESACTIVADA en producción.
 * Solo acepta coincidencia exacta de orden + pedido + cuadrilla.
 * Si no hay certeza vuelve al cálculo original sin cambiar reglas.
 */
function v630ResolverDatosActa_(pedido,orden,cuadrilla,sede){
  try{
    const hoja=asegurarHojaMapaOperativo();
    const fin=hoja.getLastRow();
    const ordenClave=claveIdentificadorActa(orden);
    const pedidoClave=claveIdentificadorActa(pedido);
    if(fin<2||!/^[0-9]+$/.test(ordenClave)||!/^[0-9]+$/.test(pedidoClave)){
      return resolverDatosAutomaticosActa(pedido,orden,cuadrilla,sede);
    }
    const encontrados=hoja.getRange(2,1,fin-1,1)
      .createTextFinder(String(orden)).matchEntireCell(true).findAll();
    if(!encontrados.length||encontrados.length>20){
      return resolverDatosAutomaticosActa(pedido,orden,cuadrilla,sede);
    }
    // La búsqueda original recorre de abajo arriba; empate favorece fila reciente.
    encontrados.sort(function(a,b){return b.getRow()-a.getRow();});
    let fila=null;
    for(let i=0;i<encontrados.length;i++){
      const actual=hoja.getRange(encontrados[i].getRow(),1,1,26).getValues()[0];
      const mapa=filaMapaOperativoAObjeto(actual);
      if(claveIdentificadorActa(mapa.ordenId)===ordenClave &&
         claveIdentificadorActa(mapa.codigoCliente)===pedidoClave &&
         claveCuadrillaActa(mapa.cuadrilla)===claveCuadrillaActa(cuadrilla)){
        fila=actual;break;
      }
    }
    if(!fila)return resolverDatosAutomaticosActa(pedido,orden,cuadrilla,sede);
    const item=filaMapaOperativoAObjeto(fila);
    const fecha=fechaClaveActa(item.fechaFinVisita)||fechaClaveActa(item.fechaInicioVisita)||fechaClaveActa(item.fechaSolicitud);
    const cuadrillaMapa=normalizarCuadrilla(item.cuadrilla);
    const clave=claveCuadrillaActa(cuadrillaMapa)+"|"+fecha;
    const produccion={};produccion[clave]=[];
    const hp=obtenerHoja(HOJA_PRODUCCION),n=hp.getLastRow();
    if(n>1){
      hp.getRange(2,1,n-1,7).getValues().forEach(function(f){
        if(claveCuadrillaActa(f[1])+"|"+fechaClaveActa(f[2])!==clave)return;
        const codigo=normalizarTexto(f[3]||"");
        if(codigo&&numeroProduccion(f[4])>0)produccion[clave].push(codigo);
      });
    }
    return resolverDatosAutomaticosActa(pedido,orden,cuadrilla,sede,{
      mapa:[fila],catalogo:catalogoPartidasAutomaticasActas(),produccion:produccion
    });
  }catch(error){
    console.warn("V630 ruta rapida no disponible, se usa original:",String(error));
    return resolverDatosAutomaticosActa(pedido,orden,cuadrilla,sede);
  }
}
/** Comparación SOLO LECTURA de una orden existente; no registra ni sube nada. */
function v630CompararActa_(pedido,orden,cuadrilla,sede){
 const inicio=Date.now();
 const original=resolverDatosAutomaticosActa(pedido,orden,cuadrilla,sede);
 const tiempoOriginal=Date.now()-inicio;
 const t=Date.now();
 const rapido=v630ResolverDatosActa_(pedido,orden,cuadrilla,sede);
 const tiempoRapido=Date.now()-t;
 const coincide=JSON.stringify(original)===JSON.stringify(rapido);
 const salida={ok:coincide,orden:String(orden),tiempoOriginalMs:tiempoOriginal,
  tiempoRapidoMs:tiempoRapido,coincide:coincide,original:original,propuesto:rapido};
 Logger.log("V630 COMPARAR "+JSON.stringify(salida));return salida;
}
