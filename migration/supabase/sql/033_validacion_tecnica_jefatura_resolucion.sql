-- MI VISUAL - Validacion Tecnica: capa Jefatura y resolucion GAR/VTR
-- Fuente snapshot: VTR_GAR_BONO_JEFATURA (productivo solo lectura).
-- No cutover. No modifica Google Sheets ni main.

begin;

create table if not exists public.vtr_gar_bono_jefatura_legacy_snapshot (
  source_row integer primary key,
  clave text,
  periodo text not null,
  ticket text not null,
  tipo text not null,
  codigo_pedido text,
  cuadrilla_ejecutora text,
  cuadrilla_responsable text,
  resultado text not null,
  puntaje_vtr_gar numeric(12,3) not null default 0,
  motivo text,
  excepcion_sin_registro boolean not null default false,
  validado_por text,
  fecha_validacion timestamp without time zone,
  fecha_ultima_edicion timestamp without time zone,
  imported_at timestamptz not null default now(),
  constraint vtgj_periodo_chk check (periodo ~ '^20[0-9]{2}-[0-9]{2}$'),
  constraint vtgj_tipo_chk check (upper(trim(tipo)) in ('GAR','VTR')),
  constraint vtgj_resultado_chk check (upper(trim(resultado)) in ('BONO','NO BONO'))
);

create index if not exists vtgj_periodo_ticket_idx
  on public.vtr_gar_bono_jefatura_legacy_snapshot(periodo,ticket);
create index if not exists vtgj_codigo_pedido_idx
  on public.vtr_gar_bono_jefatura_legacy_snapshot(codigo_pedido);

alter table public.vtr_gar_bono_jefatura_legacy_snapshot enable row level security;
revoke all on table public.vtr_gar_bono_jefatura_legacy_snapshot from anon,authenticated;
grant all on table public.vtr_gar_bono_jefatura_legacy_snapshot to service_role;

truncate table public.vtr_gar_bono_jefatura_legacy_snapshot;

