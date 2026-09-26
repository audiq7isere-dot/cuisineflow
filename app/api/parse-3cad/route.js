export const runtime='nodejs';
export const dynamic='force-dynamic';
const clean=v=>(v||'').replace(/\s+/g,' ').trim();
const money=v=>clean(v).replace(/\s/g,'').replace(',','.');
const n=v=>Number(String(v||'0').replace(/\s/g,'').replace(',','.'))||0;

// pdf-parse concatène parfois les colonnes d'un PDF 3CAD. Ce rendu reconstruit
// chaque ligne selon les coordonnées X/Y avant l'analyse des articles.
async function renderPage(pageData){
 const tc=await pageData.getTextContent({normalizeWhitespace:false,disableCombineTextItems:false});
 const rows=[];
 for(const it of tc.items){
  const x=it.transform?.[4]||0,y=it.transform?.[5]||0;
  let row=rows.find(r=>Math.abs(r.y-y)<2);
  if(!row){row={y,items:[]};rows.push(row)}
  row.items.push({x,w:it.width||0,s:it.str||''});
 }
 rows.sort((a,b)=>b.y-a.y);
 return rows.map(r=>{
  r.items.sort((a,b)=>a.x-b.x);let out='',end=null;
  for(const it of r.items){
   if(end!==null&&it.x-end>1.5)out+=' ';
   out+=it.s;end=it.x+it.w;
  }
  return out.trim();
 }).filter(Boolean).join('\n');
}

function parseItems(text){
 const lines=text.split('\n').map(clean).filter(Boolean),items=[];
 // Ligne 3CAD réelle : position + code + désignation + dimensions + UM + quantité + total HT.
 const full=/^(\d{1,4})\s+([A-Z0-9_-]{8,})\s+(.+?)\s+(\d+(?:[.,]\d+)?x\d+(?:[.,]\d+)?x\d+(?:[.,]\d+)?)\s+(PZ|NR|ML|MT|M2|M3|KG)\s+(\d+(?:[,.]\d+)?)\s+([\d\s.]+,\d{2})$/i;
 const header=/^(\d{1,4})\s+([A-Z0-9_-]{8,})(?:\s+(.*))?$/i;
 const detail=/^(.+?)\s+(\d+(?:[.,]\d+)?x\d+(?:[.,]\d+)?x\d+(?:[.,]\d+)?)\s+(PZ|NR|ML|MT|M2|M3|KG)\s+(\d+(?:[,.]\d+)?)\s+([\d\s.]+,\d{2})$/i;
 const push=(position,code,designation,unit,qty,price)=>{
  designation=clean(designation);qty=n(qty);price=n(price);
  if(!designation||!qty||price<0)return;
  items.push({position,code,designation:`${code} — ${designation}`,qty,price_ht:price,vat:20,unit:unit.toUpperCase()});
 };
 for(let i=0;i<lines.length;i++){
  let m=lines[i].match(full);
  if(m){push(m[1],m[2],m[3],m[5],m[6],m[7]);continue}
  const h=lines[i].match(header);if(!h)continue;
  const position=h[1],code=h[2];
  if(!/^(?:TGPK|0000)[A-Z0-9_-]+$/i.test(code))continue;
  let d=clean(h[3]||'').match(detail);
  if(!d){for(let j=i+1;j<Math.min(i+4,lines.length);j++){d=lines[j].match(detail);if(d)break}}
  if(d)push(position,code,d[1],d[3],d[4],d[5]);
 }
 return items.slice(0,250);
}

