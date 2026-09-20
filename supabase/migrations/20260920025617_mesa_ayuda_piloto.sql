-- Mesa de Ayuda: isolated pilot, immutable source snapshots and transactional changes.
create table public.mesa_casos_migracion(id text primary key, source_row integer, source_raw jsonb, datos jsonb not null, version bigint not null default 0, created_at timestamptz not null default now());
create table public.mesa_historial_migracion(seq bigint generated always as identity primary key,id text unique not null,caso_id text not null references public.mesa_casos_migracion(id),source_row integer,source_raw jsonb,datos jsonb not null);
create index mesa_historial_caso_idx on public.mesa_historial_migracion(caso_id,seq);
create table public.mesa_catalogo_migracion(source_row integer primary key,source_raw jsonb not null);
create table public.mesa_operaciones_piloto(actor uuid not null,request_id uuid not null,payload jsonb not null,result jsonb not null,created_at timestamptz not null default now(),primary key(actor,request_id));
alter table public.mesa_casos_migracion enable row level security;
alter table public.mesa_historial_migracion enable row level security;
alter table public.mesa_catalogo_migracion enable row level security;
alter table public.mesa_operaciones_piloto enable row level security;
revoke all on public.mesa_casos_migracion,public.mesa_historial_migracion,public.mesa_catalogo_migracion,public.mesa_operaciones_piloto from public,anon,authenticated;
grant all on public.mesa_casos_migracion,public.mesa_historial_migracion,public.mesa_catalogo_migracion,public.mesa_operaciones_piloto to service_role;
grant usage,select on sequence public.mesa_historial_migracion_seq_seq to service_role;
create function public.mesa_norm(v text) returns text language sql immutable set search_path='' as $$select trim(regexp_replace(translate(upper(coalesce(v,'')),'ÁÉÍÓÚÜÑ','AEIOUUN'),'\s+',' ','g'))$$;
create function public.mesa_cuadrilla(v text) returns text language sql immutable set search_path='' as $$select case when upper(x)='P9 VISUAL SGA RONALD ENRIQUE TESEN CALDERON' then 'P9 VISUAL SGA RONAL ENRIQUE TESEN CALDERON' else x end from (select trim(regexp_replace(regexp_replace(coalesce(v,''),'^P\s+(\d+)','P\1','i'),'\s+',' ','g')) x)s$$;
create function public.mesa_area(perfil text) returns text language sql immutable set search_path='' as $$select case when public.mesa_norm(perfil) in ('JEFATURA ALMACEN','JEFATURA DE ALMACEN') then 'JEFATURA DE ALMACEN' when public.mesa_norm(perfil) in ('JEFATURA OPERACIONES','JEFATURA DE OPERACIONES','OPERACIONES') then 'JEFATURA DE OPERACIONES' when public.mesa_norm(perfil) in ('JEFATURA','ADMIN','ADMINISTRADOR') then 'JEFATURA GENERAL' else '' end$$;
create function public.mesa_visible(u jsonb,c jsonb) returns boolean language sql immutable set search_path='' as $$select case
 when public.mesa_norm(u->>'perfil') in ('JEFATURA','ADMIN','ADMINISTRADOR','GERENCIA GENERAL','GERENCIAL GENERAL') then true
 when public.mesa_area(u->>'perfil')<>'' then public.mesa_area(u->>'perfil')=public.mesa_norm(c->>'areaResponsable')
 when public.mesa_norm(u->>'perfil')='SUPERVISOR' then public.mesa_norm(c->>'categoria')<>'SUPERVISOR' and public.mesa_norm(c->>'subcategoria') not like '%SUPERVISOR%' and public.mesa_norm(u->>'sede')<>'' and public.mesa_norm(u->>'sede')=public.mesa_norm(c->>'sede')
 else replace(public.mesa_norm(u->>'usuario'),' ','')=replace(public.mesa_norm(c->>'tecnico'),' ','') or (public.mesa_cuadrilla(u->>'cuadrilla')<>'' and public.mesa_cuadrilla(u->>'cuadrilla')=public.mesa_cuadrilla(c->>'cuadrilla')) end$$;