insert into public.vtr_gar_bono_jefatura_legacy_snapshot(
  source_row,clave,periodo,ticket,tipo,codigo_pedido,cuadrilla_ejecutora,
  cuadrilla_responsable,resultado,puntaje_vtr_gar,motivo,excepcion_sin_registro,
  validado_por,fecha_validacion,fecha_ultima_edicion
) values
(2,'2026-08|VTR-46789495','2026-08','VTR-46789495','VTR','2896207','P8 VISUAL SGA BRUNO ANGELO ATARAMA OROZCO','P8 VISUAL SGA BRUNO ANGELO ATARAMA OROZCO','NO BONO',0,'Si registro',true,'JEFZNORTE','2026-08-28 07:26:58','2026-08-28 07:26:58'),
(3,'2026-08|VTR-46876819','2026-08','VTR-46876819','VTR','1752025','P15 VISUAL SGA ALEX ALEXANDER RAMOS SERQUEN','P15 VISUAL SGA ALEX ALEXANDER RAMOS SERQUEN','NO BONO',0,'sin registro',true,'JEFZNORTE','2026-08-28 10:53:03','2026-08-28 10:53:03'),
(4,'2026-08|VTR-46876819','2026-08','VTR-46876819','VTR','1752025','P15 VISUAL SGA ALEX ALEXANDER RAMOS SERQUEN','P15 VISUAL SGA ALEX ALEXANDER RAMOS SERQUEN','NO BONO',0,'SIN REGISTRO',true,'JEFZNORTE','2026-08-28 11:59:17','2026-08-28 11:59:17'),
(5,'2026-08|VTR-46602900','2026-08','VTR-46602900','VTR','2567771','P12 VISUAL SGA ABEL EDUARDO MARCHENA JACINTO','P12 VISUAL SGA ABEL EDUARDO MARCHENA JACINTO','NO BONO',0,'Se corrige la clasificación: sí corresponde a GAR/VTR. No corresponde bono.',false,'JEFZNORTE','2026-08-29 10:00:10','2026-08-29 10:00:10'),
(6,'2026-08|VTR-46573924','2026-08','VTR-46573924','VTR','1137380','P4 VISUAL SGA JHON ROBERT CENTURION BAUTISTA','P4 VISUAL SGA JHON ROBERT CENTURION BAUTISTA','NO BONO',0,'SIN REGISTRO',true,'JEFZNORTE','2026-08-28 12:03:58','2026-08-28 12:03:58'),
(7,'2026-08|VTR-46573924','2026-08','VTR-46573924','VTR','1137380','P4 VISUAL SGA JHON ROBERT CENTURION BAUTISTA','P4 VISUAL SGA JHON ROBERT CENTURION BAUTISTA','NO BONO',0,'SIN REGISTRO',true,'JEFZNORTE','2026-08-28 12:19:38','2026-08-28 12:19:38'),
(8,'2026-08|GAR-46223157','2026-08','GAR-46223157','GAR','3082047','P2 VISUAL SGI WILMER ANTONIO RACCHUMI SANTISTEBAN','P4 VISUAL SGI CESAR AUGUSTO INGOL RODRIGUEZ','BONO',2,'RECABLEADO',true,'JEFZNORTE','2026-08-29 10:51:15','2026-08-29 10:51:15'),
(9,'2026-08|GAR-46249523','2026-08','GAR-46249523','GAR','3071831','P2 VISUAL SGI WILMER ANTONIO RACCHUMI SANTISTEBAN','P4 VISUAL SGI CESAR AUGUSTO INGOL RODRIGUEZ','BONO',2,'RECABLEADO',true,'JEFZNORTE','2026-08-29 11:10:37','2026-08-29 11:10:37'),
(10,'2026-08|GAR-46970476','2026-08','GAR-46970476','GAR','3125019','P5 VISUAL SGI MAXIMO ANDRES SANCHEZ TUME','P5 VISUAL SGI MAXIMO ANDRES SANCHEZ TUME','NO BONO',0,'SIN REGISTRO GARANTIA PROPIA',false,'JEFZNORTE','2026-08-29 13:22:02','2026-08-29 13:22:02'),
(11,'2026-08|GAR-46215399','2026-08','GAR-46215399','GAR','3077028','P5 VISUAL SGI MAXIMO ANDRES SANCHEZ TUME','P5 VISUAL SGI MAXIMO ANDRES SANCHEZ TUME','NO BONO',0,'SIN REGISTRO',false,'JEFZNORTE','2026-08-29 14:20:21','2026-08-29 14:20:21'),
(12,'2026-08|VTR-46176404','2026-08','VTR-46176404','VTR','1874777','P8 VISUAL SGA BRUNO ANGELO ATARAMA OROZCO','P8 VISUAL SGA BRUNO ANGELO ATARAMA OROZCO','NO BONO',0,'SIN REGISTRO',false,'JEFZNORTE','2026-08-29 14:22:42','2026-08-29 14:22:42'),
(13,'2026-08|VTR-46128271','2026-08','VTR-46128271','VTR','2045096','P1 VISUAL SGI ELVI RONALD ATARAMA HERNANDEZ','P1 VISUAL SGI ELVI RONALD ATARAMA HERNANDEZ','NO BONO',0,'SIN REGISTRO',false,'JEFZNORTE','2026-08-29 14:23:53','2026-08-29 14:23:53'),
(14,'2026-08|VTR-45932595','2026-08','VTR-45932595','VTR','855535','P11 VISUAL SGA JULIO SANTOS RODRIGUEZ CHIROQUE','P3 TRASLADO VISUAL TELMO SIXTO SEBASTIAN BLANCO','NO BONO',0,'SIN REGISTRO',false,'JEFZNORTE','2026-08-29 14:32:08','2026-08-29 14:32:08'),
(15,'2026-08|GAR-46109730','2026-08','GAR-46109730','GAR','3066034','P11 VISUAL SGA JULIO SANTOS RODRIGUEZ CHIROQUE','P11 VISUAL SGA JULIO SANTOS RODRIGUEZ CHIROQUE','NO BONO',0,'SIN REGISTRO',false,'JEFZNORTE','2026-08-29 14:33:06','2026-08-29 14:33:06'),
(16,'2026-08|VTR-46244156','2026-08','VTR-46244156','VTR','581027','P2 TRASLADO VISUAL LUIS FRANCISCO ESPIRE CHIQUEZ','P2 TRASLADO VISUAL LUIS FRANCISCO ESPIRE CHIQUEZ','NO BONO',0,'SIN REGISTRO',false,'JEFZNORTE','2026-08-29 14:34:12','2026-08-29 14:34:12'),
(17,'2026-08|VTR-46268569','2026-08','VTR-46268569','VTR','2231181','P7 VISUAL SGI VICTOR MANUEL PACHERRES RUIZ','P11 VISUAL SGI ANDRYK JEFFRY CARDENAS AGUILAR','BONO',1,'VALIDADO',true,'JEFZNORTE','2026-08-29 14:38:19','2026-08-29 14:38:19'),
(18,'2026-08|VTR-46264645','2026-08','VTR-46264645','VTR','1167198','P7 VISUAL SGI VICTOR MANUEL PACHERRES RUIZ','P11 VISUAL SGA JULIO SANTOS RODRIGUEZ CHIROQUE','BONO',1,'V',true,'JEFZNORTE','2026-08-29 14:40:01','2026-08-29 14:40:01'),
(19,'2026-08|VTR-46251243','2026-08','VTR-46251243','VTR','3066034','P7 VISUAL SGI VICTOR MANUEL PACHERRES RUIZ','P11 VISUAL SGI ANDRYK JEFFRY CARDENAS AGUILAR','BONO',1,'CAMBIO DE CONECTOR',true,'JEFZNORTE','2026-08-29 14:41:54','2026-08-29 14:41:54'),
(20,'2026-08|VTR-46280544','2026-08','VTR-46280544','VTR','3037798','P7 VISUAL SGI VICTOR MANUEL PACHERRES RUIZ','P7 VISUAL SGI VICTOR MANUEL PACHERRES RUIZ','NO BONO',0,'SIN REGISTRO',false,'JEFZNORTE','2026-08-29 14:42:50','2026-08-29 14:42:50'),
(21,'2026-08|VTR-46349565','2026-08','VTR-46349565','VTR','1167198','P11 VISUAL SGA JULIO SANTOS RODRIGUEZ CHIROQUE','P7 VISUAL SGI VICTOR MANUEL PACHERRES RUIZ','BONO',1,'VALIDADO',true,'JEFZNORTE','2026-08-29 14:44:39','2026-08-29 14:44:39'),
(22,'2026-08|VTR-46565221','2026-08','VTR-46565221','VTR','933555','P11 VISUAL SGA JULIO SANTOS RODRIGUEZ CHIROQUE','P11 VISUAL SGA JULIO SANTOS RODRIGUEZ CHIROQUE','NO BONO',0,'SIN REGISTRO',false,'JEFZNORTE','2026-08-29 14:56:01','2026-08-29 14:56:01'),
(23,'2026-08|VTR-46662044','2026-08','VTR-46662044','VTR','831671','P5 VISUAL SGA NOE FERMIN MENDOZA REBAZA','P5 VISUAL SGA NOE FERMIN MENDOZA REBAZA','NO BONO',0,'SIN REGISTRO',false,'JEFZNORTE','2026-08-29 14:57:09','2026-08-29 14:57:09'),
(24,'2026-08|VTR-46895469','2026-08','VTR-46895469','VTR','1939234','P5 VISUAL SGA NOE FERMIN MENDOZA REBAZA','P5 VISUAL SGA NOE FERMIN MENDOZA REBAZA','BONO',2,'validado',true,'JEFZNORTE','2026-08-29 16:15:40','2026-08-29 16:15:40'),
(25,'2026-08|VTR-46986321','2026-08','VTR-46986321','VTR','440113','P8 VISUAL SGI ALEX OSWALDO BASTIDAS GONZALEZ','P8 VISUAL SGI ALEX OSWALDO BASTIDAS GONZALEZ','NO BONO',0,'sin registro',false,'JEFZNORTE','2026-08-30 08:20:49','2026-08-30 08:20:49'),
(26,'2026-08|VTR-46786251','2026-08','VTR-46786251','VTR','1053929','P8 VISUAL SGI ALEX OSWALDO BASTIDAS GONZALEZ','P7 VISUAL SGI VICTOR MANUEL PACHERRES RUIZ','NO BONO',0,'sin registro',false,'JEFZNORTE','2026-09-01 15:15:30','2026-09-01 15:15:30'),
(27,'2026-08|VTR-46441547','2026-08','VTR-46441547','VTR','1551671','P7 VISUAL SGI VICTOR MANUEL PACHERRES RUIZ','P7 VISUAL SGI VICTOR MANUEL PACHERRES RUIZ','NO BONO',0,'sin registro',false,'JEFZNORTE','2026-09-01 15:18:17','2026-09-01 15:18:17'),
(28,'2026-08|GAR-46708197','2026-08','GAR-46708197','GAR','3108431','P6 VISUAL SGI ROBERTO ESPINOZA ESTRADA','P6 VISUAL SGI ROBERTO ESPINOZA ESTRADA','NO BONO',0,'sin registro',false,'JEFZNORTE','2026-09-01 15:22:43','2026-09-01 15:22:43'),
(29,'2026-09|VTR-47054291','2026-09','VTR-47054291','VTR','1022950','P11 VISUAL SGA JULIO SANTOS RODRIGUEZ CHIROQUE','P11 VISUAL SGA JULIO SANTOS RODRIGUEZ CHIROQUE','NO BONO',0,'sin registro',false,'JEFZNORTE','2026-09-14 10:19:34','2026-09-14 10:19:34');

