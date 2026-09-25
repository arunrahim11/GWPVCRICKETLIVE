import { createDefaultTournament } from "./data.js";
import { getFirebaseServices } from "./firebase.js";

let services;
let tournament;
let unsubscribe;
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

function setSaveState(label, kind="") { const el=$("#saveState"); el.innerHTML=`<span></span> ${label}`; el.className=`status-pill ${kind}`; }
function flashSaved(){ setSaveState("Saved live","saved"); setTimeout(()=>setSaveState("Ready"),1800); }
function formObject(form){ return Object.fromEntries(new FormData(form).entries()); }
function teamName(id){ return tournament?.teams?.find(team=>team.id===id)?.name || id || "TBD"; }

async function persist(message="Saved") {
  tournament.updatedAt = new Date().toISOString(); setSaveState("Publishing…");
  await services.firestoreSdk.setDoc(services.tournamentRef, tournament); flashSaved();
  if(message) console.info(message);
}

function showAuth(user){
  $("#loginPanel").classList.toggle("hidden",Boolean(user));
  $("#adminPanel").classList.toggle("hidden",!user);
  $("#signOutBtn").classList.toggle("hidden",!user);
  if(user) subscribeToTournament(); else if(unsubscribe){unsubscribe();unsubscribe=null;}
}

function subscribeToTournament(){
  if(unsubscribe) unsubscribe();
  unsubscribe=services.firestoreSdk.onSnapshot(services.tournamentRef,snapshot=>{
    tournament=snapshot.exists()?snapshot.data():null;
    $("#initializeCard").classList.toggle("hidden",Boolean(tournament));
    $("#settingsForm").classList.toggle("hidden",!tournament);
    if(tournament) renderAdmin();
  },error=>{setSaveState("Permission error"); console.error(error);});
}

function fillForm(form, values){ Object.entries(values||{}).forEach(([key,value])=>{const field=form.elements.namedItem(key);if(field)field.value=value??"";}); }

function renderAdmin(){
  fillForm($("#settingsForm"),tournament);
  const teamOptions=tournament.teams.map(team=>`<option value="${team.id}">${team.name} · Pool ${team.pool}</option>`).join("");
  const matchOptions=tournament.matches.map(match=>`<option value="${match.id}">M${match.number} · ${teamName(match.team1Id)} vs ${teamName(match.team2Id)}</option>`).join("");
  const priorTeam=$("#teamSelector").value, priorMatch=$("#matchSelector").value;
  $("#teamSelector").innerHTML=teamOptions; $("#matchSelector").innerHTML=matchOptions;
  [$("#matchForm").elements.team1Id,$("#matchForm").elements.team2Id].forEach(select=>select.innerHTML=teamOptions+`<option value="TBD-A1">Pool A Rank 1</option><option value="TBD-A2">Pool A Rank 2</option><option value="TBD-B1">Pool B Rank 1</option><option value="TBD-B2">Pool B Rank 2</option><option value="TBD-SF1">Semifinal 1 Winner</option><option value="TBD-SF2">Semifinal 2 Winner</option>`);
  if(priorTeam&&tournament.teams.some(team=>team.id===priorTeam)) $("#teamSelector").value=priorTeam;
  if(priorMatch&&tournament.matches.some(match=>match.id===priorMatch)) $("#matchSelector").value=priorMatch;
  renderTeamEditor(); renderMatchEditor(); renderStandings(); $("#rulesEditor").value=(tournament.rules||[]).join("\n");
}

function renderTeamEditor(){
  const team=tournament.teams.find(item=>item.id===$("#teamSelector").value)||tournament.teams[0]; if(!team)return;
  $("#teamSelector").value=team.id; fillForm($("#teamForm"),team);
  $("#playerEditor").innerHTML=(team.players||[]).map((player,index)=>`<tr data-player-id="${player.id}"><td>${index+1}</td><td><input name="name" value="${escapeAttr(player.name)}"></td><td><input name="phone" type="tel" value="${escapeAttr(player.phone)}" placeholder="10-digit number"></td><td><input name="role" value="${escapeAttr(player.role)}"></td><td><input name="jersey" value="${escapeAttr(player.jersey)}"></td></tr>`).join("");
}

