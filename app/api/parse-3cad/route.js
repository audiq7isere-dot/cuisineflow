export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const clean = v => (v || '').replace(/\s+/g, ' ').trim();
const money = v => clean(v).replace(/\s/g, '').replace(',', '.');

export async function POST(request) {
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!file || typeof file.arrayBuffer !== 'function') return Response.json({error:'PDF 3CAD manquant.'},{status:400});

    const mod = await import('pdf-parse/lib/pdf-parse.js');
    const pdf = mod.default || mod;
    const parsed = await pdf(Buffer.from(await file.arrayBuffer()));
    const text = (parsed.text || '').replace(/\r/g,'');

    // Les exports 3CAD mélangent parfois les colonnes lors de l'extraction PDF.
    // On s'ancre donc sur CLIENT: et sur les valeurs reconnaissables plutôt que sur une position fixe.
    const start = text.search(/CLIENT\s*:/i);
    const tail = start >= 0 ? text.slice(start + text.slice(start).match(/CLIENT\s*:/i)[0].length) : text;
    const endMatch = tail.search(/(?:CARACTERISTIQUES\s+PROJET|TOTALS|Rd\s+HM\s+Code)/i);
    const block = endMatch >= 0 ? tail.slice(0,endMatch) : tail.slice(0,1800);
    const rawLines = block.split('\n').map(clean).filter(Boolean);

    const emailLine = rawLines.find(x => /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(x)) || '';
    const email = emailLine.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0] || '';
    const phoneLine = rawLines.find(x => /(?:Tel\.?\s*:?)?\s*(?:\+33|0)[1-9](?:[ .-]?\d{2}){4}/i.test(x)) || '';
    const phoneRaw = phoneLine.match(/(?:\+33|0)[1-9](?:[ .-]?\d{2}){4}/)?.[0] || '';
    const phone = phoneRaw.replace(/[ .-]/g,'');

    const localityLine = rawLines.find(x => /\b\d{5}\s+[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’ -]+(?:\s*\([^)]*\))?/.test(x)) || '';
    const localityMatch = localityLine.match(/\b(\d{5})\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’ -]*?)(?:\s*\([^)]*\))?$/);
    const postal = localityMatch?.[1] || '';
    const city = clean(localityMatch?.[2] || '');

    const excluded = x => /^(?:Nr\.?\s*(?:Server|Client)|Date|REf\.?\s*Client|Tel\.?|e-?mail|CLIENT\s*:)/i.test(x) || /@/.test(x) || /\b\d{5}\b/.test(x) || /(?:\+33|0)[1-9](?:[ .-]?\d{2}){4}/.test(x) || /^\d+$/.test(x);
    const candidates = rawLines.filter(x => !excluded(x));
    const address = candidates.find(x => /\b(?:rue|avenue|av\.?|all[ée]e|chemin|route|boulevard|bd\.?|impasse|place|lotissement|résidence|residence)\b/i.test(x)) || '';
    const addressIndex = address ? candidates.indexOf(address) : -1;
    let name = addressIndex > 0 ? candidates[addressIndex-1] : candidates.find(x => /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’ .-]{1,60}$/.test(x)) || '';
    name = clean(name.replace(/^CLIENT\s*:\s*/i,''));

    const totalTtc = text.match(/TOTAL\s+TVA\s+INCLUE\s*€?\.?\s*([\d\s.,]+)/i)?.[1] || '';
    const discount = text.match(/REMISE\s+GENERALE\s+([\d.,]+)\s*%/i)?.[1] || '';
    const clientNumber = text.match(/Nr\.?\s*Client\s*:\s*(\d+)/i)?.[1] || '';
    const quoteDate = text.match(/Date\s*:\s*(\d{2}\/\d{2}\/\d{4})/i)?.[1] || '';

    return Response.json({
      client_name:name,
      client_address:address,
      client_postal_code:postal,
      client_city:city,
      client_phone:phone,
      client_email:email,
      total:totalTtc?money(totalTtc):'',
      discount:discount?money(discount):'0',
      client_number:clientNumber,
      quote_date:quoteDate
    });
  } catch(error) {
    console.error('3CAD parse error',error);
    return Response.json({error:'Impossible de lire ce PDF 3CAD.'},{status:500});
  }
}