create or replace view public.mv_vtr_gar_bono_jefatura_ultima as
select distinct on (periodo,ticket_canon)
  source_row,clave,periodo,ticket_canon as ticket,upper(trim(tipo)) as tipo,
  codigo_pedido,cuadrilla_ejecutora,cuadrilla_responsable,
  upper(trim(resultado)) as resultado,
  coalesce(puntaje_vtr_gar,0)::numeric(12,3) as puntaje_vtr_gar,
  motivo,excepcion_sin_registro,validado_por,fecha_validacion,fecha_ultima_edicion
from (
  select s.*, public.mv_vt_ticket_canon(s.ticket,s.tipo) as ticket_canon
  from public.vtr_gar_bono_jefatura_legacy_snapshot s
) x
where ticket_canon is not null
order by periodo,ticket_canon,fecha_ultima_edicion desc nulls last,
         fecha_validacion desc nulls last,source_row desc;

create or replace view public.mv_validacion_tecnica_gar_vtr_ultima as
select distinct on (periodo,ticket)
  id,source_row,periodo,ticket,tipo,codigo,cuadrilla,estado,resultado_tecnico,
  puntaje_vtr_gar,validado_por,perfil_validador,validado_at,registro_at,updated_at
from (
  select v.id,v.source_row,v.periodo,
    public.mv_vt_ticket_canon(
      coalesce(nullif(trim(v.ticket_final),''),
               coalesce(v.tipo_ticket,'')||coalesce(v.numero_ticket,'')),
      v.tipo_validacion
    ) as ticket,
    upper(trim(v.tipo_validacion)) as tipo,
    v.codigo,v.cuadrilla,
    upper(trim(coalesce(v.estado,''))) as estado,
    case
      when upper(trim(coalesce(v.resultado_final,''))) in ('BONO','NO BONO')
        then upper(trim(v.resultado_final))
      when upper(trim(coalesce(v.estado,''))) in ('BONO','NO BONO')
        then upper(trim(v.estado))
      else upper(trim(coalesce(v.resultado_final,v.estado,'PENDIENTE')))
    end as resultado_tecnico,
    coalesce(v.puntaje_vtr_gar,0)::numeric(12,3) as puntaje_vtr_gar,
    v.validado_por,v.perfil_validador,v.validado_at,v.registro_at,v.updated_at
  from public.validacion_tecnica_migracion v
  where upper(trim(v.tipo_validacion)) in ('GAR','VTR')
) q
where ticket is not null
order by periodo,ticket,coalesce(validado_at,registro_at) desc nulls last,
         updated_at desc nulls last,id desc;

