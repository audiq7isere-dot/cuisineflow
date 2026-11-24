import {createClient} from '@supabase/supabase-js';
export async function mailboxAccess(request){
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
 if(!token)return false;
 const sb=createClient('https://ssukleiuwjqmfruagmwk.supabase.co','sb_publishable_pZrsR-vEyCNYXZdk-qSVbQ_EDD0KwyJ',{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error}=await sb.auth.getUser(token);
 if(error||!user)return false;
 const {data, error: membershipError}=await sb.from('memberships').select('id').eq('user_id',user.id).eq('organization_id','573a3535-2fe0-428d-9335-3b61a1ae50d8').limit(1);
 return !membershipError&&!!data?.length;
}
