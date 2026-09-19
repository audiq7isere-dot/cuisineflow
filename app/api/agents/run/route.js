import {NextResponse} from 'next/server';
import {agentById} from '../../../lib/agents';
export async function POST(req){
 const body=await req.json().catch(()=>({})); const agent=agentById(body.agentId);
 const task=String(body.task||'').trim();
 if(!task)return NextResponse.json({ok:false,error:'Tâche manquante'},{status:400});
 return NextResponse.json({ok:true,agent:agent.name,task,status:'prepared',message:`${agent.name} a enregistré la demande. Connectez un fournisseur IA côté serveur pour exécuter l'analyse générative; aucune clé ne doit être exposée au navigateur.`});
}