create or replace view public.mv_validacion_tecnica_gar_vtr_resuelta as
with claves as (
  select periodo,ticket from public.mv_validacion_tecnica_gar_vtr_ultima
  union
  select periodo,ticket from public.mv_vtr_gar_bono_jefatura_ultima
),
base as (
  select k.periodo,k.ticket,
    coalesce(c.tipo,j.tipo,t.tipo,
      case when k.ticket like 'GAR-%' then 'GAR' else 'VTR' end) as tipo,
    coalesce(c.estado_responsabilidad,'PENDIENTE') as estado_responsabilidad,
    coalesce(c.estado_win,'POR_REVISAR') as estado_win,
    coalesce(c.es_gar_vtr_confirmado,false) as es_gar_vtr_confirmado,
    coalesce(c.bono_habilitado,false) as bono_habilitado,
    c.cuadrilla_responsable as cuadrilla_responsable_clasificacion,
    c.sede_responsable,
    t.id as validacion_id,t.codigo as codigo_validacion,
    t.cuadrilla as cuadrilla_validacion,t.estado as estado_tecnico,
    t.resultado_tecnico,t.puntaje_vtr_gar as puntos_tecnico,
    t.validado_por as validado_por_tecnico,t.validado_at,
    j.source_row as jefatura_source_row,
    j.codigo_pedido as codigo_pedido_jefatura,
    j.cuadrilla_ejecutora,
    j.cuadrilla_responsable as cuadrilla_responsable_jefatura,
    j.resultado as resultado_jefatura,j.puntaje_vtr_gar as puntos_jefatura,
    j.motivo as motivo_jefatura,j.excepcion_sin_registro,
    j.validado_por as validado_por_jefatura,
    j.fecha_ultima_edicion as jefatura_editado_at
  from claves k
  left join public.mv_validacion_tecnica_gar_vtr_ultima t
    on t.periodo=k.periodo and t.ticket=k.ticket
  left join public.mv_vtr_gar_bono_jefatura_ultima j
    on j.periodo=k.periodo and j.ticket=k.ticket
  left join public.mv_vt_gar_vtr_contexto_ticket c
    on c.periodo=k.periodo and c.ticket=k.ticket
),
resuelta as (
  select b.*,
    case
      when resultado_jefatura in ('BONO','NO BONO') then resultado_jefatura
      when resultado_tecnico in ('BONO','NO BONO') then resultado_tecnico
      else 'PENDIENTE'
    end as resultado_efectivo,
    case
      when resultado_jefatura in ('BONO','NO BONO') then 'JEFATURA'
      when resultado_tecnico in ('BONO','NO BONO') then 'TECNICO'
      else 'PENDIENTE'
    end as fuente_resultado,
    case
      when resultado_jefatura='BONO' then coalesce(puntos_jefatura,0)
      when resultado_jefatura='NO BONO' then 0
      when resultado_tecnico='BONO' then coalesce(puntos_tecnico,0)
      else 0
    end::numeric(12,3) as puntos_efectivos
  from base b
)
select r.*,
  coalesce(r.cuadrilla_responsable_clasificacion,
           r.cuadrilla_responsable_jefatura,
           r.cuadrilla_validacion) as cuadrilla_responsable_mostrada,
  (r.es_gar_vtr_confirmado and r.bono_habilitado and r.resultado_efectivo='BONO') as bono_contable,
  case
    when r.es_gar_vtr_confirmado and r.bono_habilitado and r.resultado_efectivo='BONO'
      then r.puntos_efectivos
    else 0
  end::numeric(12,3) as puntos_contables,
  case
    when not r.es_gar_vtr_confirmado then 'NO_CONTABLE_CLASIFICACION'
    when r.estado_win<>'FINALIZADA' then 'NO_CONTABLE_WIN_NO_FINALIZADA'
    when r.resultado_efectivo='BONO' then 'BONO'
    when r.resultado_efectivo='NO BONO' then 'NO_BONO'
    else 'PENDIENTE'
  end as estado_bono_motor
