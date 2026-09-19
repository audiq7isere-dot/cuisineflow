export const agents=[
{id:"director",name:"Directeur IA",role:"Coordonne les priorités commerciales et propose les prochaines actions.",icon:"🧠"},
{id:"prospecting",name:"Prospection",role:"Prépare des cibles B2B pertinentes et des séquences de prise de contact conformes.",icon:"🎯"},
{id:"qualification",name:"Qualification",role:"Classe les prospects selon projet, délai, budget et engagement.",icon:"🔥"},
{id:"followup",name:"Relances",role:"Repère prospects et devis à relancer et prépare des messages personnalisés.",icon:"🔁"},
{id:"appointments",name:"Rendez-vous",role:"Prépare la prise de rendez-vous et le suivi des demandes.",icon:"📅"},
{id:"sales",name:"Commercial",role:"Prépare argumentaires, réponses aux objections et prochaines étapes.",icon:"🤝"},
{id:"quotes",name:"Devis & Marge",role:"Contrôle cohérence, TVA, remises et marge avant validation.",icon:"🧾"},
{id:"orders",name:"Commandes",role:"Suit les commandes, acomptes, jalons livraison et points bloquants.",icon:"📦"},
{id:"billing",name:"Facturation",role:"Surveille acomptes, soldes, échéances et pièces manquantes.",icon:"💶"},
{id:"sav",name:"SAV",role:"Structure les dossiers SAV, priorités, pièces et relances fournisseur.",icon:"🛠️"},
{id:"marketing",name:"Marketing",role:"Propose campagnes locales, contenus et réactivation de la base.",icon:"📣"},
{id:"partners",name:"Apporteurs",role:"Développe et suit les apporteurs d'affaires et partenaires.",icon:"🌐"},
{id:"suppliers",name:"Fournisseurs",role:"Prépare demandes, relances et suivi des réponses fournisseurs.",icon:"🏭"},
{id:"performance",name:"Pilotage CA",role:"Analyse pipeline, conversion, marge et actions prioritaires.",icon:"📈"}
];
export function agentById(id){return agents.find(a=>a.id===id)||agents[0]}
