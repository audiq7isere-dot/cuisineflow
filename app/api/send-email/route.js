import nodemailer from 'nodemailer';

export async function POST(request){
  try{
    const {to,subject,text,attachments=[]}=await request.json();
    if(!to||!subject||!text)return Response.json({error:'Destinataire, objet et message requis'},{status:400});
    const transporter=nodemailer.createTransport({
      host:process.env.SMTP_HOST||'mail.cuisinepourtouschambery.fr',
      port:Number(process.env.SMTP_PORT||465),
      secure:true,
      auth:{user:process.env.SMTP_USER||'contact@cuisinepourtouschambery.fr',pass:process.env.SMTP_PASSWORD}
    });
    await transporter.sendMail({
      from:'"Cuisine Pour Tous" <contact@cuisinepourtouschambery.fr>',
      replyTo:'contact@cuisinepourtouschambery.fr',to,subject,text,attachments:(attachments||[]).map(a=>({filename:a.filename,path:a.url}))
    });
    return Response.json({ok:true});
  }catch(error){
    console.error('SMTP send error',error);
    return Response.json({error:'Envoi impossible. Vérifiez la configuration SMTP.'},{status:500});
  }
}
