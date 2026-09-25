import { createDefaultTournament } from "./data.js";
import { getFirebaseServices } from "./firebase.js";

let data = createDefaultTournament();
let activeFixtureFilter = "all";

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const esc = value => String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
const teamById = id => data.teams.find(team => team.id === id) || { name: id?.startsWith("TBD") ? id.replaceAll("-", " ") : "TBD", shortName: "TBD", color: "#9fb6ad" };
const scoreText = (runs, wickets, overs) => `${Number(runs || 0)}/${Number(wickets || 0)} <small>(${esc(overs || "0.0")})</small>`;

function routeTo(route) {
  const target = document.getElementById(route);
  if (!target) return;
  $$(".bottom-nav button").forEach(button => button.classList.toggle("active", button.dataset.route === route));
  target.scrollIntoView({ behavior: "smooth", block: "start" });
  history.replaceState(null, "", `#${route}`);
}

function renderLive() {
  const live = data.matches.find(match => match.status === "Live") || data.matches.find(match => match.featured && match.status !== "Completed") || data.matches.find(match => match.status === "Scheduled");
  const container = $("#liveMatch");
  if (!live) {
    container.innerHTML = `<div class="empty-state"><div><h3>No active match</h3><p>Check the fixtures for the next game.</p></div></div>`;
  } else {
    const one = teamById(live.team1Id); const two = teamById(live.team2Id);
    container.classList.remove("skeleton-card");
    container.innerHTML = `<div class="live-top"><span class="live-indicator">${live.status === "Live" ? "● LIVE NOW" : esc(live.status.toUpperCase())}</span><span class="match-stage">Match ${live.number} · ${esc(live.stage)}</span></div>
      <div class="scoreboard"><div class="score-team"><span class="team-abbr">${esc(one.name)}</span><span class="score">${scoreText(live.team1Runs,live.team1Wickets,live.team1Overs)}</span></div><span class="versus">VS</span><div class="score-team"><span class="team-abbr">${esc(two.name)}</span><span class="score">${scoreText(live.team2Runs,live.team2Wickets,live.team2Overs)}</span></div></div>
      <p class="live-message">${esc(live.result || live.note || `${live.date || "Date TBA"} · ${live.time || "Time TBA"} · ${live.venue || data.venue}`)}</p>`;
  }
  const completed = data.matches.filter(match => match.status === "Completed").slice(-3).reverse();
  $("#recentResults").innerHTML = completed.length ? completed.map(match => {
    const one=teamById(match.team1Id),two=teamById(match.team2Id);
    return `<article class="result-card"><span class="match-stage">Match ${match.number} · ${esc(match.stage)}</span><div class="result-line">${esc(one.shortName)} ${match.team1Runs}/${match.team1Wickets} · ${esc(two.shortName)} ${match.team2Runs}/${match.team2Wickets}</div><p class="muted">${esc(match.result || "Match completed")}</p></article>`;
  }).join("") : "";
}

function renderFixtures() {
  const matches = data.matches.filter(match => activeFixtureFilter === "all" || (activeFixtureFilter === "Knockout" ? ["Semifinal","Final"].includes(match.stage) : match.stage === activeFixtureFilter));
  $("#fixtureList").innerHTML = matches.map(match => {
    const one=teamById(match.team1Id),two=teamById(match.team2Id);
    const score = match.status === "Completed" || match.status === "Live" ? `${match.team1Runs}/${match.team1Wickets} – ${match.team2Runs}/${match.team2Wickets}` : `${match.date || "Date TBA"} · ${match.time || "Time TBA"}`;
    return `<article class="fixture-card"><span class="fixture-no">MATCH ${match.number}</span><div><h3>${esc(one.name)} <span class="muted">vs</span> ${esc(two.name)}</h3><p>${esc(match.stage)} · ${esc(match.venue || data.venue)}${match.result ? ` · ${esc(match.result)}` : ""}</p></div><div><div class="fixture-score">${esc(score)}</div><span class="match-status ${match.status === "Live" ? "live" : ""}">${esc(match.status)}</span></div></article>`;
  }).join("");
}