create function public.mesa_resolver(u jsonb,c jsonb) returns boolean language sql immutable set search_path='' as $$select public.mesa_norm(u->>'perfil') not in ('GERENCIA GENERAL','GERENCIAL GENERAL','GERENCIA LIMA') and public.mesa_area(u->>'perfil')<>'' and public.mesa_area(u->>'perfil')=public.mesa_norm(c->>'areaResponsable')$$;
create function public.mesa_pilot_rpc(actor uuid,p jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare u jsonb;c jsonb;v bigint;a text:=p->>'accion';rid uuid;oldop public.mesa_operaciones_piloto%rowtype;outp jsonb;items jsonb;hist jsonb;mov public.mesa_historial_migracion%rowtype;cid text;st text;newst text;msg text;ha text;nowtxt text:=to_char(clock_timestamp() at time zone 'America/Lima','DD/MM/YYYY HH24:MI:SS');cat text;ar text;days jsonb:='[]';day jsonb;code jsonb;total numeric:=0;isread boolean;
begin
 select to_jsonb(x) into u from public.app_users x where auth_user_id=actor and public.mesa_norm(estado)='ACTIVO';
 if u is null then raise exception 'Usuario no vinculado o inactivo';end if;
 if a not in ('listarConsultasReclamos','listarHistorialReclamo','registrarConsultaReclamo','actualizarConsultaReclamo','agregarComentarioReclamo','restablecerConsultaReclamo','validarRegistro') or a is null then raise exception 'Acción no válida';end if;
 isread:=a in ('listarConsultasReclamos','listarHistorialReclamo');
 if a='listarConsultasReclamos' then
  select coalesce(jsonb_agg(datos||jsonb_build_object('version',version,'estadoOriginal',datos->>'estado','estado',case when datos->>'estado'='CERRADO' then 'SOLUCIONADO' else datos->>'estado' end,'puedeResolver',public.mesa_resolver(u,datos)) order by created_at desc,source_row desc nulls first),'[]') into items from public.mesa_casos_migracion where public.mesa_visible(u,datos) and (coalesce(p->>'estado','')='' or public.mesa_norm(p->>'estado')=case when datos->>'estado'='CERRADO' then 'SOLUCIONADO' else public.mesa_norm(datos->>'estado') end) and (coalesce(p->>'area','')='' or public.mesa_norm(p->>'area')=public.mesa_norm(datos->>'areaResponsable')) and (coalesce(p->>'sede','')='' or public.mesa_norm(p->>'sede')=public.mesa_norm(datos->>'sede'));
  return jsonb_build_object('ok',true,'perfil',u->>'perfil','usuario',u->>'usuario','areaPerfil',public.mesa_area(u->>'perfil'),'casos',items,'resumen',(select jsonb_build_object('total',count(*),'registrados',count(*) filter(where x->>'estado'='REGISTRADO'),'enRevision',count(*) filter(where x->>'estado'='EN REVISION'),'enProceso',count(*) filter(where x->>'estado'='EN PROCESO'),'pendienteInformacion',count(*) filter(where x->>'estado'='PENDIENTE DE INFORMACION'),'solucionados',count(*) filter(where x->>'estado'='SOLUCIONADO'),'rechazados',count(*) filter(where x->>'estado'='RECHAZADO')) from jsonb_array_elements(items)x));
 end if;
 if a='listarHistorialReclamo' then
  select datos into c from public.mesa_casos_migracion where id=p->>'id';
  if c is null or not public.mesa_visible(u,c) then raise exception 'Caso no disponible';end if;
  select coalesce(jsonb_agg(datos order by seq),'[]') into hist from public.mesa_historial_migracion where caso_id=p->>'id';return jsonb_build_object('ok',true,'historial',hist);
 end if;
 if public.mesa_norm(u->>'perfil') in ('GERENCIA GENERAL','GERENCIAL GENERAL','GERENCIA LIMA') then raise exception 'Gerencia tiene acceso de solo lectura';end if;
 if a<>'validarRegistro' then
  rid:=(p->>'requestId')::uuid;if rid is null then raise exception 'Falta identificador de operación';end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text||rid::text,0));
  select * into oldop from public.mesa_operaciones_piloto where mesa_operaciones_piloto.actor=mesa_pilot_rpc.actor and request_id=rid;
  if found then if oldop.payload<>p then raise exception 'Operación repetida con datos diferentes';end if;return oldop.result;end if;
 end if;
 if a in ('registrarConsultaReclamo','validarRegistro') then
  cat:=public.mesa_norm(p->>'categoria');msg:=trim(coalesce(p->>'descripcion',''));
  if cat='' or public.mesa_norm(p->>'subcategoria')='' or msg='' then raise exception 'Complete categoría, subcategoría y descripción';end if;
  ar:=case when cat like '%ALMACEN%' then 'JEFATURA DE ALMACEN' when cat like '%BONO%' or cat like '%PRODUCCION%' or cat like '%PUNTAJE%' or cat like '%BACK%' then 'JEFATURA DE OPERACIONES' else 'JEFATURA GENERAL' end;
  if cat like '%BONO%' or cat like '%PRODUCCION%' or cat like '%PUNTAJE%' then
   days:=coalesce(p->'detalleDias','[]');
   if jsonb_typeof(days)<>'array' or jsonb_array_length(days) not between 1 and 31 then raise exception 'Ingrese entre 1 y 31 días';end if;
   for day in select * from jsonb_array_elements(days) loop
    if coalesce(day->>'fecha','')!~'^\d{4}-\d{2}-\d{2}$' then raise exception 'Fecha no válida';end if;
    perform (day->>'fecha')::date;
    if jsonb_typeof(day->'codigos') is distinct from 'array' then raise exception 'Ingrese códigos';end if;
    if jsonb_array_length(day->'codigos') not between 1 and 6 then raise exception 'Ingrese entre 1 y 6 códigos por día';end if;
    if coalesce((day->>'puntos')::numeric,0)<0 then raise exception 'Los puntos no pueden ser negativos';end if;
    total:=total+coalesce((day->>'puntos')::numeric,0);
    for code in select * from jsonb_array_elements(day->'codigos') loop if trim(coalesce(code->>'codigo',''))='' then raise exception 'Código obligatorio';end if;end loop;
   end loop;
  end if;
  if a='validarRegistro' then return jsonb_build_object('ok',true);end if;
  cid:='CR-PILOT-'||gen_random_uuid()::text;
  c:=jsonb_build_object('id',cid,'fechaRegistro',nowtxt,'horaRegistro',nowtxt,'sede',public.mesa_norm(u->>'sede'),'cuadrilla',public.mesa_cuadrilla(u->>'cuadrilla'),'tecnico',u->>'usuario','perfilRegistro',u->>'perfil','categoria',cat,'subcategoria',public.mesa_norm(p->>'subcategoria'),'areaResponsable',ar,'codigoPedido',trim(coalesce(p->>'codigoPedido','')),'ticket',trim(coalesce(p->>'ticket','')),'cliente',trim(coalesce(p->>'cliente','')),'descripcion',msg,'urgencia',public.mesa_norm(coalesce(nullif(p->>'urgencia',''),'NORMAL')),'estado','REGISTRADO','asignadoA','','fechaPrimeraRespuesta','','fechaSolucion','','respuestaFinal','','confirmacionTecnico','PENDIENTE','fechaCierre','','evidencias',coalesce(p->>'evidencias',''),'ultimaActualizacion',nowtxt,'cantidadDias',jsonb_array_length(days),'detalleDias',days,'totalPuntos',total,'carpetaDrive','');
  insert into public.mesa_casos_migracion(id,datos) values(cid,c);ha:='REGISTRO';st:='';newst:='REGISTRADO';
 else
  cid:=p->>'id';select datos,version into c,v from public.mesa_casos_migracion where id=cid for update;
  if c is null or not public.mesa_visible(u,c) then raise exception 'Caso no disponible';end if;
  if (p->>'version')::bigint is distinct from v then raise exception 'El caso cambió. Actualice antes de continuar';end if;
  st:=c->>'estado';newst:=st;msg:=trim(coalesce(p->>'comentario',''));
  if a='restablecerConsultaReclamo' then
   if not public.mesa_resolver(u,c) then raise exception 'Solo el responsable del área puede restablecer';end if;
   msg:=trim(coalesce(p->>'motivo',''));if msg='' then raise exception 'Ingrese el motivo del restablecimiento';end if;
   select * into mov from public.mesa_historial_migracion where caso_id=cid and datos->>'accion' in ('CAMBIO DE ESTADO','COMENTARIO') order by seq desc limit 1 for update;
   if not found then raise exception 'No hay movimientos para restablecer';end if;
   if mov.datos->>'accion'='CAMBIO DE ESTADO' then
    if st<>mov.datos->>'estadoNuevo' then raise exception 'El último cambio no coincide con el estado actual';end if;
    newst:=coalesce(nullif(mov.datos->>'estadoAnterior',''),'REGISTRADO');
    c:=c||jsonb_build_object('estado',newst,'asignadoA',u->>'usuario');
    if newst='REGISTRADO' then c:=c||'{"fechaPrimeraRespuesta":""}';end if;
    if newst not in ('SOLUCIONADO','RECHAZADO','CERRADO') then c:=c||'{"fechaSolucion":"","respuestaFinal":"","fechaCierre":""}';end if;
   end if;
   update public.mesa_historial_migracion set datos=datos||jsonb_build_object('accion',datos->>'accion'||' ANULADO') where seq=mov.seq;ha:='RESTABLECIMIENTO';
  else
   if st in ('SOLUCIONADO','RECHAZADO','CERRADO') then raise exception 'El caso está finalizado';end if;
   if msg='' then raise exception 'Ingrese el motivo o comentario';end if;
   if a='actualizarConsultaReclamo' then
    if not public.mesa_resolver(u,c) then raise exception 'Solo el responsable del área puede resolver';end if;
    newst:=public.mesa_norm(p->>'estado');if newst not in ('REGISTRADO','EN REVISION','EN PROCESO','PENDIENTE DE INFORMACION','SOLUCIONADO','RECHAZADO') then raise exception 'Estado no válido';end if;
    c:=c||jsonb_build_object('estado',newst,'asignadoA',u->>'usuario');
    if coalesce(c->>'fechaPrimeraRespuesta','')='' and newst<>'REGISTRADO' then c:=c||jsonb_build_object('fechaPrimeraRespuesta',nowtxt);end if;
    if newst in ('SOLUCIONADO','RECHAZADO') then c:=c||jsonb_build_object('fechaSolucion',nowtxt,'respuestaFinal',msg,'fechaCierre',nowtxt);end if;ha:='CAMBIO DE ESTADO';
   else ha:='COMENTARIO';end if;
  end if;
  c:=c||jsonb_build_object('ultimaActualizacion',nowtxt);update public.mesa_casos_migracion set datos=c,version=version+1 where id=cid;
 end if;
 hist:=jsonb_build_object('id','HCR-PILOT-'||gen_random_uuid()::text,'idCaso',cid,'fecha',nowtxt,'hora',nowtxt,'usuario',u->>'usuario','perfil',u->>'perfil','accion',ha,'estadoAnterior',st,'estadoNuevo',newst,'comentario',msg,'evidencias',case when ha='RESTABLECIMIENTO' then '' else coalesce(p->>'evidencias','') end);
 insert into public.mesa_historial_migracion(id,caso_id,datos) values(hist->>'id',cid,hist);
 outp:=jsonb_build_object('ok',true,'id',cid,'estado',newst,'areaResponsable',c->>'areaResponsable','version',coalesce(v+1,0),'movimientoAnulado',mov.datos->>'accion');
 insert into public.mesa_operaciones_piloto(actor,request_id,payload,result) values(actor,rid,p,outp);return outp;
end$$;
revoke all on function public.mesa_norm(text),public.mesa_cuadrilla(text),public.mesa_area(text),public.mesa_visible(jsonb,jsonb),public.mesa_resolver(jsonb,jsonb),public.mesa_pilot_rpc(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.mesa_norm(text),public.mesa_cuadrilla(text),public.mesa_area(text),public.mesa_visible(jsonb,jsonb),public.mesa_resolver(jsonb,jsonb),public.mesa_pilot_rpc(uuid,jsonb) to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('mesa-ayuda-pilot','mesa-ayuda-pilot',false,5242880,array['application/pdf','image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
