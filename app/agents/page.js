'use client';
import {useMemo,useState} from 'react';
import {agents} from '../lib/agents';
export default function AgentsPage(){
 const [selected,setSelected]=useState(agents[0]); const [input,setInput]=useState('');
 const suggestions=useMemo(()=>({
 director:["Analyser les priorités du jour","Quels dossiers dois-je traiter en premier ?","Préparer mon plan commercial"],
 prospecting:["Préparer une campagne de prospection","Définir mes meilleures cibles B2B","Créer une séquence de contact"],
 qualification:["Quels prospects sont prioritaires ?","Créer une grille de qualification"],
 followup:["Préparer les relances devis","Préparer les relances prospects"],
 performance:["Quels KPI dois-je suivre ?","Comment améliorer mon taux de transformation ?"]
 }[selected.id]||["Préparer les prochaines actions","Analyser les points à surveiller"]),[selected]);
 function run(text){setInput(text)}
 return <main style={{padding:24,maxWidth:1250,margin:'0 auto'}}>
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
   <div><h1 style={{marginBottom:4}}>Centre IA CuisineFlow</h1><p style={{marginTop:0,color:'#64748b'}}>14 agents spécialisés pour piloter et développer Cuisine Pour Tous.</p></div>
   <a href="/" style={{padding:'10px 14px',border:'1px solid #ddd',borderRadius:10,textDecoration:'none'}}>← CuisineFlow</a>
  </div>
  <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12}}>
   {agents.map(a=><button key={a.id} onClick={()=>setSelected(a)} style={{textAlign:'left',padding:16,borderRadius:14,border:selected.id===a.id?'2px solid #111':'1px solid #ddd',background:'#fff',cursor:'pointer'}}>
    <div style={{fontSize:26}}>{a.icon}</div><b>{a.name}</b><div style={{fontSize:13,color:'#64748b',marginTop:6}}>{a.role}</div>
   </button>)}
  </section>
  <section style={{marginTop:20,padding:20,border:'1px solid #ddd',borderRadius:16,background:'#fff'}}>
   <h2>{selected.icon} {selected.name}</h2><p>{selected.role}</p>
   <div style={{display:'flex',gap:8,flexWrap:'wrap',margin:'14px 0'}}>{suggestions.map(s=><button key={s} onClick={()=>run(s)} style={{padding:'8px 10px',borderRadius:999,border:'1px solid #ddd',background:'#f8fafc'}}>{s}</button>)}</div>
   <textarea value={input} onChange={e=>setInput(e.target.value)} placeholder="Demande à cet agent ce qu'il doit préparer…" style={{width:'100%',minHeight:100,padding:12,borderRadius:12,border:'1px solid #ccc',boxSizing:'border-box'}}/>
   <div style={{marginTop:10,padding:12,borderRadius:10,background:'#f8fafc',fontSize:13}}>Mode sécurisé : l'agent prépare et analyse. Les remises exceptionnelles, engagements contractuels et envois externes sensibles restent soumis à validation.</div>
  </section>
 </main>
}