function renderTable(pool, target) {
  const teams = data.teams.filter(team => team.pool === pool).sort((a,b) => Number(b.points)-Number(a.points) || Number(b.nrr)-Number(a.nrr));
  $(target).innerHTML = teams.map((team,index) => `<tr><td class="rank">${index+1}</td><td>${esc(team.name)}</td><td>${team.played||0}</td><td>${team.won||0}</td><td>${team.lost||0}</td><td><strong>${team.points||0}</strong></td><td>${Number(team.nrr||0)>=0?"+":""}${esc(team.nrr||"0.000")}</td></tr>`).join("");
}

function renderTeams() {
  $("#teamGrid").innerHTML = data.teams.map(team => `<article class="team-card" data-team-id="${esc(team.id)}" style="--team-color:${esc(team.color)}"><span class="pool-badge">POOL ${esc(team.pool)}</span><h3>${esc(team.name)}</h3><p>Captain: ${esc(team.captain || "TBA")}</p><p>${team.players?.length || 0} registered players</p></article>`).join("");
  $$(".team-card").forEach(card => card.addEventListener("click", () => openTeam(card.dataset.teamId)));
}

function openTeam(teamId) {
  const team = teamById(teamId);
  $("#teamDialogContent").innerHTML = `<span class="pool-badge">POOL ${esc(team.pool)}</span><h2>${esc(team.name)}</h2><p class="muted">Captain: ${esc(team.captain || "TBA")}</p><div class="player-list">${(team.players||[]).map((player,index)=>`<div class="player-row"><strong>${index+1}</strong><div>${esc(player.name)}<small>${esc(player.role)} · Jersey ${esc(player.jersey)}</small></div><a href="${player.phone ? `tel:${esc(player.phone)}` : "#"}">${esc(player.phone || "No phone")}</a></div>`).join("")}</div>`;
  $("#teamDialog").showModal();
}

function render() {
  document.title = `${data.title} · Live`;
  $("#tournamentTitle").textContent = data.title;
  $("#tournamentMeta").textContent = `${data.teams.length} teams · ${data.dates} · ${data.venue}`;
  $("#teamCount").textContent = data.teams.length;
  $("#playerCount").textContent = data.teams.reduce((sum,team)=>sum+(team.players?.length||0),0);
  $("#matchCount").textContent = data.matches.length;
  $("#completedCount").textContent = data.matches.filter(match=>match.status==="Completed").length;
  $("#lastUpdated").textContent = data.updatedAt ? `Updated ${new Date(data.updatedAt).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"})}` : "";
  renderLive(); renderFixtures(); renderTable("A","#poolATable"); renderTable("B","#poolBTable"); renderTeams();
  $("#rulesContent").innerHTML = `<ol>${(data.rules||[]).map(rule=>`<li>${esc(rule)}</li>`).join("")}</ol>`;
}

async function connect() {
  const badge = $("#connectionBadge");
  try {
    const services = await getFirebaseServices();
    if (!services) {
      badge.innerHTML = "<span></span> Demo data"; badge.title = "Connect Firebase to publish live data"; render(); return;
    }
    services.firestoreSdk.onSnapshot(services.tournamentRef, snapshot => {
      if (snapshot.exists()) data = snapshot.data();
      badge.classList.add("online"); badge.innerHTML = "<span></span> Live"; render();
    }, error => { badge.textContent = "Data unavailable"; console.error(error); });
  } catch (error) { badge.textContent = "Offline"; console.error(error); render(); }
}

document.addEventListener("click", event => {
  const routeButton = event.target.closest("[data-route]"); if (routeButton) routeTo(routeButton.dataset.route);
});
$(".dialog-close").addEventListener("click",()=>$("#teamDialog").close());
$$("[data-filter]").forEach(button=>button.addEventListener("click",()=>{ activeFixtureFilter=button.dataset.filter; $$("[data-filter]").forEach(item=>item.classList.toggle("active",item===button)); renderFixtures(); }));
connect();
