import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import assert from 'node:assert/strict';
const source=readFileSync(new URL('../functions/equipos-averiados-pilot/index.ts',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
const js=stripTypeScriptTypes(source);
for (const [perfil,sede,expected] of [['ALMACEN','PIURA',403],['ALMACEN','CHICLAYO',200],['JEFATURA ALMACEN','PIURA',200]]) {
  let handler,rpcCalls=0;
  const admin={from(table){return {select(){return this},eq(){return this},async maybeSingle(){
    if(table==='app_users')return {data:{usuario:'QA',perfil,sede,estado:'ACTIVO'}};
    if(table==='app_permissions')return {data:{activo:true,ver:true,alcance_datos:'SEDE'}};
    return {data:{id:'QA-ID',sede:'CHICLAYO'}};
  }}},async rpc(){rpcCalls++;return {data:{ok:true}}}};
  const createClient=(_url,_key,opts)=>opts.global?{auth:{async getUser(){return {data:{user:{id:'QA'}}}}}}:admin;
  const Deno={env:{get:()=> 'mock'},serve(fn){handler=fn}};
  new Function('createClient','Deno',js)(createClient,Deno);
  const response=await handler(new Request('https://test.invalid',{method:'POST',headers:{Authorization:'Bearer mock','Content-Type':'application/json'},body:JSON.stringify({accion:'verificarRecepcionEquiposAveriadosV399',id:'QA-ID',solicitudId:'QA-SID'})}));
  assert.equal(response.status,expected);
  assert.equal(rpcCalls,expected===200?1:0);
  console.log(`${perfil} ${sede}: HTTP ${expected}; RPC ${rpcCalls}`);
}
