const SLUG="mi-visual-pilot-web";
const BASE="https://raw.githubusercontent.com/florescubasmao-oss/mivisual/migracion-supabase/migration/pilot/";

const MIME={
  html:"text/html; charset=utf-8",
  js:"text/javascript; charset=utf-8",
  css:"text/css; charset=utf-8",
  json:"application/json; charset=utf-8",
  svg:"image/svg+xml",
  png:"image/png",
  jpg:"image/jpeg",
  jpeg:"image/jpeg",
  webp:"image/webp",
  ico:"image/x-icon",
  txt:"text/plain; charset=utf-8"
};

function headers(type:string){
  return {
    "content-type":type,
    "content-disposition":"inline",
    "cache-control":"no-store, no-cache, must-revalidate, max-age=0",
    "x-content-type-options":"nosniff",
    "referrer-policy":"no-referrer",
    "x-mi-visual-host":"Supabase Edge QA",
    "access-control-allow-origin":"*"
  };
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:headers("text/plain")});
  if(req.method!=="GET"&&req.method!=="HEAD")return new Response("Method Not Allowed",{status:405,headers:headers("text/plain")});

  try{
    const url=new URL(req.url);
    const marker="/"+SLUG;
    const pos=url.pathname.indexOf(marker);
    let rel=pos>=0?url.pathname.slice(pos+marker.length):"/";
    rel=decodeURIComponent(rel||"/").replace(/^\/+/, "");
    if(!rel||rel.endsWith("/"))rel+=(rel?"":"")+"index.html";
    if(rel.includes("..")||rel.includes("\\")||rel.startsWith("."))return new Response("Not Found",{status:404,headers:headers("text/plain")});

    const ext=(rel.split(".").pop()||"").toLowerCase();
    if(!Object.prototype.hasOwnProperty.call(MIME,ext))return new Response("Not Found",{status:404,headers:headers("text/plain")});

    const upstream=await fetch(BASE+rel,{headers:{"Accept":"*/*","User-Agent":"MI-VISUAL-Supabase-QA"}});
    if(!upstream.ok)return new Response("Archivo no disponible en la rama de migración.",{status:upstream.status===404?404:502,headers:headers("text/plain")});

    const type=MIME[ext as keyof typeof MIME];
    const isText=ext==="html"||ext==="js"||ext==="css"||ext==="json"||ext==="svg"||ext==="txt";
    if(req.method==="HEAD")return new Response(null,{status:200,headers:headers(type)});
    if(isText){
      const text=await upstream.text();
      return new Response(text,{status:200,headers:headers(type)});
    }
    const body=await upstream.arrayBuffer();
    return new Response(body,{status:200,headers:headers(type)});
  }catch(e){
    return new Response("No se pudo servir MI VISUAL piloto: "+(e instanceof Error?e.message:String(e)),{status:502,headers:headers("text/plain")});
  }
});