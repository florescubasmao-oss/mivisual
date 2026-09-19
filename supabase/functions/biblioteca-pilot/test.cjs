const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/index.ts','utf8').replace(/^import .*;\n/,'');
const rows=[{id_legacy:'1',nombre:'MANUAL DE ONT',link:'https://example.com/1'},{id_legacy:'2',nombre:'NORMAS DE SEGURIDAD',link:'https://example.com/2'},{id_legacy:'3',nombre:'sin enlace',link:''},{id_legacy:'4',nombre:'invalid',link:'javascript:alert(1)'}];
let user={usuario:'QA',perfil:'SUPERVISOR',estado:'ACTIVO'},permission={activo:true,ver:true},authValid=true,queryError=false,reads=0,handler;
const ctx={URL,Response,Deno:{env:{get:()=> 'set'},serve:fn=>handler=fn},createClient:(_u,_k,o)=>o.global?{auth:{getUser:async()=>({data:{user:authValid?{id:'QA'}:null}})}}:{from(table){const q={select(){return q},eq(){return q},async maybeSingle(){return {data:table==='app_users'?user:permission}},async order(){reads++;return {data:rows,error:queryError?Error('private DB detail'):null}}};return q}}};vm.createContext(ctx);vm.runInContext(source,ctx);
(async()=>{const req=(method='GET',token=true)=>new Request('https://example.invalid/?perfil=ADMIN',{method,headers:token?{Authorization:'Bearer test'}:{}});
 assert.equal((await handler(req('GET',false))).status,401);
 authValid=false;assert.equal((await handler(req())).status,401);authValid=true;
 const active=user;user=null;assert.equal((await handler(req())).status,403);
 user={...active,estado:'INACTIVO'};assert.equal((await handler(req())).status,403);user=active;
 permission={activo:true,ver:false};assert.equal((await handler(req())).status,403);
 permission={activo:true,ver:true,alcance_datos:'SIN ACCESO'};assert.equal((await handler(req())).status,403);assert.equal(reads,0);
 permission={activo:true,ver:true};const res=await handler(req());assert.equal(res.status,200);const data=await res.json();assert.equal(data.recursos.length,2);assert.equal(data.perfil,'SUPERVISOR');assert.equal(data.recursos[0].categoria,'📖 Manuales y Procedimientos');assert.equal(data.recursos[1].categoria,'🛡️ Seguridad');
 assert.equal((await handler(req('POST'))).status,405);
 queryError=true;const error=await handler(req());assert.equal(error.status,500);assert.ok(!(await error.text()).includes('private DB detail'));
 if(process.argv[2]){const fixture=JSON.parse(fs.readFileSync(process.argv[2]));const legacy={normalizarDestinoAcceso:ctx.normalizarDestinoAcceso};vm.createContext(legacy);vm.runInContext(fixture.legacyCategoria,legacy);for(const r of fixture.rows){const mapped=ctx.recurso(r);assert.equal(mapped.nombre,r.nombre.replace(/"/g,'').trim());assert.equal(mapped.link,r.link.replace(/"/g,'').trim());assert.equal(mapped.categoria,legacy.categoriaBiblioteca(mapped.nombre))}console.log('6 filas comparadas con la salida legacy: PASS')}
 console.log('9 casos handler + filtrado de enlaces + categorias: PASS (dependencias simuladas)');
})().catch(e=>{console.error(e);process.exit(1)});