function renderMatchEditor(){
  const match=tournament.matches.find(item=>item.id===$("#matchSelector").value)||tournament.matches[0]; if(!match)return;
  $("#matchSelector").value=match.id; fillForm($("#matchForm"),{...match,featured:String(Boolean(match.featured))});
}

function renderStandings(){
  $("#standingsEditor").innerHTML=tournament.teams.map(team=>`<tr data-team-id="${team.id}"><td>${team.name}</td><td><input name="played" type="number" min="0" value="${team.played||0}"></td><td><input name="won" type="number" min="0" value="${team.won||0}"></td><td><input name="lost" type="number" min="0" value="${team.lost||0}"></td><td><input name="points" type="number" min="0" value="${team.points||0}"></td><td><input name="nrr" inputmode="decimal" value="${escapeAttr(team.nrr||"0.000")}"></td></tr>`).join("");
}

function escapeAttr(value){return String(value??"").replace(/[&<>"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[char]));}

$("#loginForm").addEventListener("submit",async event=>{event.preventDefault();$("#loginError").textContent="";try{await services.authSdk.signInWithEmailAndPassword(services.auth,$("#loginEmail").value.trim(),$("#loginPassword").value);}catch(error){$("#loginError").textContent="Sign-in failed. Check the email, password and Firebase Authentication setup.";console.error(error);}});
$("#signOutBtn").addEventListener("click",()=>services.authSdk.signOut(services.auth));
$("#initializeBtn").addEventListener("click",async()=>{tournament=createDefaultTournament();await persist("Tournament initialized");});
$("#settingsForm").addEventListener("submit",async event=>{event.preventDefault();const values=formObject(event.currentTarget);Object.assign(tournament,values,{overs:Number(values.overs)||10});await persist();});
$("#teamSelector").addEventListener("change",renderTeamEditor);
$("#teamForm").addEventListener("submit",async event=>{event.preventDefault();const team=tournament.teams.find(item=>item.id===$("#teamSelector").value);const values=formObject(event.currentTarget);Object.assign(team,{name:values.name,pool:values.pool,captain:values.captain,color:values.color,shortName:values.name.slice(0,4).toUpperCase()});team.players=$$("#playerEditor tr").map(row=>({id:row.dataset.playerId,name:row.querySelector('[name="name"]').value.trim(),phone:row.querySelector('[name="phone"]').value.trim(),role:row.querySelector('[name="role"]').value.trim(),jersey:row.querySelector('[name="jersey"]').value.trim()}));await persist();});
$("#matchSelector").addEventListener("change",renderMatchEditor);
$("#matchForm").addEventListener("submit",async event=>{event.preventDefault();const match=tournament.matches.find(item=>item.id===$("#matchSelector").value);const v=formObject(event.currentTarget);Object.assign(match,v,{team1Runs:Number(v.team1Runs)||0,team1Wickets:Number(v.team1Wickets)||0,team2Runs:Number(v.team2Runs)||0,team2Wickets:Number(v.team2Wickets)||0,featured:v.featured==="true"});if(match.featured)tournament.matches.forEach(item=>{if(item.id!==match.id)item.featured=false;});await persist();});
$("#standingsForm").addEventListener("submit",async event=>{event.preventDefault();$$("#standingsEditor tr").forEach(row=>{const team=tournament.teams.find(item=>item.id===row.dataset.teamId);["played","won","lost","points"].forEach(name=>team[name]=Number(row.querySelector(`[name="${name}"]`).value)||0);team.nrr=row.querySelector('[name="nrr"]').value.trim()||"0.000";});await persist();});
$("#rulesForm").addEventListener("submit",async event=>{event.preventDefault();tournament.rules=$("#rulesEditor").value.split("\n").map(rule=>rule.trim()).filter(Boolean);await persist();});
$$('[data-admin-tab]').forEach(button=>button.addEventListener("click",()=>{$$('[data-admin-tab]').forEach(item=>item.classList.toggle("active",item===button));$$('.admin-tab').forEach(tab=>tab.classList.toggle("active",tab.id===`admin-${button.dataset.adminTab}`));}));

async function boot(){
  services=await getFirebaseServices();
  if(!services){$("#setupNotice").classList.remove("hidden");return;}
  services.authSdk.onAuthStateChanged(services.auth,showAuth);
  $("#loginPanel").classList.remove("hidden");
}
boot().catch(error=>{$("#setupNotice").classList.remove("hidden");console.error(error);});
