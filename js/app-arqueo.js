<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Arqueo de caja</title>
<script>try{if(window.parent!==window&&window.parent.getSbClient){document.documentElement.classList.add('emb');document.write('<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">')}}catch(e){}</script>
<style>
:root{--bg:#f9fafb;--card:#fff;--bd:#e5e7eb;--tx:#1f2937;--mu:#6b7280;--ac:#1f3a5f;--acbg:#eaf0f8;--ok:#15803d;--bad:#b91c1c;--hd:#f3f4f6;color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
@media(prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#111827;--card:#1f2937;--bd:#374151;--tx:#f3f4f6;--mu:#9ca3af;--ac:#7fb0ea;--acbg:#1c3556;--ok:#4ade80;--bad:#f87171;--hd:#273244;color-scheme:dark}}
:root[data-theme=dark]{--bg:#111827;--card:#1f2937;--bd:#374151;--tx:#f3f4f6;--mu:#9ca3af;--ac:#7fb0ea;--acbg:#1c3556;--ok:#4ade80;--bad:#f87171;--hd:#273244;color-scheme:dark}
*{box-sizing:border-box}html{scroll-padding-top:env(safe-area-inset-top,0px)}
body{margin:0;background:var(--bg);color:var(--tx);font:15px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:900px;margin:0 auto;padding:16px}
h1{font-size:20px;margin:0}h2{font-size:17px;margin:0 0 10px}h3{font-size:14px;margin:16px 0 6px;text-transform:uppercase;letter-spacing:.04em}
header{display:flex;flex-wrap:wrap;gap:12px;align-items:end;justify-content:space-between;margin-bottom:12px}
.meta{display:flex;flex-wrap:wrap;gap:10px}
label.f{display:flex;flex-direction:column;gap:2px;font-size:12px;color:var(--mu)}
input,select{font:inherit;color:var(--tx);background:var(--card);border:1px solid var(--bd);border-radius:8px;padding:7px 9px;min-width:0}
input:focus{outline:2px solid var(--ac);outline-offset:-1px}
nav{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}
.cldst{align-self:center;font-size:12px;color:var(--ok)}.cldst.bad{color:var(--bad)}
button{font:inherit;cursor:pointer;border:1px solid var(--bd);background:var(--card);color:var(--tx);border-radius:8px;padding:7px 12px}
button:hover{border-color:var(--ac)}
nav button.on,.pri{background:var(--ac);color:#fff;border-color:var(--ac)}
@media(prefers-color-scheme:dark){:root:not([data-theme=light]) nav button.on,:root:not([data-theme=light]) .pri{color:#0b1b30}}
.sec{display:none;background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:14px;margin-bottom:14px}.sec.on{display:block}
.sc{overflow-x:auto}
table{border-collapse:collapse;width:100%}
th,td{border-bottom:1px solid var(--bd);padding:4px 6px;text-align:left;white-space:nowrap}
th{background:var(--hd);font-size:12px;font-weight:600}
td.n,th.n{text-align:right;font-variant-numeric:tabular-nums}
tr.gh th{background:var(--acbg);color:var(--ac)}
td.dl{font-weight:600;width:110px}
input.q{width:100%;min-width:80px;text-align:right}input.t{width:100%;min-width:150px}
.x{border:0;background:none;color:var(--mu);padding:2px 6px}.x:hover{color:var(--bad)}
.bt{margin:10px 0}.hint{color:var(--mu);font-size:12px;margin:4px 0}
.g{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-top:12px}
.c{border:1px solid var(--bd);border-radius:10px;padding:8px 10px;background:var(--bg)}
.c small{display:block;color:var(--mu);font-size:12px}.c b{font-size:17px;font-variant-numeric:tabular-nums}
.c.t{background:var(--acbg);border-color:var(--ac)}
.r.ok b{color:var(--ok)}.r.bad b{color:var(--bad)}
.rep{font-size:13px}.rep .top{text-align:center;margin-bottom:10px}.rep .top h2{font-size:20px;letter-spacing:.06em;margin:0}
.rep .info{display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;border:1px solid var(--bd);padding:6px 10px;margin-bottom:6px}
.rt td,.rt th{border:1px solid var(--bd)}.rt tr.st td{font-weight:700;background:var(--hd)}
.rep section{break-inside:avoid}
.sig{display:grid;grid-template-columns:1fr 1fr;gap:50px;margin-top:60px;text-align:center}
.sig div{border-top:1px solid var(--tx);padding-top:4px}.sig small{display:block;color:var(--mu)}
:root[data-theme=dark] nav button.on,:root[data-theme=dark] .pri{color:#0b1b30}
input.dt{min-width:130px}tfoot td{font-weight:600;background:var(--hd)}
h3.nb{background:#1f497d;color:#fff;text-align:center;padding:5px;border-radius:4px;letter-spacing:.06em}
label.ck{display:inline-flex;gap:6px;align-items:center;margin:0 14px 6px 0}label.ck input{width:auto}
.pg{break-after:page;margin-bottom:24px}.pg:last-child{break-after:auto}

header{background:#1f3a5f;color:#fff;border-radius:12px;padding:14px 18px}
header h1{color:#fff;font-size:21px;letter-spacing:.03em}header small{color:#c7d2e0!important}header label.f{color:#c7d2e0}
h2{padding-bottom:8px;border-bottom:2px solid var(--ac);margin-bottom:12px}
td input,th input{border-color:transparent;background:transparent}td input:hover{border-color:var(--bd)}td input:focus{background:var(--card)}
tbody tr:not(.gh):nth-child(even) td{background:var(--bg)}
.c{box-shadow:0 1px 2px rgba(0,0,0,.05)}.c b{font-size:18px}
.r.ok{border-left:4px solid var(--ok)}.r.bad{border-left:4px solid var(--bad)}
.pg{--n:#1f3a5f;background:#fff;color:#111;border:1px solid #cfd4da;border-radius:4px;padding:30px 34px;margin:0 auto 22px;max-width:820px;font-size:12.5px;line-height:1.35;box-shadow:0 2px 8px rgba(0,0,0,.08);-webkit-print-color-adjust:exact;print-color-adjust:exact}
.pg .lh{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:4px double var(--n);padding-bottom:8px;margin-bottom:10px}
.pg .lh h2{font-size:22px;letter-spacing:.1em;color:var(--n);margin:0;border:0;padding:0}.pg .lh small{color:#555;text-transform:uppercase;letter-spacing:.06em}
.pg .ib{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid #b8bec6;margin-bottom:12px}
.pg .ib div{padding:5px 9px;border-right:1px solid #b8bec6;font-weight:600}.pg .ib div:last-child{border:0}
.pg .ib small{display:block;font-size:9.5px;text-transform:uppercase;color:#666;letter-spacing:.06em;font-weight:400}
.pg .sh{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--n);margin:14px 0 4px;border-bottom:1px solid var(--n)}
.pg .sh.nb{background:#1f497d;color:#fff;text-align:center;padding:3px;border:0}
.pg table.rt{width:100%;border-collapse:collapse}
.pg .rt th{background:var(--n);color:#fff;border:1px solid var(--n);font-size:10.5px;text-transform:uppercase;letter-spacing:.04em;padding:4px 7px}
.pg .rt td{border:1px solid #cfd4da;padding:3px 7px;color:#111;background:#fff}
.pg .rt tbody tr:nth-child(even) td{background:#f4f6f9}
.pg .rt tfoot td,.pg .rt tr.st td{background:#e5eaf1!important;font-weight:700}
.pg .rt.cl{width:55%;margin-left:auto}.pg .mu{color:#777;text-align:center}
.pg .okc{color:#166534;font-weight:700}.pg .badc{color:#991b1b;font-weight:700}
.pg .db{display:flex;justify-content:space-between;align-items:center;width:55%;margin:8px 0 0 auto;padding:8px 12px;border:2px solid;font-size:14px;text-transform:uppercase;letter-spacing:.05em}
.pg .db.ok{color:#166534;background:#dcfce7;border-color:#166534}.pg .db.bad{color:#991b1b;background:#fee2e2;border-color:#991b1b}.pg .db b{font-size:18px}
.pg .ob{border:1px solid #b8bec6;min-height:54px;margin-top:16px;padding:4px 8px}.pg .ob small{color:#666;text-transform:uppercase;font-size:9.5px;letter-spacing:.06em}
.pg .sg{display:grid;grid-template-columns:1fr 1fr;gap:56px;margin-top:54px;text-align:center}
.pg .sg div{border-top:1px solid #111;padding-top:4px}.pg .sg small{display:block;color:#555;font-size:10.5px}
.pg .ft{margin-top:22px;border-top:1px solid #cfd4da;padding-top:4px;color:#777;font-size:10px;text-align:center}
textarea{font:inherit;width:100%;color:var(--tx);background:var(--card);border:1px solid var(--bd);border-radius:8px;padding:8px;resize:vertical}textarea:focus{outline:2px solid var(--ac);outline-offset:-1px}
.ev{display:block;color:var(--mu);font-size:11px;text-align:right}.pg .ob div{margin-top:3px;font-size:12px}
@media print{:root,:root:not([data-theme=light]),:root[data-theme=dark]{--bg:#fff!important;--card:#fff!important;--tx:#000!important;--bd:#999!important;--mu:#444!important;--hd:#eee!important;--acbg:#eee!important;--ok:#000!important;--bad:#000!important}
header,nav,.noprint{display:none!important}.sec{border:0;padding:0}main{padding:0;max-width:none}@page{size:letter;margin:0}}
main{max-width:1180px}
.wk{display:grid;grid-template-columns:minmax(0,1fr) 290px;gap:18px;align-items:start}
.wk>.mn{min-width:0}.wk>.mn>h3:first-child{margin-top:0}
.side{position:sticky;top:8px;display:flex;flex-direction:column;gap:8px}
.side .g{grid-template-columns:1fr 1fr;margin-top:0}.side .g .c.t,.side .g .c.r,.side .g label.c{grid-column:1/-1}
.side .meta{flex-direction:column;gap:6px}.side .meta input{width:100%}
.cnt{display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start}
table.den td.dl{width:80px}table.den td.n.im{min-width:95px}
tbody tr:focus-within td{background:var(--acbg)!important}
tr.vu td{background:var(--acbg)!important;font-weight:600}tr.vu input{font-weight:600}
.hpend{color:var(--mu);font-style:italic}input.tq{text-align:right}
.hok{color:var(--ok);font-weight:600}.hbad{color:var(--bad);font-weight:600}#hist tr.cur td{background:var(--acbg)}
header select{min-width:90px}
@media(max-width:860px){.wk{grid-template-columns:1fr}.side{position:static}}
@media(max-width:520px){.cnt{grid-template-columns:1fr}}
.pg{font-family:Arial,"Helvetica Neue",Helvetica,sans-serif}
table.pw{width:100%;border-collapse:collapse}table.pw>*>tr>td{border:0;padding:0;white-space:normal;background:none!important}.pw .spt,.pw .spb{display:none}
@media print{table.pw>*>tr>td{padding:0 12mm}.pw .spt{display:block;height:10mm}.pw .spb{display:block;height:9mm}}
.pg .blk{break-inside:avoid;page-break-inside:avoid}
.pg .ob{min-height:44px!important;margin-top:12px!important}.pg .sg{margin-top:42px!important}.pg .ft{margin-top:14px!important}.pg .rt td{padding:2px 7px!important}
.pg .rt{table-layout:fixed}.pg .rt td,.pg .rt th{white-space:normal;overflow-wrap:anywhere;vertical-align:top}.pg .rt td.n{white-space:nowrap;text-align:right}.pg .rt th.n{text-align:right}.pg .rt td.okc{color:#166534}.pg .rt td.badc{color:#991b1b}
.pg .let{margin:4px 0 0 auto;width:55%;font-size:11px;text-align:right;color:#333}.pg .let b{color:#111}
.pg .sh{border-bottom-width:2px}
@media print{html,body,main,.sec{width:auto!important;max-width:none!important;overflow:visible!important}.pg{width:auto!important}}
@media print{.pg{border:0!important;border-radius:0;padding:0;margin:0;max-width:none;box-shadow:none}.pg .lh h2{font-size:20px}}
/* ===== ARQUEO_EMBED: dentro del Monitor toma su diseño (Poppins, azul/morado, tarjetas redondeadas) ===== */
@media screen{
html.emb{--bg:#f8f9fc;--card:#fff;--bd:#e9ecf4;--tx:#344767;--mu:#8392ab;--ac:#5e72e4;--ac2:#825ee4;--acbg:#eef0fd;--ok:#16a34a;--bad:#f5365c;--hd:#f6f7fb;color-scheme:light}
html.emb[data-theme=dark]{--bg:#0f1430;--card:#1a1f3c;--bd:rgba(255,255,255,.12);--tx:#f1f2f8;--mu:#bcc4d6;--ac:#7c6bff;--ac2:#9f7aea;--acbg:rgba(124,107,255,.16);--ok:#3ddc97;--bad:#ff7a7a;--hd:rgba(255,255,255,.05);color-scheme:dark}
html.emb body{background:transparent;font-family:'Poppins','Inter','Segoe UI',system-ui,sans-serif;font-size:14px}
html.emb main{max-width:none;padding:2px 4px 24px}
html.emb header{background:linear-gradient(135deg,var(--ac),var(--ac2));border-radius:16px;padding:12px 18px;box-shadow:0 4px 20px rgba(94,114,228,.25)}
html.emb header h1{font-size:18px;font-weight:700}html.emb header small,html.emb header label.f{color:rgba(255,255,255,.85)!important}
html.emb header input,html.emb header select{border:0;border-radius:10px;background:rgba(255,255,255,.95);color:#344767}
html.emb nav{align-items:center}
html.emb button{border-radius:10px;font-weight:500;transition:all .15s}
html.emb nav button.on,html.emb .pri{background:linear-gradient(135deg,var(--ac),var(--ac2));color:#fff!important;border-color:transparent;box-shadow:0 4px 12px rgba(94,114,228,.3)}
html.emb .sec{border-radius:18px;border-color:var(--bd);box-shadow:0 8px 24px -6px rgba(20,30,60,.08);padding:18px}
html.emb h2{border-bottom-color:var(--ac);font-weight:700}html.emb h3{color:var(--tx);font-weight:600}
html.emb h3.nb,html.emb h3.sy{background:linear-gradient(135deg,var(--ac),var(--ac2));color:#fff;border-radius:10px;padding:6px;text-align:center}
html.emb .c{border-radius:14px;background:var(--card)}html.emb .c.t{background:var(--acbg);border-color:var(--ac)}
html.emb input,html.emb select,html.emb textarea{border-radius:10px}
html.emb input:focus,html.emb textarea:focus{outline-color:var(--ac)}
html.emb th{color:var(--mu);font-weight:600}
html.emb .pg{color:#111}
}
.cldst.auto{color:var(--mu)}
</style>
</head>
<body>
<main>
<header>
 <div><h1>Arqueo de caja</h1><small style="color:var(--mu)">Captura las cantidades. Todo se suma solo.</small></div>
 <div class="meta" id="meta"></div>
</header>
<nav id="nav"></nav>
<div id="app"></div>
<datalist id="cl"><option value="Vale"><option value="Faltante"><option value="NC"><option value="Morralla"><option value="Cheque"><option value="Tarjeta"><option value="Depósito"></datalist>
</main>
<script>
const $=s=>document.querySelector(s);
const NAMES={caja:'Caja',fondon:'Fondo revolvente',usd:'Dólares',chica:'Caja chica',rep:'Reporte formal',hist:'Historial'};
const SUC=['KN00','KN01','KN03','KN04','KN05','KN06','KN07','KN14','KN18','KN19','KN21'];
/* ARQUEO_EMBED: dentro del Monitor (iframe del mismo origen) el historial vive en Supabase
   (tablas arqueos / arqueo_apartados, migración 20261124_arqueos.sql) y se usa la misma sesión
   del Monitor (window.parent.getSbClient). Abierto solo, sigue usando este navegador. */
const EMB=(()=>{try{return window.parent!==window&&typeof window.parent.getSbClient==='function'}catch(e){return false}})();
const SB=()=>{try{return EMB?window.parent.getSbClient():null}catch(e){return null}};
const SES=()=>{try{return EMB?window.parent._session:null}catch(e){return null}};
const RO=(()=>{const s=SES();return!!(s&&s.rol==='viewer')})();
let CLD={on:EMB,ok:false,err:'',busy:0};
let H=[];if(!EMB)try{H=JSON.parse(localStorage.getItem('arqueo_hist'))||[]}catch(e){}
let hf='';
const saveH=()=>{if(EMB)return;try{localStorage.setItem('arqueo_hist',JSON.stringify(H))}catch(e){alert('No se pudo guardar el historial en este navegador. Usa "Exportar respaldo".')}};
const cldMsg=(t,bad)=>{CLD.msg=t;CLD.bad=!!bad;const e=document.getElementById('cldst');if(e){e.textContent=t;e.className='cldst'+(bad?' bad':'')}};
const rowToH=a=>({id:a.sucursal+'|'+a.fecha,uid:a.id,f:a.fecha,s:a.sucursal,e:a.elaboro||'',v:a.confirmo||'',at:a.actualizado,tot:a.totales||{},S:a.datos&&a.datos.S,M:a.datos&&a.datos.M});
async function cldLoad(){
 const sb=SB();if(!sb){CLD.err='Sin conexión con el Monitor';render();return}
 CLD.busy++;cldMsg('Cargando historial…');
 const {data,error}=await sb.from('arqueos').select('id,sucursal,fecha,elaboro,confirmo,actualizado,totales,datos').order('fecha',{ascending:false}).limit(2000);
 CLD.busy--;
 if(error){CLD.ok=false;CLD.err=/arqueos|relation|schema cache|does not exist/i.test(error.message||'')?'Falta aplicar la migración 20261124_arqueos.sql en Supabase':error.message;render();return}
 CLD.ok=true;CLD.err='';H=(data||[]).filter(a=>a.datos&&a.datos.S).map(rowToH);
 /* Borrador que quedó en este navegador (p. ej. se cerró el Monitor antes de que se autoguardara):
    si es más reciente que lo que hay en Supabase, se sube solo. */
 if(!RO&&hasData()){const h=H.find(x=>x.id==M.s+'|'+M.f),at=h&&Date.parse(h.at)||0;
  if(BAT>at&&(!h||JSON.stringify(h.S)!==JSON.stringify(S))){AUTO.sucio=true;clearTimeout(AUTO.t);AUTO.t=setTimeout(autoGuardar,800)}}
 if(CLD.msg==='Cargando historial…')cldMsg('');
 const ae=document.activeElement;if(!ae||ae===document.body||!ae.matches('input,textarea,select'))render();
}
function payload(x){
 const ap=[];let dict=null;
 for(const k in R){const r=R[k];let ok=r.dif==null?null:okD(k,r.dif);if(k=='caja'&&CU.dict!=null)ok=CU.dict;if(ok!=null)dict=dict==null?ok:dict&&ok;
  ap.push({apartado:k,moneda:k=='usd'?'USD':'MXN',efectivo:r.ef,conceptos:r.co,total:r.tot,debe_tener:r.ref,diferencia:r.dif,cumple:ok})}
 const s=SES()||{};
 return{sucursal:x.s,razon:'KNO',fecha:x.f,elaboro:x.e,confirmo:x.v,observaciones:x.M.o||'',dictamen:dict==null?null:dict?'cumple':'no_cumple',totales:x.tot,datos:{S:x.S,M:x.M,v:1,por:s.username||''},apartados:ap};
}
async function cldPut(x,quiet){
 const sb=SB();if(!sb||RO)return false;
 if(!quiet)cldMsg('Guardando en Supabase…');else if(quiet==='auto')cldMsg('Autoguardando…');
 const {data,error}=await sb.rpc('guardar_arqueo',{p:payload(x)});
 if(error){if(quiet==='auto')AUTO.sucio=true;cldMsg('⚠ No se guardó en Supabase: '+(/guardar_arqueo|schema cache|does not exist/i.test(error.message||'')?'falta aplicar la migración 20261124_arqueos.sql':error.message),1);return false}
 const h=H.find(y=>y.id==x.id);if(h){if(data)h.uid=data;h.at=new Date().toISOString()}
 const hr=new Date().toLocaleTimeString('es-MX',{timeStyle:'short'});
 if(quiet==='auto'){cldMsg('☁ Autoguardado '+hr);const e=document.getElementById('cldst');if(e)e.classList.add('auto')}
 else if(!quiet)cldMsg('✓ Guardado en Supabase '+hr);
 return true;
}
async function cldDel(h,quiet){
 const sb=SB();if(!sb||RO)return;
 const q=h.uid?sb.from('arqueos').delete().eq('id',h.uid):sb.from('arqueos').delete().eq('sucursal',h.s).eq('fecha',h.f);
 const {error}=await q;if(error){cldMsg('⚠ No se eliminó en Supabase: '+error.message,1);cldLoad()}else if(!quiet)cldMsg('✓ Eliminado');
}
const cl=o=>JSON.parse(JSON.stringify(o));
const MXD=[{g:'Billetes',v:[1000,500,200,100,50,20]},{g:'Monedas',v:[10,5,2,1,.5]}];
const DEN={caja:MXD,fondon:MXD,chica:MXD,usd:[{g:'Billetes',v:[100,50,20,10,5,2,1]},{g:'Monedas',v:[.5,.25,.1,.05,.01]}]};
const REFL={caja:'Total según sistema',fondon:'Fondo inicial (debe tener)',usd:'Fondo en dólares (debe tener)',chica:'Fondo (debe tener)'};
const CONL={caja:'Otros conceptos',fondon:'Otros conceptos',usd:'Otros conceptos',chica:'Vales y gastos'};
const today=()=>new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
const V0=[["2026-11-19","F-8CGT","BAJA GAS","GAS",400],["2026-11-19","F-2CGT","BAJA GAS","GAS",400],["2026-11-19","F-1CGT","BAJA GAS","GAS",400],["2026-11-15","F-4618","DULCERIA LA TAPATIA","GLOBOS/EXHI",251.25],["2026-11-14","F-4341","EMBOTELLADORA DEL FUERTE","AGUA",468],["2026-11-10","F-6CGT","BAJA GAS","GAS",400],["2026-11-10","F-5CGT","BAJA GAS","GAS",400],["2026-11-19","TICKET S/N","UBER","UBER LLEVAR CAMION AGENCIA",98.79],["2026-11-18","F-6388","ARNOLDO BUELNAS REYES","INSTALACION EXHIBICION",150],["2026-11-19","F-6389","ARNOLDO BUELNAS REYES","INSTALACION EXHIBICION",50],["2026-11-19","F-6390","ARNOLDO BUELNAS REYES","INSTALACION EXHIBICION",220],["2026-11-21","TICKET S/N","ARNOLDO BUELNAS REYES","CINTA DUETO DECORACION",99],["2026-11-21","TICKET S/N","ARNOLDO BUELNAS REYES","CINTA DELIMITADORA",90],["2026-11-21","TICKET #1052","EMBOTELLADORA DEL FUERTE","AGUA",432],["2026-11-21","TICKET #5851","WALDOS DÓLAR MART DE MEXICO","DECORACION",309.9]].map(a=>({f:a[0],r:a[1],n:a[2],c:a[3],m:String(a[4])}));
const blank=n=>Array.from({length:n},()=>({f:'',r:'',n:'',c:'',m:''}));
const rr=o=>{const r={};for(const d in o)r[d]=[String(o[d]),''];return r};
function fresh(demo){return{
 S:{caja:{r:demo?rr({1:25,2:1,5:6,50:1,100:11,200:7,500:3}):{},con:[],ref:demo?'4104.69':''},
 fondon:{r:demo?rr({1:386,5:347,10:127,20:17,50:49,100:32,200:6,500:3}):{},con:demo?[{c:'Morralla',r:'',m:'-8000'},{c:'Faltante',r:'',m:'1459'},{c:'NC',r:'',m:'671'},{c:'Otro (fila sin nombre en el Excel)',r:'',m:'2670'}]:[],ref:demo?'9000':''},
 usd:{r:{},con:[],ref:''},
 chica:{r:demo?rr({1:6,5:3,10:1,100:2,200:3}):{},con:demo?V0.concat(blank(3)):blank(8),nc:blank(4),ref:demo?'5000':''}},
 M:{f:today(),s:'KN00',e:'',v:''}}}
let st,tab='caja',R={};
const TL={auto:'◐ Auto',light:'☀ Claro',dark:'☾ Oscuro'};let th='auto';try{th=localStorage.getItem('arqueo_th')||'auto'}catch(e){}
if(EMB)try{th=window.parent.document.documentElement.getAttribute('data-theme')==='dark'?'dark':'light'}catch(e){}
const applyTh=()=>{document.documentElement.dataset.theme=th=='auto'?'':th};applyTh();
if(EMB)window.addEventListener('message',e=>{if(e.origin===location.origin&&e.data&&e.data.type==='theme'){th=e.data.dark?'dark':'light';applyTh()}});
let sel={res:1,caja:1,fondon:1,usd:1,chica:1};
const nm=(k,f)=>(S[k]&&S[k][f])||M[f];
const AK=EMB?'arqueo_monitor_borrador_'+String((SES()||{}).username||'').toLowerCase():'arqueo_v3';
try{st=JSON.parse(localStorage.getItem(AK))}catch(e){}
if(!st||!st.S)st=fresh(!EMB);
let{S,M}=st;
/* Autoguardado: cada cambio queda al instante en este navegador (borrador) y, dentro del Monitor,
   a los 2.5 s sin escribir se guarda solo en Supabase. Si se cierra el Monitor, al volver a entrar
   el arqueo sigue donde se quedó. */
const AUTO={t:null,key:null,nuevos:new Set(),sucio:false};
let BAT=(st&&st.at)||0;
const save=noAuto=>{BAT=Date.now();try{localStorage.setItem(AK,JSON.stringify({S,M,at:BAT}))}catch(e){}if(EMB&&!RO&&!noAuto){AUTO.sucio=true;clearTimeout(AUTO.t);AUTO.t=setTimeout(autoGuardar,2500)}};
function autoGuardar(){
 clearTimeout(AUTO.t);AUTO.t=null;
 if(!EMB||RO||!AUTO.sucio||!CLD.ok)return;
 AUTO.sucio=false;
 if(!hasData())return;
 const id=M.s+'|'+M.f,existia=H.some(h=>h.id==id);
 /* Si se cambió la sucursal o la fecha, el registro que creó el autoguardado con la clave anterior
    ya no corresponde a nada: se quita para no dejar arqueos duplicados. */
 if(AUTO.key&&AUTO.key!==id&&AUTO.nuevos.has(AUTO.key)){const v=H.find(h=>h.id==AUTO.key);H=H.filter(h=>h.id!==AUTO.key);AUTO.nuevos.delete(AUTO.key);if(v)cldDel(v,1)}
 if(!existia)AUTO.nuevos.add(id);
 AUTO.key=id;
 upsert('auto');
}
const fijar=()=>{AUTO.nuevos.clear();AUTO.key=null;AUTO.sucio=false;clearTimeout(AUTO.t)};
if(EMB){addEventListener('pagehide',()=>{if(AUTO.sucio)autoGuardar()});document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&AUTO.sucio)autoGuardar()})}
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
const EFR=['FONDO DE CAJA','EFECTIVO','CAMBIO EFECTIVO','RETIRO RESGUARDO','DEVOLUCION EFECTIVO A CLIENTE','RETIRO POR FALLA DE CAJERO','CAMBIO DE TRANSFERENCIA','CAMBIO DE CHEQUE','VALE DE FALTANTE EN CAJA','SOBRANTE DE CAJA'];
const sys0=()=>({ef:EFR.map(n=>({n,p:'',u:''})),tj:[{n:'TPV SANTANDER - EXPRESS - ECOM',p:'',c:''}],tr:[{n:'SANTANDER-TRANSFERENCIA / DEPO',p:'',c:''}],inf:[{n:'SALDO A FAVOR CREADO',p:'',u:''},{n:'CAJERO - TARJETA',p:'',u:''}]});
const norm=()=>{if(S.caja&&!S.caja.sys)S.caja.sys=sys0();if(S.caja&&!S.caja.ru)S.caja.ru={};if(S.caja&&S.caja.tol==null)S.caja.tol=''};
const SYG={ef:['Efectivo','Forma de pago','Pesos','Dólares'],tj:['Tarjetas','Terminal','Sistema','Comprobado (vouchers / cierre de lote)'],tr:['Transferencias','Cuenta','Sistema','Comprobado (comprobantes / estado de cuenta)'],inf:['Informativos (no se cuadran)','Concepto','Pesos','Dólares']};
const f2=g=>g=='tj'||g=='tr'?'c':'u';
const pev=s=>{let x=String(s??'').trim();if(/^\(.*\)$/.test(x))x='-'+x.slice(1,-1);if(/^[\d,.\s$]+-$/.test(x))x='-'+x.replace(/-\s*$/,'');return ev(x)};
const sm=(a,f)=>r2(a.reduce((x,c)=>x+pev(c[f]),0));
const filled=(c,f)=>String(c.p??'').trim()!==''||String(c[f]??'').trim()!=='';
let CU={rows:[],dict:null,has:false,efP:0,efU:0,tol:0};
const ev=s=>{const m=String(s??'').replace(/,/g,'').match(/[+-]?\s*\d*\.?\d+/g);return m?m.reduce((a,x)=>a+parseFloat(x.replace(/\s/g,'')),0):0};
const r2=x=>Math.round(x*100)/100;
const fmt=(n,k)=>(n||0).toLocaleString('es-MX',{style:'currency',currency:k=='usd'?'USD':'MXN'});
const lab=d=>'$'+(d>=1?d.toLocaleString('es-MX'):d.toFixed(2));
const dl=v=>v===0?'Cuadra':v>0?'Sobrante':'Faltante';
const card=(id,l,c)=>`<div class="c ${c||''}" id="${id}"><small>${l}</small><b></b></div>`;
const set=(id,t)=>{const e=$('#'+id);if(e)e.querySelector('b').textContent=t};
const FMIN=20;const TOLK=['caja','fondon','chica'];const okD=(k,d)=>d===0||(TOLK.includes(k)&&Math.abs(d)<FMIN);
function setR(id,v){const e=$('#'+id);if(!e)return;const kk=id.split('-')[0];if(v!=null&&v!==0&&okD(kk,v)){e.className='c r ok';e.querySelector('small').textContent='Diferencia: '+dl(v)+' permitido (menor a $'+FMIN+')';e.querySelector('b').textContent=fmt(Math.abs(v));return}if(v==null){e.className='c r';e.querySelector('small').textContent='Diferencia';e.querySelector('b').textContent='Captura lo que debe tener';return}e.className='c r '+(v===0?'ok':'bad');e.querySelector('small').textContent='Diferencia: '+dl(v);e.querySelector('b').textContent=fmt(Math.abs(v),id.split('-')[0])}

const conHTML=k=>`<h3>${CONL[k]}</h3><div class="sc"><table><thead><tr><th>Concepto<th>Referencia<th class="n">Monto<th></tr></thead><tbody id="cn-${k}" data-grow="c" data-k="${k}">${S[k].con.map((c,i)=>`<tr data-con><td><input class="t" list="cl" data-cc="c" data-k="${k}" data-i="${i}" value="${esc(c.c)}" placeholder="Concepto"><td><input class="t" data-cc="r" data-k="${k}" data-i="${i}" value="${esc(c.r)}" placeholder="Factura / nota"><td><input class="q" inputmode="decimal" data-q data-cc="m" data-k="${k}" data-i="${i}" value="${esc(c.m)}" placeholder="0"><td><button class="x" data-a="dc" data-k="${k}" data-i="${i}" title="Quitar">×</button></tr>`).join('')}</tbody></table></div><div class="bt"><button data-a="ac" data-k="${k}">+ Agregar concepto</button></div>`;
const vt=(key,title,nb)=>`<h3${nb?' class="nb"':''}>${title}</h3><div class="sc"><table><thead><tr><th>Fecha<th>Factura<th>Nombre<th>Concepto<th class="n">Importe<th></tr></thead><tbody id="${key}-chica" data-grow="v" data-key="${key}">${S.chica[key].map((c,i)=>`<tr><td><input type="date" class="dt" data-vv="f" data-key="${key}" data-i="${i}" value="${esc(c.f)}"><td><input class="t" data-vv="r" data-key="${key}" data-i="${i}" value="${esc(c.r)}"><td><input class="t" data-vv="n" data-key="${key}" data-i="${i}" value="${esc(c.n)}"><td><input class="t" style="min-width:220px" data-vv="c" data-key="${key}" data-i="${i}" value="${esc(c.c)}"><td><input class="q" inputmode="decimal" placeholder="0" data-q data-vv="m" data-key="${key}" data-i="${i}" value="${esc(c.m)}"><td><button class="x" data-a="dv" data-key="${key}" data-i="${i}" title="Quitar">×</button></tr>`).join('')}</tbody><tfoot><tr><td colspan="4">Subtotal<td class="n" id="sub-${key}"><td></tr></tfoot></table></div><div class="bt"><button data-a="av" data-key="${key}">+ Agregar renglón</button></div>`;
const valesHTML=()=>vt('con','Comprobables')+vt('nc','No comprobables',1);
const B=x=>x?`<div class="blk">${x}</div>`:'';
const cg=(...w)=>'<colgroup>'+w.map(x=>`<col style="width:${x}%">`).join('')+'</colgroup>';
const U=['','UN','DOS','TRES','CUATRO','CINCO','SEIS','SIETE','OCHO','NUEVE','DIEZ','ONCE','DOCE','TRECE','CATORCE','QUINCE','DIECISÉIS','DIECISIETE','DIECIOCHO','DIECINUEVE'],VT={2:'VEINTIDÓS',3:'VEINTITRÉS',6:'VEINTISÉIS'};
const DC=['','','VEINTE','TREINTA','CUARENTA','CINCUENTA','SESENTA','SETENTA','OCHENTA','NOVENTA'],CE=['','CIENTO','DOSCIENTOS','TRESCIENTOS','CUATROCIENTOS','QUINIENTOS','SEISCIENTOS','SETECIENTOS','OCHOCIENTOS','NOVECIENTOS'];
const c999=n=>{if(n==100)return'CIEN';const r=n%100;let t='';if(r<20)t=U[r];else if(r<30)t=r==20?'VEINTE':VT[r-20]||'VEINTI'+U[r-20];else t=DC[Math.floor(r/10)]+(r%10?' Y '+U[r%10]:'');return[CE[Math.floor(n/100)],t].filter(Boolean).join(' ')};
const enLetras=(x,k)=>{x=Math.abs(r2(x||0));const e=Math.floor(x),c=Math.round((x-e)*100),mm=Math.floor(e/1e6),th=Math.floor(e%1e6/1000),u=e%1000,p=[];
 if(mm)p.push(mm==1?'UN MILLÓN':c999(mm)+' MILLONES');if(th)p.push(th==1?'MIL':c999(th)+' MIL');if(u)p.push(c999(u));
 return`(${p.join(' ')||'CERO'}${mm&&!th&&!u?' DE':''} ${k=='usd'?(e==1?'DÓLAR':'DÓLARES'):(e==1?'PESO':'PESOS')} ${String(c).padStart(2,'0')}/100 ${k=='usd'?'USD':'M.N.'})`};
const repVales=r=>{const t=(ttl,l,nb)=>B(`<div class="sh">${ttl}</div><table class="rt">${cg(12,15,29,28,16)}<thead><tr><th>Fecha<th>Factura<th>Nombre<th>Concepto<th class="n">Importe</tr></thead><tbody>${l.map(c=>`<tr><td>${esc((c.f||'').split('-').reverse().join('/'))}<td>${esc(c.r)}<td>${esc(c.n)}<td>${esc(c.c)}<td class="n">${fmt(c.v)}`).join('')||'<tr><td colspan="5" class="mu">Sin registros'}</tbody><tfoot><tr><td colspan="4">Subtotal<td class="n">${fmt(r2(l.reduce((x,c)=>x+c.v,0)))}</tfoot></table>`);return t('Vales comprobables',r.con)+t('No comprobables',r.non,1)};
function usdCntHTML(){const s=S.caja;return`<h3>Dólares en caja (USD)</h3><div class="cnt">${DEN.usd.map(g=>`<div class="sc"><table class="den"><thead><tr><th>${g.g} USD<th class="n">Cantidad<th class="n">Importe</tr></thead><tbody>${g.v.map(d=>`<tr data-ud="${d}"><td class="dl">${lab(d)}<td><input class="q" inputmode="decimal" placeholder="0" data-ud="${d}" value="${esc(s.ru[d])}"><td class="n im">`).join('')}</tbody></table></div>`).join('')}</div>`}
const repUsd=()=>{const u=(CU.uRows||[]).filter(x=>x.pz);if(!u.length)return'';return B(`<div class="sh">Conteo de dólares en caja</div><table class="rt">${cg(50,20,30)}<thead><tr><th>Denominación<th class="n">Cantidad<th class="n">Importe</tr></thead><tbody>${u.map(x=>`<tr><td>${lab(x.d)} USD<td class="n">${x.pz}<td class="n">${fmt(x.im,'usd')}`).join('')}</tbody><tfoot><tr><td colspan="2">Total dólares<td class="n">${fmt(CU.uEf,'usd')}</tfoot></table>`)};
function sysHTML(){
 const y=S.caja.sys;
 const t=g=>{const[ti,c1,c2,c3]=SYG[g],f=f2(g);return`<h3 class="sy">${ti}</h3><div class="sc"><table><thead><tr><th>${c1}<th class="n">${c2}<th class="n">${c3}<th></tr></thead><tbody id="sy-${g}" data-grow="s" data-g="${g}">${y[g].map((c,i)=>`<tr><td><input class="t" style="min-width:230px" data-sy="n" data-g="${g}" data-i="${i}" value="${esc(c.n)}"><td><input class="q" inputmode="decimal" placeholder="0.00" data-q data-sy="p" data-g="${g}" data-i="${i}" value="${esc(c.p)}"><td><input class="q" inputmode="decimal" placeholder="0.00" data-q data-sy="${f}" data-g="${g}" data-i="${i}" value="${esc(c[f])}"><td><button class="x" data-a="dsy" data-g="${g}" data-i="${i}" title="Quitar">×</button></tr>`).join('')}</tbody><tfoot><tr><td>TOTALES<td class="n" id="syt-${g}-p"><td class="n" id="syt-${g}-${f}"><td></tr>${g=='ef'?`<tr class="vu"><td>CONTADO EN CAJA<td class="n" id="ef-cp"><td><input class="q" inputmode="decimal" placeholder="Dólares contados" data-usdc value="${esc(S.caja.usdc)}"><td></tr><tr class="vu"><td>DIFERENCIA<td class="n" id="ef-dp"><td class="n" id="ef-du"><td></tr>`:''}</tfoot></table></div><div class="bt"><button data-a="asy" data-g="${g}">+ Agregar renglón</button></div>`};
 return`<h3 class="nb">Corte del sistema (formas de pago)</h3><p class="hint">Copia los importes tal como vienen en el reporte del sistema. Se aceptan negativos con el signo al final (1,424.67-). <b>Regla:</b> en pesos, un faltante o sobrante menor a $20.00 se considera permitido (cumple); de $20.00 en adelante no cumple. Los dólares deben estar exactos como lo marca el sistema. Lo que debe haber en efectivo se escribe en <b>Total según sistema</b> (panel derecho); si lo dejas vacío se usa el TOTAL de efectivo de este corte. Los dólares de la caja se validan aquí: escribe en <b>CONTADO EN CAJA</b> (columna Dólares) los dólares que hay físicamente en la caja.</p>${t('ef')}${t('tj')}${t('tr')}${t('inf')}
 <h3>Cuadre contra sistema</h3><div class="sc" id="cuadre"></div>`}
function secHTML(k){
 const s=S[k];
 const cnt=`<h3>Conteo de efectivo</h3><div class="cnt">${DEN[k].map(g=>`<div class="sc"><table class="den"><thead><tr><th>${g.g}<th class="n">Cantidad<th class="n">Importe</tr></thead><tbody>${g.v.map(d=>`<tr data-d="${d}"><td class="dl">${lab(d)}<td><input class="q" inputmode="decimal" enterkeyhint="next" placeholder="0" data-q data-k="${k}" data-d="${d}" data-c="0" value="${esc((s.r[d]||[])[0])}"><small class="ev"></small><td class="n im">`).join('')}</tbody></table></div>`).join('')}</div>`;
 return`<div class="wk"><div class="mn">${cnt}
 ${k=='chica'?valesHTML():conHTML(k)}${k=='caja'?sysHTML():''}
 <h3>Observaciones</h3><textarea rows="3" data-obs data-k="${k}" placeholder="Escribe aquí las observaciones de este apartado (salen arriba de las firmas)">${esc(s.o)}</textarea></div>
 <aside class="side"><div class="g">${card(k+'-ef','Efectivo contado')}${card(k+'-co',k=='chica'?'Vales (comp. + no)':'Conceptos (+/-)')}${card(k+'-tt','Total','t')}<label class="f c">${REFL[k]}<input class="q" inputmode="decimal" data-ref data-k="${k}" value="${esc(s.ref)}" placeholder="0"></label>${card(k+'-d','Diferencia')}${k=='caja'?card('caja-dict','Dictamen contra corte','r'):''}${card(k+'-bp','Billetes (pzas)')}${card(k+'-mp','Monedas (pzas)')}</div>
 <p class="hint"><b>Enter</b> baja al siguiente renglón · <b>Shift+Enter</b> sube · <b>Tab</b> avanza a la derecha. En el último renglón de conceptos/vales, Enter agrega uno nuevo. Puedes sumar y restar: 100+50-20.</p>
 <div class="meta noprint"><label class="f">Elaboró (este apartado)<input data-sp="e" data-k="${k}" value="${esc(s.e)}" placeholder="${esc(M.e)||'Nombre'}"></label><label class="f">Confirmó (este apartado)<input data-sp="v" data-k="${k}" value="${esc(s.v)}" placeholder="${esc(M.v)||'Nombre'}"></label><button data-a="psec" data-k="${k}">Imprimir solo este apartado</button></div></aside></div>`}

function render(){
 norm();
 $('#meta').innerHTML=`<label class="f">Fecha<input type="date" data-m="f" value="${esc(M.f)}"></label><label class="f">Sucursal<select data-m="s">${SUC.map(x=>`<option${M.s==x?' selected':''}>${x}</option>`).join('')}${SUC.includes(M.s)?'':`<option selected>${esc(M.s)}</option>`}</select></label><label class="f">Elaboró (general)<input data-m="e" value="${esc(M.e)}" placeholder="Nombre"></label><label class="f">Confirmó (general)<input data-m="v" value="${esc(M.v)}" placeholder="Nombre"></label>`;
 $('#nav').innerHTML=Object.entries(NAMES).map(([k,n])=>`<button data-a="tab" data-k="${k}" class="${tab==k?'on':''}">${n}</button>`).join('')+`<span style="flex:1"></span>${EMB?`<span class="cldst${CLD.bad?' bad':(CLD.msg||'').startsWith('☁')?' auto':''}" id="cldst">${esc(CLD.msg||'')}</span>`:`<button data-a="theme">${TL[th]}</button>`}${RO?'':`<button class="pri" data-a="hsave">💾 Guardar${EMB?'':' en historial'}</button>`}<button data-a="new">Nuevo arqueo</button>`;
 $('#app').innerHTML=Object.keys(S).map(k=>`<section class="sec ${tab==k?'on':''}" id="sec-${k}"><h2>${NAMES[k]}</h2>${secHTML(k)}</section>`).join('')+`<section class="sec rep ${tab=='rep'?'on':''}" id="rep"><div class="noprint" id="repsel"><h2>Reporte formal</h2><p class="hint">Elige qué apartados imprimir. Cada uno sale en su propia hoja con sus propias firmas. Si no abre la impresión, usa Ctrl+P.</p>${[['res','Resumen'],...Object.keys(S).map(k=>[k,NAMES[k]])].map(([k,n])=>`<label class="ck"><input type="checkbox" data-sel="${k}" ${sel[k]?'checked':''}> ${n}</label>`).join('')}<label class="f" style="margin:6px 0 10px">Observaciones del resumen<textarea rows="2" data-m="o" placeholder="Salen arriba de las firmas del resumen">${esc(M.o)}</textarea></label><div class="bt"><button class="pri" data-a="print">Imprimir selección</button> <button data-a="all">Seleccionar todo</button></div></div><div id="repbody"></div></section><section class="sec ${tab=='hist'?'on':''}" id="hist">${histHTML()}</section>`;
 calc();
}
const snap=()=>{calc();const tot={};for(const k in R)tot[k]={tot:R[k].tot,ref:R[k].ref,dif:R[k].dif};return{id:M.s+'|'+M.f,f:M.f,s:M.s,e:M.e,v:M.v,at:new Date().toISOString(),tot,S:cl(S),M:cl(M)}};
const upsert=quiet=>{if(RO)return false;const x=snap(),i=H.findIndex(h=>h.id==x.id);if(i>=0&&H[i].uid)x.uid=H[i].uid;if(i<0)H.push(x);else H[i]=x;saveH();if(EMB)cldPut(x,quiet);return i<0};
const hasData=()=>{calc();return Object.values(R).some(r=>r.tot||r.ref)};
function histHTML(){
 const ks=['caja','fondon','usd','chica'],n=s=>H.filter(h=>h.s==s).length,cur=M.s+'|'+M.f;
 const L=H.filter(h=>!hf||h.s==hf).sort((a,b)=>(b.f||'').localeCompare(a.f||'')||(a.s||'').localeCompare(b.s||''));
 const cell=(t,k)=>!t?'<td class="n">—':`<td class="n ${t.dif==null?'':t.dif===0?'hok':'hbad'}" title="Total: ${fmt(t.tot,k)}${t.ref==null?'':' · Debe tener: '+fmt(t.ref,k)}">${t.dif==null?(t.tot?fmt(t.tot,k):'—'):t.dif===0?'Cuadra':dl(t.dif)+' '+fmt(Math.abs(t.dif),k)}`;
 return`<h2>Historial de arqueos</h2><div class="meta" style="margin-bottom:8px;align-items:end"><label class="f">Sucursal<select data-hf>${['',...SUC].map(s=>`<option value="${s}"${hf==s?' selected':''}>${s?s+' ('+n(s)+')':'Todas ('+H.length+')'}</option>`).join('')}</select></label><button data-a="hexp">Exportar respaldo</button>${RO?'':'<button data-a="himp">Importar respaldo</button>'}${EMB?'<button data-a="hrel">↻ Actualizar</button>':''}<input type="file" id="himp" accept=".json,application/json" data-imp hidden></div>
 ${EMB&&CLD.err?`<p class="hint" style="color:var(--bad)"><b>⚠ ${esc(CLD.err)}</b></p>`:''}
 <p class="hint">Se guarda uno por <b>sucursal y fecha</b>: si vuelves a guardar el mismo día, se actualiza. Al abrir otro arqueo o hacer uno nuevo, el actual se guarda solo. ${EMB?'El historial se guarda en <b>Supabase</b> y lo ven todos los usuarios con acceso a Arqueo.'+(RO?' Tu cuenta es de solo consulta.':''):'El historial vive en este navegador: exporta un respaldo de vez en cuando (también sirve para pasarlo a otra computadora).'}</p>
 <div class="sc"><table><thead><tr><th>Fecha<th>Sucursal<th class="n">Caja<th class="n">Fondo revolvente<th class="n">Dólares<th class="n">Caja chica<th>Elaboró<th>Guardado<th></tr></thead><tbody>${L.map(h=>`<tr${h.id==cur?' class="cur"':''}><td>${esc((h.f||'').split('-').reverse().join('/'))}<td><b>${esc(h.s)}</b>${ks.map(k=>cell(h.tot&&h.tot[k],k)).join('')}<td>${esc(h.e)}<td>${h.at?new Date(h.at).toLocaleString('es-MX',{dateStyle:'short',timeStyle:'short'}):''}<td><button data-a="hopen" data-id="${esc(h.id)}">Abrir</button>${RO?'':` <button class="x" data-a="hdel" data-id="${esc(h.id)}">Eliminar</button>`}`).join('')||`<tr><td colspan="9" class="hint">Aún no hay arqueos guardados${hf?' de '+hf:''}.`}</tbody></table></div>`}
function repSec(k,r){
 const used=r.rows.filter(x=>x.pz);
 const cnt=`<div class="sh">Conteo de efectivo</div><table class="rt">${cg(50,20,30)}<thead><tr><th>Denominación<th class="n">Cantidad<th class="n">Importe</tr></thead><tbody>${used.map(x=>`<tr><td>${lab(x.d)}<td class="n">${x.pz}<td class="n">${fmt(x.im,k)}`).join('')||'<tr><td colspan="3" class="mu">Sin conteo capturado'}</tbody><tfoot><tr><td>Billetes: ${r.bp} pzas · Monedas: ${r.mp} pzas<td class="n">${r2(r.bp+r.mp)}<td class="n">${fmt(r.ef,k)}</tfoot></table>`;
 const cons=k!='chica'&&r.con.length?`<div class="sh">Otros conceptos</div><table class="rt">${cg(45,30,25)}<thead><tr><th>Concepto<th>Referencia<th class="n">Importe</tr></thead><tbody>${r.con.map(c=>`<tr><td>${esc(c.c)}<td>${esc(c.r)}<td class="n">${fmt(c.v,k)}`).join('')}</tbody><tfoot><tr><td colspan="2">Subtotal conceptos<td class="n">${fmt(r.co,k)}</tfoot></table>`:'';
 const dif=r.dif==null?'':`<div class="db ${okD(k,r.dif)?'ok':'bad'}"><span>${dl(r.dif)}${r.dif!==0&&okD(k,r.dif)?' permitido':''}</span><b>${fmt(Math.abs(r.dif),k)}</b></div>${r.dif?`<p class="let"><b>${dl(r.dif)} con letra:</b> ${enLetras(r.dif,k)}</p>`:''}`;
 const cierre=`<div class="sh">Cierre</div><table class="rt cl">${cg(68,32)}<tbody><tr><td>Efectivo contado<td class="n">${fmt(r.ef,k)}<tr><td>${k=='chica'?'Vales (comprobables + no comprobables)':'Otros conceptos (+/−)'}<td class="n">${fmt(r.co,k)}<tr class="st"><td>Total<td class="n">${fmt(r.tot,k)}${r.ref==null?'':`<tr><td>${REFL[k]}<td class="n">${fmt(r.ref,k)}`}</tbody></table><p class="let"><b>Total con letra:</b> ${enLetras(r.tot,k)}</p>${dif}`;
 return B(cnt)+B(cons)+(k=='chica'?repVales(r):'')+(k=='caja'?repCorte():'')+B(cierre)}
const resTxt=x=>x.pend?'Pendiente de comprobar':x.ok?(x.d!==0?'Cumple ('+dl(x.d).toLowerCase()+' menor a $'+FMIN+')':'Cumple'):'No cumple ('+dl(x.d).toLowerCase()+')';
function repCorte(){
 const y=S.caja.sys,C=CU;if(!C.has&&!C.rows.length&&!y.inf.some(c=>filled(c,'u')))return'';
 const tb=(g,ttl)=>{const[,c1,c2,c3]=SYG[g],f=f2(g),l=y[g].filter(c=>filled(c,f));if(!l.length)return'';const cu=f=='u'?'usd':'';return B(`<div class="sh">${ttl}</div><table class="rt">${cg(52,24,24)}<thead><tr><th>${c1}<th class="n">${c2}<th class="n">${f=='u'?c3:'Comprobado'}</tr></thead><tbody>${l.map(c=>`<tr><td>${esc(c.n)}<td class="n">${fmt(pev(c.p))}<td class="n">${String(c[f]??'').trim()===''?'—':fmt(pev(c[f]),cu)}`).join('')}</tbody><tfoot><tr><td>Totales<td class="n">${fmt(sm(l,'p'))}<td class="n">${fmt(sm(l,f),cu)}</tfoot></table>`)};
 const cu=C.rows.length?B(`<div class="sh">Cuadre contra sistema${C.tol?' · tolerancia ±'+fmt(C.tol):''}</div><table class="rt">${cg(31,15,17,15,22)}<thead><tr><th>Concepto<th class="n">Sistema<th class="n">Contado / comprobado<th class="n">Diferencia<th>Resultado</tr></thead><tbody>${C.rows.map(x=>`<tr><td>${esc(x.n)}<td class="n">${fmt(x.s,x.k)}<td class="n">${x.pend?'—':fmt(x.c,x.k)}<td class="n">${x.pend?'—':fmt(x.d,x.k)}<td class="${x.pend?'':x.ok?'okc':'badc'}">${resTxt(x)}`).join('')}</tbody></table>${C.dict==null?'':`<div class="db ${C.dict?'ok':'bad'}"><span>Dictamen</span><b>${C.dict?'CUMPLE':'NO CUMPLE'}</b></div>`}${C.pend?`<p class="let">${C.pend} concepto${C.pend>1?'s':''} pendiente${C.pend>1?'s':''} de comprobar (no incluido${C.pend>1?'s':''} en el dictamen).</p>`:''}`):'';
 return tb('ef','Corte del sistema · Efectivo')+tb('tj','Corte del sistema · Tarjetas')+tb('tr','Corte del sistema · Transferencias')+tb('inf','Corte del sistema · Informativos')+cu}
function calc(){
 R={};norm();
 const y=S.caja.sys,efP=sm(y.ef,'p'),efU=sm(y.ef,'u'),has=y.ef.some(c=>filled(c,'u'));
 for(const k in S){
  const s=S[k];let ef=0,mp=0,bp=0;const rows=[];
  DEN[k].forEach(g=>g.v.forEach(d=>{const a=ev((s.r[d]||[])[0]),pz=r2(a),im=r2(pz*d);ef+=im;g.g=='Billetes'?bp+=pz:mp+=pz;rows.push({d,pz,im});
   const tr=$(`#sec-${k} tr[data-d="${d}"]`);if(tr){tr.querySelector('.ev').textContent=/.[+-]/.test(String((s.r[d]||[])[0]||'').replace(/,/g,''))?'= '+pz:'';tr.querySelector('.im').textContent=im?fmt(im,k):''}}));
  const cl=s.con.map(c=>({...c,v:ev(c.m)})),nl=(s.nc||[]).map(c=>({...c,v:ev(c.m)})),con=cl.filter(c=>c.v||c.c||c.n),non=nl.filter(c=>c.v||c.c||c.n),co=r2([...cl,...nl].reduce((x,c)=>x+c.v,0)),tot=r2(ef+co);
  const ref=String(s.ref??'').trim()!==''?ev(s.ref):(k=='caja'&&has?efP:null),dif=ref==null?null:r2(tot-ref);
  if(k=='caja'){const ri=$('input[data-ref][data-k=caja]');if(ri)ri.placeholder=has?efP.toFixed(2)+' (corte)':'0';}
  R[k]={rows,ef:r2(ef),mp:r2(mp),bp:r2(bp),con,non,co,tot,ref,dif};
  set(k+'-ef',fmt(ef,k));set(k+'-co',fmt(co,k));set(k+'-tt',fmt(tot,k));set(k+'-bp',r2(bp));set(k+'-mp',r2(mp));setR(k+'-d',dif);
  if(k=='chica'){const a=$('#sub-con'),b=$('#sub-nc');if(a)a.textContent=fmt(r2(cl.reduce((x,c)=>x+c.v,0)));if(b)b.textContent=fmt(r2(nl.reduce((x,c)=>x+c.v,0)))}
 }
 {const tol=0,rows=[];
  if(R.caja.ref!=null)rows.push({n:'Efectivo en pesos',s:R.caja.ref,c:R.caja.tot,k:'caja'});
  const usdC=String(S.caja.usdc??'').trim()!==''?ev(S.caja.usdc):null;
  if(efU||usdC!=null)rows.push({n:'Efectivo en dólares',s:efU,c:usdC??0,k:'usd',pend:usdC==null});
  {const dt=(id,d,k)=>{const e=$('#'+id);if(!e)return;const ok=d!=null&&(d===0||(id=='ef-dp'&&okD('caja',d)));e.className='n '+(d==null?'':ok?'hok':'hbad');e.textContent=d==null?'—':d===0?'Cuadra':dl(d)+' '+fmt(Math.abs(d),k)+(ok?' (permitido)':'')};
   const cp=$('#ef-cp');if(cp)cp.textContent=fmt(R.caja.tot);
   dt('ef-dp',R.caja.ref==null?null:r2(R.caja.tot-R.caja.ref),'caja');dt('ef-du',usdC==null?null:r2(usdC-efU),'usd')}
  [['tj','Tarjeta'],['tr','Transferencia']].forEach(([g,l])=>y[g].forEach(c=>{if(filled(c,'c'))rows.push({n:l+' · '+(c.n||'(sin nombre)'),s:pev(c.p),c:pev(c.c),k:'caja',pend:String(c.c??'').trim()===''})}));
  rows.forEach(x=>{x.d=r2(x.c-x.s);x.ok=!x.pend&&(x.n=='Efectivo en pesos'?okD('caja',x.d):Math.abs(x.d)<=tol+1e-9)});
  const evd=rows.filter(x=>!x.pend);
  CU={rows,dict:evd.length?evd.every(x=>x.ok):null,pend:rows.length-evd.length,has,efP,efU,tol};
  const tw=$('#tolw');if(tw)tw.textContent=tol>10?'⚠ Tolerancia muy alta, revisa que sea correcta':'';
  for(const g in SYG){const f=f2(g),a=$(`#syt-${g}-p`),b=$(`#syt-${g}-${f}`);if(a)a.textContent=fmt(sm(y[g],'p'));if(b)b.textContent=fmt(sm(y[g],f),f=='u'?'usd':'')}
  const cu=$('#cuadre');if(cu)cu.innerHTML=rows.length?`<table><thead><tr><th>Concepto<th class="n">Sistema<th class="n">Contado / comprobado<th class="n">Diferencia<th>Resultado</tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(x.n)}<td class="n">${fmt(x.s,x.k)}<td class="n">${x.pend?'—':fmt(x.c,x.k)}<td class="n">${x.pend?'—':fmt(x.d,x.k)}<td class="${x.pend?'hpend':x.ok?'hok':'hbad'}">${resTxt(x)}`).join('')}</tbody></table>${CU.pend?`<p class="hint">Los renglones "Pendiente de comprobar" no cuentan para el dictamen hasta que captures lo comprobado.</p>`:''}`:'<p class="hint">Captura el corte para ver el cuadre.</p>';
  const dc=$('#caja-dict');if(dc){dc.className='c r'+(CU.dict==null?'':CU.dict?' ok':' bad');dc.querySelector('b').textContent=CU.dict==null?'Captura el corte':CU.dict?'CUMPLE':'NO CUMPLE';dc.querySelector('small').textContent='Dictamen contra corte'+(CU.pend?' · '+CU.pend+' pendiente'+(CU.pend>1?'s':'')+' de comprobar':'')}}
 const rp=$('#repbody');if(!rp)return;
 const ks=Object.keys(S),fd=M.f.split('-').reverse().join('/');
 const hd=(t,cur)=>`<div class="lh"><div><h2>ARQUEO DE CAJA</h2><small>${t}</small></div><div style="text-align:right"><small>Fecha de arqueo</small><br><b>${esc(fd)}</b></div></div><div class="ib"><div><small>Sucursal</small>${esc(M.s)||'—'}</div><div><small>Apartado</small>${t}</div><div><small>Moneda</small>${cur}</div></div>`;
 const sg=(e,v,o)=>`<div class="blk"><div class="ob"><small>Observaciones</small>${o?'<div>'+esc(o).replace(/\n/g,'<br>')+'</div>':''}</div><div class="sg"><div><b>${esc(e)||'&nbsp;'}</b><small>Elaboró · Nombre y firma</small></div><div><b>${esc(v)||'&nbsp;'}</b><small>Confirmó · Nombre y firma</small></div></div><div class="ft">Documento generado el ${new Date().toLocaleDateString('es-MX')} · Sucursal ${esc(M.s)}</div></div>`;
 const pw=h=>`<div class="pg"><table class="pw"><thead><tr><td><div class="spt"></div></td></tr></thead><tfoot><tr><td><div class="spb"></div></td></tr></tfoot><tbody><tr><td>${h}</td></tr></tbody></table></div>`;
 const dic=k=>{const r=R[k];if(k=='caja'&&CU.dict!=null)return CU.dict;return r.dif==null?null:okD(k,r.dif)};
 const res=pw(`${hd('RESUMEN GENERAL','MXN / USD')}<div class="sh">Resumen por apartado</div><table class="rt">${cg(20,12,17,17,20,14)}<thead><tr><th>Apartado<th>Moneda<th class="n">Total contado<th class="n">Debe tener<th class="n">Diferencia<th>Dictamen</tr></thead><tbody>${ks.map(k=>{const r=R[k],v=dic(k);return`<tr><td>${NAMES[k]}<td>${k=='usd'?'USD':'MXN'}<td class="n">${fmt(r.tot,k)}<td class="n">${r.ref==null?'—':fmt(r.ref,k)}<td class="n ${r.dif==null?'':okD(k,r.dif)?'okc':'badc'}">${r.dif==null?'—':r.dif===0?'Cuadra':dl(r.dif)+' '+fmt(Math.abs(r.dif),k)}<td class="${v==null?'':v?'okc':'badc'}">${v==null?'—':v?'Cumple':'No cumple'}`}).join('')}</tbody></table>${sg(M.e,M.v,M.o)}`);
 const pages=(sel.res?res:'')+ks.filter(k=>sel[k]).map(k=>pw(`${hd(NAMES[k].toUpperCase(),k=='usd'?'USD':'MXN')}${repSec(k,R[k])}${sg(nm(k,'e'),nm(k,'v'),S[k].o)}`)).join('');
 rp.innerHTML=pages||'<p class="hint">Selecciona al menos un apartado.</p>';
}
document.addEventListener('input',e=>{
 const t=e.target,d=t.dataset;
 if(d.hf!==undefined){hf=t.value;render();return}
 if(d.imp!==undefined)return;
 if(d.ud!==undefined){S.caja.ru[d.ud]=t.value;calc();save();return}
 if(d.q!==undefined&&d.d!==undefined)(S[d.k].r[d.d]=S[d.k].r[d.d]||['',''])[d.c]=t.value;
 else if(d.obs!==undefined)S[d.k].o=t.value;
 else if(d.sp)S[d.k][d.sp]=t.value;
 else if(d.sel!==undefined)sel[d.sel]=t.checked?1:0;
 else if(d.vv)S.chica[d.key][d.i][d.vv]=t.value;
 else if(d.sy)S.caja.sys[d.g][d.i][d.sy]=t.value;
 else if(d.usdc!==undefined)S.caja.usdc=t.value;
 else if(d.cc)S[d.k].con[d.i][d.cc]=t.value;
 else if(d.ref!==undefined)S[d.k].ref=t.value;
 else if(d.m)M[d.m]=t.value;
 else return;
 calc();save();
});
document.addEventListener('focusin',e=>{if(e.target.classList.contains('q'))e.target.select()});
document.addEventListener('keydown',e=>{
 const t=e.target;
 if(e.key!='Enter'||!t.matches('input.q,input.t,input.dt'))return;
 e.preventDefault();
 const F='input.q,input.t,input.dt',all=[...t.closest('.sec').querySelectorAll(F)],tr=t.closest('tr'),tb=t.closest('tbody');
 const go=x=>{if(x){x.focus();return true}return false};
 if(tr&&tb){
  const col=[...tr.children].indexOf(t.closest('td')),rows=[...tb.rows],ri=rows.indexOf(tr);
  const pick=r=>r&&r.children[col]&&r.children[col].querySelector('input');
  if(e.shiftKey){if(go(pick(rows[ri-1])))return}
  else{
   if(go(pick(rows[ri+1])))return;
   const g=tb.dataset.grow;
   if(g&&[...tr.querySelectorAll('input:not([type=date])')].some(i=>i.value.trim())){
    if(g=='c')S[tb.dataset.k].con.push({c:'',r:'',m:''});else if(g=='s'){const sg=tb.dataset.g;S.caja.sys[sg].push({n:'',p:'',[f2(sg)]:''})}else S.chica[tb.dataset.key].push({f:today(),r:'',n:'',c:'',m:''});
    const id=tb.id;render();save();const nb=document.getElementById(id);go(pick(nb&&nb.rows[nb.rows.length-1]));return}
   const last=[...tb.querySelectorAll(F)].pop();go(all[all.indexOf(last)+1]);return}
 }
 go(all[all.indexOf(t)+(e.shiftKey?-1:1)]);
});
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-a]');if(!b)return;
 const d=b.dataset,a=d.a,k=d.k,i=+d.i;
 if(a=='tab')tab=k;
 else if(a=='ac'){S[k].con.push({c:'',r:'',m:''});render();save();const l=$(`#cn-${k} tr:last-child input`);if(l)l.focus();return}
 else if(a=='dc')S[k].con.splice(i,1);
 else if(a=='dv')S.chica[d.key].splice(i,1);
 else if(a=='av'){S.chica[d.key].push({f:today(),r:'',n:'',c:'',m:''});render();save();const l=$(`#${d.key}-chica tr:last-child td:nth-child(2) input`);if(l)l.focus();return}
 else if(a=='theme'){th={auto:'light',light:'dark',dark:'auto'}[th];applyTh();try{localStorage.setItem('arqueo_th',th)}catch(x){}}
 else if(a=='psec'){sel={res:0,caja:0,fondon:0,usd:0,chica:0};sel[k]=1;tab='rep';render();setTimeout(()=>{try{window.print()}catch(x){}},80);return}
 else if(a=='all')sel={res:1,caja:1,fondon:1,usd:1,chica:1};
 else if(a=='print'){tab='rep';render();setTimeout(()=>{try{window.print()}catch(x){}},80);return}
 else if(a=='new'){if(!window.cf){window.cf=1;b.textContent='¿Seguro? Toca otra vez';setTimeout(()=>{window.cf=0;b.textContent='Nuevo arqueo'},3000);return}window.cf=0;if(hasData())upsert();const n=fresh(false);n.M.s=M.s;S=n.S;M=n.M;fijar();render();save(1);return}
 else if(a=='hsave'){fijar();const nw=upsert();render();save(1);const nb=$('[data-a=hsave]');if(nb){nb.textContent=nw?'✓ Guardado':'✓ Actualizado';setTimeout(()=>{nb.textContent=EMB?'💾 Guardar':'💾 Guardar en historial'},2000)}return}
 else if(a=='asy'){const g=d.g;S.caja.sys[g].push({n:'',p:'',[f2(g)]:''});render();save();const l=$(`#sy-${g} tr:last-child input`);if(l)l.focus();return}
 else if(a=='dsy')S.caja.sys[d.g].splice(i,1);
 else if(a=='hopen'){if(hasData())upsert();const h=H.find(x=>x.id==d.id);if(!h)return;S=cl(h.S);M=cl(h.M);norm();tab='caja';fijar();render();save(1);return}
 else if(a=='hdel'){const id=d.id;if(window.cfd!==id){window.cfd=id;b.textContent='¿Seguro? Toca otra vez';setTimeout(()=>{if(window.cfd===id){window.cfd=0;b.textContent='Eliminar'}},3000);return}window.cfd=0;const hx=H.find(h=>h.id===id);H=H.filter(h=>h.id!==id);saveH();if(EMB&&hx)cldDel(hx)}
 else if(a=='hrel'){cldLoad();return}
 else if(a=='hexp'){const bl=new Blob([JSON.stringify(H,null,1)],{type:'application/json'}),l=document.createElement('a');l.href=URL.createObjectURL(bl);l.download='historial-arqueos-'+today()+'.json';l.click();setTimeout(()=>URL.revokeObjectURL(l.href),1000);return}
 else if(a=='himp'){$('#himp').click();return}
 render();save(['tab','all','theme','hdel'].includes(a));
});
document.addEventListener('change',e=>{
 const t=e.target;if(t.dataset.imp===undefined||!t.files||!t.files[0])return;
 t.files[0].text().then(tx=>{let a;try{a=JSON.parse(tx)}catch(x){}if(!Array.isArray(a)){alert('El archivo no es un respaldo de historial válido.');return}
  if(RO)return;
  let c=0;const ok=[];a.forEach(x=>{if(!x||!x.id||!x.S||!x.M)return;const i=H.findIndex(h=>h.id==x.id);if(i<0)H.push(x);else H[i]=x;ok.push(x);c++});saveH();render();
  if(!EMB){alert('Arqueos importados: '+c);return}
  (async()=>{let n=0;for(const x of ok){const S0=S,M0=M;S=cl(x.S);M=cl(x.M);calc();const p=snap();S=S0;M=M0;if(await cldPut(p,1))n++}calc();cldMsg('✓ Importados a Supabase: '+n+' de '+c,n<c);cldLoad()})()});
});
render();
if(EMB){cldLoad();try{window.parent.postMessage({type:'arqueo-ready'},location.origin)}catch(e){}}
</script>
</body>
</html>
