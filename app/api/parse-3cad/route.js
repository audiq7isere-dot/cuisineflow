import * as pdfParseModule from 'pdf-parse';

export const runtime = 'nodejs';

const clean = v => (v || '').replace(/\s+/g, ' ').trim();
const money = v => clean(v).replace(/\s/g, '').replace(',', '.');

export async function POST(request) {
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!file || typeof file.arrayBuffer !== 'function') {
      return Response.json({ error: 'PDF 3CAD manquant.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const pdf = pdfParseModule.default || pdfParseModule;
    const parsed = await pdf(buffer);
    const text = (parsed.text || '').replace(/\r/g, '');

    const clientBlock = text.match(/CLIENT\s*:\s*([\s\S]*?)(?:REf\.?\s*Client|CARACTERISTIQUES\s+PROJET|Rd\s+HM\s+Code|TOTALS)/i)?.[1] || '';
    const lines = clientBlock.split('\n').map(clean).filter(Boolean);
    const emailIndex = lines.findIndex(x => /e-?mail\s*:/i.test(x));
    const phoneIndex = lines.findIndex(x => /Tel\.?\s*:/i.test(x));
    const email = clean((lines[emailIndex] || '').replace(/^.*?e-?mail\s*:\s*/i, ''));
    const phone = clean((lines[phoneIndex] || '').replace(/^.*?Tel\.?\s*:\s*/i, ''));
    const identityLines = lines.filter(x => !/^(Tel\.?|e-?mail\s*:)/i.test(x));
    const name = identityLines[0] || '';
    const address = identityLines[1] || '';
    const locality = identityLines[2] || '';
    const localityMatch = locality.match(/\b(\d{5})\s+(.+?)(?:\s*\([^)]*\))?$/);
    const postalCode = localityMatch?.[1] || '';
    const city = clean(localityMatch?.[2] || '');

    const totalTtc = text.match(/TOTAL\s+TVA\s+INCLUE\s*€?\.?\s*([\d\s.,]+)/i)?.[1] || '';
    const discount = text.match(/REMISE\s+GENERALE\s+([\d.,]+)\s*%/i)?.[1] || '';
    const clientNumber = text.match(/Nr\.?\s*Client\s*:\s*(\d+)/i)?.[1] || '';
    const quoteDate = text.match(/Date\s*:\s*(\d{2}\/\d{2}\/\d{4})/i)?.[1] || '';

    return Response.json({
      client_name: name,
      client_address: address,
      client_postal_code: postalCode,
      client_city: city,
      client_phone: phone,
      client_email: email,
      total: totalTtc ? money(totalTtc) : '',
      discount: discount ? money(discount) : '0',
      client_number: clientNumber,
      quote_date: quoteDate,
    });
  } catch (error) {
    console.error('3CAD parse error', error);
    return Response.json({ error: 'Impossible de lire ce PDF 3CAD.' }, { status: 500 });
  }
}