from resuelta r;

create or replace view public.mv_validacion_tecnica_gar_vtr_resumen as
select periodo,tipo,resultado_efectivo,fuente_resultado,estado_bono_motor,
       count(*)::integer as registros,
       sum(puntos_efectivos)::numeric(12,3) as puntos_efectivos,
       sum(puntos_contables)::numeric(12,3) as puntos_contables
from public.mv_validacion_tecnica_gar_vtr_resuelta
group by periodo,tipo,resultado_efectivo,fuente_resultado,estado_bono_motor;

create or replace view public.mv_validacion_tecnica_gar_vtr_conciliacion as
with snap as (
  select to_char(fecha_incidencia,'YYYY-MM') as periodo,
    public.mv_vt_ticket_canon(ticket,tipo) as ticket,
    upper(trim(tipo)) as tipo,
    upper(trim(coalesce(resultado,'SIN_EVALUACION'))) as resultado_snapshot,
    coalesce(puntos_vtr_gar,0)::numeric(12,3) as puntos_snapshot,
    cuadrilla_puntaje,estado_calificacion
  from public.bono_vtr_gar_snapshot
),
r as (
  select periodo,ticket,tipo,resultado_efectivo,puntos_contables,
    cuadrilla_responsable_mostrada,estado_responsabilidad,estado_win,
    fuente_resultado,estado_bono_motor
  from public.mv_validacion_tecnica_gar_vtr_resuelta
)
select coalesce(r.periodo,s.periodo) as periodo,
  coalesce(r.ticket,s.ticket) as ticket,
  coalesce(r.tipo,s.tipo) as tipo,
  r.resultado_efectivo,s.resultado_snapshot,r.puntos_contables,s.puntos_snapshot,
  r.cuadrilla_responsable_mostrada,s.cuadrilla_puntaje,
  r.estado_responsabilidad,s.estado_calificacion,r.estado_win,
  r.fuente_resultado,r.estado_bono_motor,
  case
    when r.ticket is null then 'SOLO_SNAPSHOT'
    when s.ticket is null then 'SOLO_MOTOR'
    when
      (case when r.resultado_efectivo='PENDIENTE' then 'SIN_EVALUACION' else r.resultado_efectivo end)
      = s.resultado_snapshot
      and r.puntos_contables=s.puntos_snapshot
      then 'OK'
    else 'REVISAR'
  end as conciliacion
from r
full join snap s on s.periodo=r.periodo and s.ticket=r.ticket;

revoke all on public.mv_vtr_gar_bono_jefatura_ultima from anon,authenticated;
revoke all on public.mv_validacion_tecnica_gar_vtr_ultima from anon,authenticated;
revoke all on public.mv_validacion_tecnica_gar_vtr_resuelta from anon,authenticated;
revoke all on public.mv_validacion_tecnica_gar_vtr_resumen from anon,authenticated;
revoke all on public.mv_validacion_tecnica_gar_vtr_conciliacion from anon,authenticated;

grant select on public.mv_vtr_gar_bono_jefatura_ultima to service_role;
grant select on public.mv_validacion_tecnica_gar_vtr_ultima to service_role;
grant select on public.mv_validacion_tecnica_gar_vtr_resuelta to service_role;
grant select on public.mv_validacion_tecnica_gar_vtr_resumen to service_role;
grant select on public.mv_validacion_tecnica_gar_vtr_conciliacion to service_role;

commit;