export async function POST(request){
 try{
  const form=await request.formData(),file=form.get('file');
  if(!file||typeof file.arrayBuffer!=='function')return Response.json({error:'PDF 3CAD manquant.'},{status:400});
  const mod=await import('pdf-parse/lib/pdf-parse.js'),pdf=mod.default||mod;
  const buffer=Buffer.from(await file.arrayBuffer());
  // Une extraction simple reste utile pour les coordonnées; l'extraction layout sert aux articles.
  const basic=await pdf(buffer),text=(basic.text||'').replace(/\r/g,'');
  const laid=await pdf(buffer,{pagerender:renderPage}),layoutText=(laid.text||'').replace(/\r/g,'');
  const start=text.search(/CLIENT\s*:/i),tail=start>=0?text.slice(start+text.slice(start).match(/CLIENT\s*:/i)[0].length):text;
  const end=tail.search(/(?:CARACTERISTIQUES\s+PROJET|TOTALS|Rd\s+HM\s+Code)/i),block=end>=0?tail.slice(0,end):tail.slice(0,1800),raw=block.split('\n').map(clean).filter(Boolean);
  const email=(raw.find(x=>/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(x))||'').match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0]||'';
  const pl=raw.find(x=>/(?:\+33|0)[1-9](?:[ .-]?\d{2}){4}/.test(x))||'',phone=(pl.match(/(?:\+33|0)[1-9](?:[ .-]?\d{2}){4}/)?.[0]||'').replace(/[ .-]/g,'');
  const ll=raw.find(x=>/\b\d{5}\s+[A-Za-zÀ-ÿ]/.test(x))||'',lm=ll.match(/\b(\d{5})\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’ -]*?)(?:\s*\([^)]*\))?$/);
  const excluded=x=>/^(?:Nr\.?\s*(?:Server|Client)|Date|REf\.?\s*Client|Tel\.?|e-?mail|CLIENT\s*:)/i.test(x)||/@/.test(x)||/\b\d{5}\b/.test(x)||/(?:\+33|0)[1-9](?:[ .-]?\d{2}){4}/.test(x)||/^\d+$/.test(x);
  const c=raw.filter(x=>!excluded(x)),address=c.find(x=>/\b(?:rue|avenue|av\.?|all[ée]e|chemin|route|boulevard|bd\.?|impasse|place|lotissement|résidence|residence)\b/i.test(x))||'',ai=address?c.indexOf(address):-1,name=clean((ai>0?c[ai-1]:c.find(x=>/^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’ .-]{1,60}$/.test(x))||'').replace(/^CLIENT\s*:\s*/i,''));
  let items=parseItems(layoutText);if(!items.length)items=parseItems(text);
  // Détecte la TVA réellement imprimée sur le devis 3CAD (10 % ou 20 %) au lieu de forcer 20 %.
  const vatMatches=[...text.matchAll(/(?:TVA|TAXE)(?:\s+À|\s+A)?\s*(?:TAUX)?\s*[:=]?\s*(10|20)(?:[.,]0+)?\s*%/gi)].map(m=>Number(m[1]));
  const vatRate=vatMatches.includes(10)?10:vatMatches.includes(20)?20:(text.match(/\b10(?:[.,]0+)?\s*%/)?10:20);
  items=items.map(it=>({...it,vat:vatRate}));
  const totalTtc=text.match(/TOTAL\s+TVA\s+INCLUE\s*€?\.?\s*([\d\s.,]+)/i)?.[1]||'',discount=text.match(/REMISE\s+GENERALE\s+([\d.,]+)\s*%/i)?.[1]||'',clientNumber=text.match(/Nr\.?\s*Client\s*:\s*(\d+)/i)?.[1]||'',quoteDate=text.match(/Date\s*:\s*(\d{2}\/\d{2}\/\d{4})/i)?.[1]||'';
  return Response.json({client_name:name,client_address:address,client_postal_code:lm?.[1]||'',client_city:clean(lm?.[2]||''),client_phone:phone,client_email:email,total:totalTtc?money(totalTtc):'',discount:discount?money(discount):'0',client_number:clientNumber,quote_date:quoteDate,vat_rate:vatRate,items,item_count:items.length});
 }catch(error){console.error('3CAD parse error',error);return Response.json({error:'Impossible de lire ce PDF 3CAD.'},{status:500})}
}
