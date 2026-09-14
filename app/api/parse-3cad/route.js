export const runtime='nodejs';
export const dynamic='force-dynamic';
const clean=v=>(v||'').replace(/\s+/g,' ').trim();
const money=v=>clean(v).replace(/\s/g,'').replace(',','.');
const n=v=>Number(String(v||'0').replace(/\s/g,'').replace(',','.'))||0;

function parseItems(text){
  const lines=text.split('\n').map(clean).filter(Boolean),items=[];
  const header=/^(\d{1,4})\s+([A-Z0-9][A-Z0-9_-]{5,})(?:\s+(.*))?$/i;
  const detail=/^(.*?)\s+([A-Z]{1,4})\s+(\d+(?:[,.]\d+)?)\s+([\d\s.]+,\d{2})$/i;
  for(let i=0;i<lines.length;i++){
    const h=lines[i].match(header);if(!h)continue;
    const position=h[1],code=h[2];
    // Exclut les numéros administratifs qui peuvent ressembler à des codes.
    if(/^(?:130108189|860\d+|000210)$/.test(code))continue;
    let candidate=clean(h[3]||''),found=null;
    if(candidate)found=candidate.match(detail);
    if(!found){
      for(let j=i+1;j<Math.min(i+5,lines.length);j++){
        if(header.test(lines[j]))break;
        const m=lines[j].match(detail);if(m){found=m;break}
      }
    }
    if(!found)continue;
    const designation=clean(found[1]);
    const unit=found[2].toUpperCase();
    const qty=n(found[3]),price=n(found[4]);
    if(!designation||!qty||price<0||/^(?:OUVERTURE|GAMME DE PRIX|PORTE AU SOL|ANGLE|TYPE |COULEUR |EQUIPEMENT )/i.test(designation))continue;
    items.push({position,code,designation:`${code} — ${designation}`,qty,price_ht:price,vat:20,unit});
  }
  return items.slice(0,250);
}

export async function POST(request){
 try{
  const form=await request.formData(),file=form.get('file');
  if(!file||typeof file.arrayBuffer!=='function')return Response.json({error:'PDF 3CAD manquant.'},{status:400});
  const mod=await import('pdf-parse/lib/pdf-parse.js'),pdf=mod.default||mod;
  const parsed=await pdf(Buffer.from(await file.arrayBuffer())),text=(parsed.text||'').replace(/\r/g,'');
  const start=text.search(/CLIENT\s*:/i),tail=start>=0?text.slice(start+text.slice(start).match(/CLIENT\s*:/i)[0].length):text;
  const end=tail.search(/(?:CARACTERISTIQUES\s+PROJET|TOTALS|Rd\s+HM\s+Code)/i),block=end>=0?tail.slice(0,end):tail.slice(0,1800),raw=block.split('\n').map(clean).filter(Boolean);
  const email=(raw.find(x=>/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(x))||'').match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0]||'';
  const pl=raw.find(x=>/(?:\+33|0)[1-9](?:[ .-]?\d{2}){4}/.test(x))||'',phone=(pl.match(/(?:\+33|0)[1-9](?:[ .-]?\d{2}){4}/)?.[0]||'').replace(/[ .-]/g,'');
  const ll=raw.find(x=>/\b\d{5}\s+[A-Za-zÀ-ÿ]/.test(x))||'',lm=ll.match(/\b(\d{5})\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’ -]*?)(?:\s*\([^)]*\))?$/);
  const excluded=x=>/^(?:Nr\.?\s*(?:Server|Client)|Date|REf\.?\s*Client|Tel\.?|e-?mail|CLIENT\s*:)/i.test(x)||/@/.test(x)||/\b\d{5}\b/.test(x)||/(?:\+33|0)[1-9](?:[ .-]?\d{2}){4}/.test(x)||/^\d+$/.test(x);
  const c=raw.filter(x=>!excluded(x)),address=c.find(x=>/\b(?:rue|avenue|av\.?|all[ée]e|chemin|route|boulevard|bd\.?|impasse|place|lotissement|résidence|residence)\b/i.test(x))||'',ai=address?c.indexOf(address):-1,name=clean((ai>0?c[ai-1]:c.find(x=>/^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’ .-]{1,60}$/.test(x))||'').replace(/^CLIENT\s*:\s*/i,''));
  const items=parseItems(text);
  const totalTtc=text.match(/TOTAL\s+TVA\s+INCLUE\s*€?\.?\s*([\d\s.,]+)/i)?.[1]||'',discount=text.match(/REMISE\s+GENERALE\s+([\d.,]+)\s*%/i)?.[1]||'',clientNumber=text.match(/Nr\.?\s*Client\s*:\s*(\d+)/i)?.[1]||'',quoteDate=text.match(/Date\s*:\s*(\d{2}\/\d{2}\/\d{4})/i)?.[1]||'';
  return Response.json({client_name:name,client_address:address,client_postal_code:lm?.[1]||'',client_city:clean(lm?.[2]||''),client_phone:phone,client_email:email,total:totalTtc?money(totalTtc):'',discount:discount?money(discount):'0',client_number:clientNumber,quote_date:quoteDate,items});
 }catch(error){console.error('3CAD parse error',error);return Response.json({error:'Impossible de lire ce PDF 3CAD.'},{status:500})}
}
