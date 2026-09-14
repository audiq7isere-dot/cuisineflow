'use client';
import {useEffect,useState} from 'react';
import {createClient} from '@supabase/supabase-js';
const sb=createClient('https://ssukleiuwjqmfruagmwk.supabase.co','sb_publishable_pZrsR-vEyCNYXZdk-qSVbQ_EDD0KwyJ');
const ORG='573a3535-2fe0-428d-9335-3b61a1ae50d8';
export default function LatestQuote(){const[msg,setMsg]=useState('Ouverture du devis…');useEffect(()=>{let stop=false,timer;const started=Number(new URLSearchParams(location.search).get('after'))||Date.now()-15000;async function check(){if(stop)return;const{data,error}=await sb.from('quotes').select('quote_number,created_at').eq('organization_id',ORG).gte('created_at',new Date(started-5000).toISOString()).order('created_at',{ascending:false}).limit(1);if(data?.[0]?.quote_number){location.replace('/devis-edit?number='+encodeURIComponent(data[0].quote_number));return}if(error)setMsg('Finalisation de l’enregistrement…');timer=setTimeout(check,700)}check();return()=>{stop=true;clearTimeout(timer)}},[]);return <main style={{fontFamily:'Arial',padding:40,fontSize:18}}>{msg}</main>}
