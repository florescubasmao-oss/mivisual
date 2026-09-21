const SLUG="mi-visual-pilot-web";
const HOST="https://raw.githack.com/florescubasmao-oss/mivisual/migracion-supabase/migration/pilot/";

Deno.serve((req:Request)=>{
  try{
    const url=new URL(req.url);
    const marker="/"+SLUG;
    const pos=url.pathname.indexOf(marker);
    let rel=pos>=0?url.pathname.slice(pos+marker.length):"/";
    rel=decodeURIComponent(rel||"/").replace(/^\/+/, "");
    if(!rel||rel.endsWith("/"))rel+="index.html";
    if(rel.includes("..")||rel.includes("\\"))rel="index.html";
    const target=new URL(rel,HOST);
    target.search=url.search;
    return new Response(null,{
      status:302,
      headers:{
        "location":target.toString(),
        "cache-control":"no-store, max-age=0",
        "access-control-allow-origin":"*"
      }
    });
  }catch(_){
    return new Response(null,{status:302,headers:{location:HOST+"index.html","cache-control":"no-store"}});
  }
});