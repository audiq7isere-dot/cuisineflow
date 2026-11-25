import nodemailer from 'nodemailer';
import {mailboxAccess} from '../mail-access';

export async function POST(request){
  try{
    if(!await mailboxAccess(request))return Response.json({error:'Accès messagerie refusé'},{status:403});
    const multipart=(request.headers.get('content-type')||'').startsWith('multipart/form-data');
    let payload,uploads=[];
    if(multipart){const form=await request.formData();payload={to:form.get('to'),subject:form.get('subject'),text:form.get('text')};const files=form.getAll('files');if(files.some(f=>typeof f==='string')||files.reduce((n,f)=>n+f.size,0)>3*1024*1024)return Response.json({error:'Pièces jointes : 3 Mo au total maximum.'},{status:413});uploads=await Promise.all(files.map(async f=>({filename:f.name,content:Buffer.from(await f.arrayBuffer())})));}else payload=await request.json();
    const {to,subject,text,attachments=[]}=payload;
    if(!to||!subject||!text)return Response.json({error:'Destinataire, objet et message requis'},{status:400});
    const transporter=nodemailer.createTransport({
      host:process.env.SMTP_HOST||'mail.cuisinepourtouschambery.fr',
      port:Number(process.env.SMTP_PORT||465),
      secure:true,
      auth:{user:process.env.SMTP_USER||'contact@cuisinepourtouschambery.fr',pass:process.env.SMTP_PASSWORD}
    });
    await transporter.sendMail({
      from:'"Cuisine Pour Tous" <contact@cuisinepourtouschambery.fr>',
      replyTo:'contact@cuisinepourtouschambery.fr',to,subject,text,attachments:[...uploads,...(attachments||[]).map(a=>({filename:a.filename,path:validateAttachment(a.url)}))]
    });
    return Response.json({ok:true});
  }catch(error){
    console.error('SMTP send error',error);
    return Response.json({error:'Envoi impossible. Vérifiez la configuration SMTP.'},{status:500});
  }
}

function validateAttachment(value){const u=new URL(value);if(u.origin!=='https://ssukleiuwjqmfruagmwk.supabase.co'||!u.pathname.startsWith('/storage/v1/object/sign/quote-documents/573a3535-2fe0-428d-9335-3b61a1ae50d8/'))throw Error('Pièce jointe non autorisée');return u.href}
