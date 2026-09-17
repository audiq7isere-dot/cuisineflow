import nodemailer from 'nodemailer';
import {createClient} from '@supabase/supabase-js';

const SUPABASE_URL='https://ssukleiuwjqmfruagmwk.supabase.co';
const ORG='573a3535-2fe0-428d-9335-3b61a1ae50d8';
const DAY=86400000;

export async function GET(request){
  try{
    const secret=process.env.CRON_SECRET;
    if(secret&&request.headers.get('authorization')!==`Bearer ${secret}`)return Response.json({error:'Unauthorized'},{status:401});
    const supabase=createClient(SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'sb_publishable_pZrsR-vEyCNYXZdk-qSVbQ_EDD0KwyJ');
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const {data:quotes,error}=await supabase.from('quotes').select('*').eq('organization_id',ORG).lte('decision_date',today);
    if(error)throw error;
    const transporter=nodemailer.createTransport({host:process.env.SMTP_HOST||'mail.cuisinepourtouschambery.fr',port:Number(process.env.SMTP_PORT||465),secure:true,auth:{user:process.env.SMTP_USER||'contact@cuisinepourtouschambery.fr',pass:process.env.SMTP_PASSWORD}});
    let firstSent=0,secondSent=0,skipped=0;
    for(const q of quotes||[]){
      const status=(q.status||'').toLowerCase();
      if(!q.client_email||q.signed_order_path||['accepted','won','accepté','commande','lost','perdu'].includes(status)){skipped++;continue}
      const name=q.client_first_name||q.client_name||'';
      const subject=`Votre projet cuisine${q.quote_number?' - '+q.quote_number:''}`;
      if(!q.email_sent_at){
        const text=`Bonjour ${name},\n\nJe reviens vers vous concernant votre projet cuisine et le devis remis. Avez-vous pu avancer dans votre réflexion ?\n\nJe reste à votre disposition pour répondre à vos questions ou ajuster votre projet si nécessaire.\n\nBien cordialement,\nCuisine Pour Tous\ncontact@cuisinepourtouschambery.fr`;
        await transporter.sendMail({from:'"Cuisine Pour Tous" <contact@cuisinepourtouschambery.fr>',replyTo:'contact@cuisinepourtouschambery.fr',to:q.client_email,subject,text});
        const {error:updateError}=await supabase.from('quotes').update({email_sent_at:new Date().toISOString()}).eq('id',q.id);if(updateError)throw updateError;firstSent++;continue;
      }
      const elapsed=Date.now()-new Date(q.email_sent_at).getTime();
      const marker='[RELANCE_AUTO_2_ENVOYEE]';
      if(elapsed>=3*DAY&&!String(q.notes||'').includes(marker)){
        const text=`Bonjour ${name},\n\nJe me permets de revenir vers vous une seconde fois concernant votre projet cuisine.\n\nAvez-vous eu l’occasion de prendre une décision concernant votre devis ? Si vous souhaitez modifier certains éléments, le budget ou l’aménagement, nous pouvons bien sûr revoir ensemble votre projet.\n\nN’hésitez pas à me répondre directement à cet email.\n\nBien cordialement,\nCuisine Pour Tous\ncontact@cuisinepourtouschambery.fr`;
        await transporter.sendMail({from:'"Cuisine Pour Tous" <contact@cuisinepourtouschambery.fr>',replyTo:'contact@cuisinepourtouschambery.fr',to:q.client_email,subject:`Relance - ${subject}`,text});
        const notes=[q.notes||'',marker].filter(Boolean).join('\n');
        const {error:updateError}=await supabase.from('quotes').update({notes}).eq('id',q.id);if(updateError)throw updateError;secondSent++;
      }
    }
    return Response.json({ok:true,date:today,firstSent,secondSent,skipped});
  }catch(error){console.error('Quote reminder cron error',error);return Response.json({error:error.message||'Erreur relance automatique'},{status:500})}
}
