import {NextResponse} from 'next/server';
const URL='https://ssukleiuwjqmfruagmwk.supabase.co';
const KEY='sb_publishable_pZrsR-vEyCNYXZdk-qSVbQ_EDD0KwyJ';
export const dynamic='force-dynamic';
export async function GET(){try{const u=URL+'/rest/v1/quotes?select=quote_number,created_at&order=created_at.desc&limit=1';const r=await fetch(u,{headers:{apikey:KEY,Authorization:'Bearer '+KEY},cache:'no-store'});if(!r.ok)return NextResponse.json({error:'lookup_failed'},{status:500});const rows=await r.json();return NextResponse.json({quote_number:rows?.[0]?.quote_number||null},{headers:{'Cache-Control':'no-store'}})}catch{return NextResponse.json({error:'lookup_failed'},{status:500})}}
