import {ImapFlow} from 'imapflow';
import {simpleParser} from 'mailparser';
import {mailboxAccess} from '../mail-access';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request){
 if(!await mailboxAccess(request))return Response.json({error:'Accès messagerie refusé'},{status:403});
 const client=new ImapFlow({host:process.env.IMAP_HOST,port:Number(process.env.IMAP_PORT||993),secure:true,auth:{user:process.env.IMAP_USER,pass:process.env.IMAP_PASSWORD},logger:false,connectionTimeout:8000,greetingTimeout:8000,socketTimeout:15000});
 try{
 await client.connect();
 const lock=await client.getMailboxLock('INBOX',{readOnly:true});
 try{
 const messages=[];
 const count=client.mailbox.exists;
 if(count)for await(const m of client.fetch(Math.max(1,count-19)+':'+count,{uid:true,envelope:true,flags:true,bodyStructure:true})){
 messages.push({id:'imap-'+m.uid,uid:m.uid,uidValidity:String(client.mailbox.uidValidity),from_address:m.envelope?.from?.map(a=>a.address).join(', '),subject:m.envelope?.subject,received_at:m.envelope?.date,read_at:m.flags?.has('\\Seen')?'read':null});
 }
 const uid=new URL(request.url).searchParams.get('uid');
 if(uid&&/^\d+$/.test(uid)){
 const m=await client.fetchOne(uid,{source:true,size:true},{uid:true});
 if(!m?.source)return Response.json({error:'Message introuvable'},{status:404});
 const parsed=await simpleParser(m.source);
 return Response.json({text_body:parsed.text||'',attachments:parsed.attachments.map(a=>({filename:a.filename,size:a.size}))},{headers:{'Cache-Control':'no-store'}});
 }
 return Response.json({messages:messages.reverse()},{headers:{'Cache-Control':'no-store'}});
 }finally{lock.release()}
 }catch(e){const code=String(e.code||'UNKNOWN');const reason=e.authenticationFailed?'AUTH':(['ENOTFOUND','EAI_AGAIN','ECONNREFUSED','ETIMEDOUT','ECONNRESET','ETIMEOUT','CERT_HAS_EXPIRED','ERR_TLS_CERT_ALTNAME_INVALID','SELF_SIGNED_CERT_IN_CHAIN'].includes(code)?code:'UNKNOWN');console.warn('IMAP diagnostic',reason);return Response.json({error:'Connexion IMAP impossible. Diagnostic : '+reason},{status:502})}
 finally{client.close()}
}

export async function DELETE(request){
 if(!await mailboxAccess(request))return Response.json({error:'Accès messagerie refusé'},{status:403});
 const body=await request.json().catch(()=>null);
 if(!body||!Number.isSafeInteger(body.uid)||body.uid<1||!/^\d+$/.test(String(body.uidValidity)))return Response.json({error:'Message invalide. Synchronisez la boîte.'},{status:400});
 const client=new ImapFlow({host:process.env.IMAP_HOST,port:Number(process.env.IMAP_PORT||993),secure:true,auth:{user:process.env.IMAP_USER,pass:process.env.IMAP_PASSWORD},logger:false,connectionTimeout:8000,greetingTimeout:8000,socketTimeout:15000});
 try{
 await client.connect();
 const folders=await client.list();
 const trash=folders.find(f=>f.specialUse==='\\Trash'&&!f.flags?.has('\\Noselect'));
 if(!trash||trash.path.toUpperCase()==='INBOX')return Response.json({error:'Corbeille IMAP introuvable. Aucun message supprimé.'},{status:409});
 const lock=await client.getMailboxLock('INBOX');
 try{
 if(String(client.mailbox.uidValidity)!==String(body.uidValidity))return Response.json({error:'Boîte modifiée. Synchronisez avant de réessayer.'},{status:409});
 const message=await client.fetchOne(String(body.uid),{uid:true},{uid:true});
 if(!message)return Response.json({error:'Message introuvable. Synchronisez la boîte.'},{status:404});
 const moved=await client.messageMove(String(body.uid),trash.path,{uid:true});
 if(!moved)return Response.json({error:'Déplacement non confirmé.'},{status:502});
 return Response.json({ok:true});
 }finally{lock.release()}
 }catch{return Response.json({error:'Déplacement vers la corbeille non confirmé. Synchronisez avant de réessayer.'},{status:502})}
 finally{client.close()}
}
