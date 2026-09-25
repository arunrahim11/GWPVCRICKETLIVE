import { createDefaultTournament, normalizeTournament, COMMITTEE_SECTIONS, getMatchScore, getMatchTiming, calculateInnings } from "./data.js";
import { getFirebaseServices } from "./firebase.js";

let tournament = createDefaultTournament();
let matchFilter = "Live";
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));

function team(id) { return tournament.teams.find(item => item.id === id); }
function pool(id) { return tournament.pools.find(item => item.id === id); }
function teamName(id) { return team(id)?.name || "Team to be confirmed"; }
function hasScore(value) { return value !== "" && value != null; }
function score(match, side) {
  const runs = match[`${side}Runs`], wickets = match[`${side}Wickets`], overs = match[`${side}Overs`];
  return hasScore(runs) ? `${runs}/${hasScore(wickets) ? wickets : 0}${hasScore(overs) ? ` (${overs} ov)` : ""}` : "Score pending";
}
function formatDate(date, time = "") {
  if (!date) return "Date to be announced";
  const value = new Date(`${date}T${time || "00:00"}:00+05:30`);
  const dateText = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(value);
  if (!time) return dateText;
  return `${dateText} · ${new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(value)} IST`;
}
function matchPlace(match) { return [pool(match.poolId)?.name || match.stage, match.venue].filter(Boolean).join(" · ") || "Details to be announced"; }
function badge(status) { return `<span class="match-status status-${esc(status.toLowerCase())}">${esc(status)}</span>`; }
function logoMarkup(item, className = "team-logo") { return item?.logoUrl ? `<img class="${className}" src="${esc(item.logoUrl)}" alt="${esc(item.name)} logo">` : `<span class="${className} fallback-logo">${esc(item?.name?.slice(0, 2).toUpperCase() || "G")}</span>`; }

function scoreCard(match, prominent = false) {
  const first = team(match.team1Id), second = team(match.team2Id);
  const batting = teamName(match.battingTeamId);
  const matchScore = getMatchScore(match), activeCalc = Number(match.innings) === 2 ? matchScore.calc2 : matchScore.calc1;
  const required = matchScore.runsRequired;
  const powerplay = match.status === "Live" && activeCalc && activeCalc.legalBalls < Number(match.powerplayOvers || 0) * 6;
  return `<article class="match-card ${prominent ? "live-card" : ""}">
    <div class="match-card-head"><span>Match ${esc(match.number)} · ${esc(match.oversPerInnings || 10)} overs</span><div>${powerplay ? '<span class="powerplay-badge">POWERPLAY</span>' : ""}${badge(match.status)}</div></div>
    <div class="versus-score"><div>${logoMarkup(first, "score-logo")}<strong>${esc(teamName(match.team1Id))}</strong><b>${esc(score(match, "team1"))}</b></div><span>VS</span><div>${logoMarkup(second, "score-logo")}<strong>${esc(teamName(match.team2Id))}</strong><b>${esc(score(match, "team2"))}</b></div></div>
    <p class="match-meta">${esc(formatDate(match.date, match.time))} · ${esc(matchPlace(match))}</p>
    ${match.status === "Live" ? `<div class="live-metrics"><span>Innings ${esc(match.innings)}</span>${match.battingTeamId ? `<span>${esc(batting)} batting</span>` : ""}${activeCalc ? `<span>CRR ${activeCalc.runRate.toFixed(2)}</span>` : ""}${required != null ? `<span>Need ${required} from ${matchScore.ballsRemaining}</span>${matchScore.requiredRunRate != null ? `<span>RRR ${matchScore.requiredRunRate.toFixed(2)}</span>` : ""}` : ""}</div>` : ""}
    ${match.result ? `<p class="result-line">${esc(match.result)}</p>` : ""}
    <button class="secondary-btn" data-score-id="${esc(match.id)}">View Scoreboard</button>
  </article>`;
}

function fixtureRow(match) {
  return `<article class="fixture-row"><div class="fixture-number">M${esc(match.number)}</div><div class="fixture-main"><div class="fixture-title">${esc(teamName(match.team1Id))} <span>vs</span> ${esc(teamName(match.team2Id))}</div><p>${esc(formatDate(match.date, match.time))}</p><p>${esc(matchPlace(match))} · ${esc(match.oversPerInnings || 10)} overs · Powerplay ${esc(match.powerplayOvers || 0)} overs</p>${match.result ? `<strong>${esc(match.result)}</strong>` : ""}</div><div class="fixture-side">${badge(match.status)}${match.status !== "Upcoming" ? `<span>${esc(score(match, "team1"))}<br>${esc(score(match, "team2"))}</span>` : ""}<button class="text-btn" data-score-id="${esc(match.id)}">View Scoreboard</button></div></article>`;
}

function renderDashboard() {
  const settings = tournament.settings;
  $("#tournamentTitle").textContent = settings.title || "GWPV Cricket Tournament";
  document.title = `${settings.title || "GWPV Cricket Tournament"} · Live`;
  const dates = settings.startDate ? `${formatDate(settings.startDate)}${settings.endDate && settings.endDate !== settings.startDate ? ` – ${formatDate(settings.endDate)}` : ""}` : "Dates to be announced";
  $("#tournamentMeta").textContent = [settings.venue || "Venue to be announced", dates].join(" · ");
  $("#announcement").textContent = settings.announcement || "";
  $("#announcement").classList.toggle("hidden", !settings.announcement);
  const registered = tournament.teams.filter(item => item.name.trim()).length;
  const completed = tournament.matches.filter(match => match.status === "Completed").length;
  $("#teamCount").textContent = registered; $("#matchCount").textContent = tournament.matches.length;
  $("#completedCount").textContent = completed; $("#remainingCount").textContent = tournament.matches.filter(match => !["Completed", "Cancelled"].includes(match.status)).length;
  const live = tournament.matches.filter(match => match.status === "Live");
  const upcoming = tournament.matches.filter(match => match.status === "Upcoming").sort(sortMatches);
  $("#liveMatches").innerHTML = live.length ? live.map(match => scoreCard(match, true)).join("") : `<div class="empty-state"><strong>No live match currently</strong><p>${upcoming[0] ? `Next: ${esc(teamName(upcoming[0].team1Id))} vs ${esc(teamName(upcoming[0].team2Id))} · ${esc(formatDate(upcoming[0].date, upcoming[0].time))}` : "The next scheduled match will be highlighted here."}</p></div>`;
  $("#upcomingMatches").innerHTML = upcoming.length ? upcoming.slice(0, 4).map(fixtureRow).join("") : empty("No upcoming matches scheduled.");
  const recent = tournament.matches.filter(match => match.status === "Completed").sort((a, b) => sortMatches(b, a));
  $("#recentMatches").innerHTML = recent.length ? recent.slice(0, 4).map(fixtureRow).join("") : empty("No completed matches yet.");
  const latest = live.map(match => match.lastUpdated).filter(Boolean).sort().pop() || tournament.updatedAt;
  $("#lastUpdated").textContent = latest ? `Last updated ${new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(latest))} IST` : "Waiting for data";
}

function sortMatches(a, b) { return `${a.date || "9999"}${a.time || "99"}`.localeCompare(`${b.date || "9999"}${b.time || "99"}`); }
function empty(message) { return `<div class="empty-state compact"><p>${esc(message)}</p></div>`; }

function renderTeams(activePool = "all") {
  const pools = [...tournament.pools].sort((a,b) => a.displayOrder - b.displayOrder);
  $("#poolFilters").innerHTML = `<button class="chip ${activePool === "all" ? "active" : ""}" data-pool-filter="all">All teams</button>${pools.map(item => `<button class="chip ${activePool === item.id ? "active" : ""}" data-pool-filter="${esc(item.id)}">${esc(item.name)}</button>`).join("")}`;
  const teams = tournament.teams.filter(item => item.name.trim() && (activePool === "all" || item.poolId === activePool)).sort((a,b) => a.serial - b.serial);
  $("#teamGrid").innerHTML = teams.length ? teams.map(item => `<article class="team-card"><span class="serial-badge">#${item.serial}</span>${logoMarkup(item)}<h2>${esc(item.name)}</h2><p>${esc(pool(item.poolId)?.name || "Pool not assigned")}</p><div class="captain-line"><span>Captain</span><strong>${esc(item.captain.name || "Not entered")}</strong>${item.captain.publishPhone && item.captain.phone ? `<a href="tel:${esc(item.captain.phone)}">${esc(item.captain.phone)}</a>` : ""}</div><button class="secondary-btn" data-team-id="${esc(item.id)}">View Players</button></article>`).join("") : empty("No teams have been registered in this view.");
  $$('[data-pool-filter]').forEach(button => button.addEventListener("click", () => renderTeams(button.dataset.poolFilter)));
  $$('[data-team-id]').forEach(button => button.addEventListener("click", () => openTeam(button.dataset.teamId)));
}

function renderMatches() {
  const matches = tournament.matches.filter(match => match.status === matchFilter).sort(sortMatches);
  $("#matchList").innerHTML = matches.length ? matches.map(fixtureRow).join("") : empty(`No ${matchFilter.toLowerCase()} matches.`);
}

function renderCommittee() {
  $("#committeeContent").innerHTML = COMMITTEE_SECTIONS.map(section => {
    const members = tournament.committees.filter(member => member.section === section.value).sort((a,b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0));
    return `<section class="committee-section"><h2>${esc(section.label)}</h2><div class="member-grid">${members.length ? members.map(member => `<article class="member-card">${member.photoUrl ? `<img src="${esc(member.photoUrl)}" alt="${esc(member.name)}">` : `<span class="member-photo">${esc(member.name?.slice(0,2).toUpperCase() || "G")}</span>`}<h3>${esc(member.name)}</h3><strong>${esc(member.designation || "")}</strong><p>${esc(member.responsibility || "")}</p></article>`).join("") : empty("Details will be added soon.")}</div></section>`;
  }).join("");
}

function openTeam(id) {
  const item = team(id); if (!item) return;
  const rows = [{ name: item.captain.name || "Captain not entered", role: "Captain", isCaptain: true }, ...item.players.filter(player => player.name.trim())];
  $("#teamDialogContent").innerHTML = `<div class="dialog-team-head">${logoMarkup(item)}<div><p class="eyebrow">TEAM #${item.serial}</p><h2>${esc(item.name)}</h2><p>${esc(pool(item.poolId)?.name || "Pool not assigned")}</p></div></div><div class="player-list">${rows.map((player, index) => `<div><span>${index + 1}</span><strong>${esc(player.name)}</strong><em>${esc(player.isCaptain ? "Captain" : player.role || "Player")}</em></div>`).join("")}</div>`;
  $("#teamDialog").showModal();
}

function scoreTable(title, rows, columns) {
  if (!rows?.length) return "";
  return `<section class="score-table"><h3>${esc(title)}</h3><div class="table-scroll"><table><thead><tr>${columns.map(column => `<th>${esc(column.label)}</th>`).join("")}</tr></thead><tbody>${rows.map(row => `<tr>${columns.map(column => `<td>${esc(row[column.key] ?? "")}</td>`).join("")}</tr>`).join("")}</tbody></table></div></section>`;
}
function eventToken(event) {
  if (event.wicket && event.dismissalType !== "retired-hurt") return "W";
  if (event.extraType === "wide") return `${event.totalRuns || 1}Wd`;
  if (event.extraType === "no-ball") return `${event.totalRuns || 1}Nb`;
  if (event.extraType === "bye") return `${event.totalRuns}B`;
  if (event.extraType === "leg-bye") return `${event.totalRuns}Lb`;
  if (event.extraType === "dead-ball") return "Db";
  return String(event.totalRuns || 0);
}
function inningsPanel(match, innings) {
  if (!innings) return "";
  const calc = calculateInnings(innings, match.powerplayOvers);
  const battingTable = calc.battingStats.length ? `<div class="auto-score-table"><h4>Batting</h4><div class="table-scroll"><table><thead><tr><th>Batter</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr></thead><tbody>${calc.battingStats.map(item => `<tr><td><strong>${esc(item.player)}</strong><small>${esc(item.dismissal)}</small></td><td>${item.runs}</td><td>${item.balls}</td><td>${item.fours}</td><td>${item.sixes}</td><td>${item.strikeRate.toFixed(1)}</td></tr>`).join("")}</tbody></table></div></div>` : "";
  const bowlingTable = calc.bowlingStats.length ? `<div class="auto-score-table"><h4>Bowling</h4><div class="table-scroll"><table><thead><tr><th>Bowler</th><th>O</th><th>R</th><th>W</th><th>Econ</th></tr></thead><tbody>${calc.bowlingStats.map(item => `<tr><td><strong>${esc(item.player)}</strong></td><td>${item.overs}</td><td>${item.runs}</td><td>${item.wickets}</td><td>${item.economy.toFixed(2)}</td></tr>`).join("")}</tbody></table></div></div>` : "";
  return `<section class="innings-panel"><div class="innings-heading"><div><span>${Number(innings.number) === 1 ? "1st" : "2nd"} innings</span><h3>${esc(teamName(innings.battingTeamId))}</h3></div><strong>${calc.runs}/${calc.wickets} <small>${calc.overs} ov</small></strong></div><div class="innings-rates"><span>Run rate <b>${calc.runRate.toFixed(2)}</b></span><span>Powerplay <b>${esc(match.powerplayOvers || 0)} overs</b></span></div><div class="over-strip">${calc.overGroups.length ? calc.overGroups.map(over => `<div class="over-block ${over.powerplay ? "powerplay-over" : ""}"><span>Over ${over.number}${over.powerplay ? " · PP" : ""}</span><div>${over.events.map(event => `<b title="${esc(event.commentary || "Delivery")}">${esc(eventToken(event))}</b>`).join("")}</div><small>${over.runs} runs${over.wickets ? ` · ${over.wickets}W` : ""}</small></div>`).join("") : `<p class="muted">Ball-by-ball scoring has not started.</p>`}</div>${battingTable}${bowlingTable}${calc.events.length ? `<div class="commentary-feed"><h4>Ball-by-ball</h4>${calc.events.slice().reverse().map(event => `<div class="commentary-row ${event.powerplay ? "powerplay-delivery" : ""}"><span>${esc(event.label)}</span><strong>${esc(eventToken(event))}</strong><p>${esc(event.commentary || `${event.bowler || "Bowler"} to ${event.batter || "Batter"}`)}</p></div>`).join("")}</div>` : ""}</section>`;
}
function openScore(id) {
  const match = tournament.matches.find(item => item.id === id); if (!match) return;
  const matchScore = getMatchScore(match), timing = getMatchTiming(match), activeCalc = Number(match.innings) === 2 ? matchScore.calc2 : matchScore.calc1;
  const powerplay = match.status === "Live" && activeCalc && activeCalc.legalBalls < Number(match.powerplayOvers || 0) * 6;
  $("#scoreDialogContent").innerHTML = `<div class="score-dialog-head"><p class="eyebrow">MATCH ${esc(match.number)} · ${esc(match.oversPerInnings || 10)} OVERS</p><h2>${esc(teamName(match.team1Id))} vs ${esc(teamName(match.team2Id))}</h2><div class="score-head-badges">${badge(match.status)}${powerplay ? '<span class="powerplay-badge">POWERPLAY ACTIVE</span>' : ""}</div><p>${esc(formatDate(match.date, match.time))} · ${esc(matchPlace(match))}</p></div><div class="broadcast-score">${scoreCard(match)}<div class="match-clock"><div><span>Elapsed</span><strong id="elapsedClock">${esc(timing.durationText)}</strong></div><div><span>${match.actualEnd ? "Finished" : "Estimated finish"}</span><strong id="finishClock">${timing.estimatedEnd ? new Intl.DateTimeFormat("en-IN", {hour:"numeric",minute:"2-digit",timeZone:"Asia/Kolkata"}).format(new Date(timing.estimatedEnd)) : "—"}</strong></div></div></div>${match.note ? `<p class="match-note">${esc(match.note)}</p>` : ""}${inningsPanel(match, matchScore.innings1)}${inningsPanel(match, matchScore.innings2)}${scoreTable("Batting scorecard", match.battingScorecard, [{key:"player",label:"Batter"},{key:"runs",label:"R"},{key:"balls",label:"B"},{key:"fours",label:"4s"},{key:"sixes",label:"6s"}])}${scoreTable("Bowling scorecard", match.bowlingScorecard, [{key:"player",label:"Bowler"},{key:"overs",label:"O"},{key:"runs",label:"R"},{key:"wickets",label:"W"}])}`;
  $("#scoreDialog").dataset.matchId = match.id; $("#scoreDialog").showModal();
}

function renderAll() { renderDashboard(); renderTeams(); renderMatches(); renderCommittee(); bindDynamicButtons(); }
function bindDynamicButtons() {
  $$('[data-score-id]').forEach(button => button.onclick = () => openScore(button.dataset.scoreId));
}

function route(name) {
  const valid = ["dashboard", "teams", "matches", "committee"].includes(name) ? name : "dashboard";
  $$(".page-section").forEach(section => section.classList.toggle("active", section.id === valid));
  $$('[data-route]').forEach(button => button.classList.toggle("active", button.dataset.route === valid));
  history.replaceState(null, "", `#${valid}`); window.scrollTo({ top: 0, behavior: "smooth" });
}
$$('[data-route]').forEach(button => button.addEventListener("click", event => { if (button.tagName === "BUTTON") event.preventDefault(); route(button.dataset.route); }));
$$('[data-match-filter]').forEach(button => button.addEventListener("click", () => { matchFilter = button.dataset.matchFilter; $$('[data-match-filter]').forEach(item => item.classList.toggle("active", item === button)); renderMatches(); bindDynamicButtons(); }));
$$('.dialog-close').forEach(button => button.addEventListener("click", () => button.closest("dialog").close()));
$$('dialog').forEach(dialog => dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); }));

async function boot() {
  route(location.hash.slice(1)); renderAll();
  const services = await getFirebaseServices();
  if (!services) { $("#connectionBadge").innerHTML = "<span></span> Setup required"; return; }
  services.firestoreSdk.onSnapshot(services.tournamentRef, snapshot => {
    tournament = normalizeTournament(snapshot.exists() ? snapshot.data() : null); renderAll();
    $("#connectionBadge").innerHTML = "<span></span> Live"; $("#connectionBadge").className = "status-pill saved";
  }, error => { $("#connectionBadge").innerHTML = "<span></span> Offline"; console.error(error); });
}
boot().catch(console.error);
setInterval(() => {
  const dialog = $("#scoreDialog"), match = tournament.matches.find(item => item.id === dialog.dataset.matchId); if (!dialog.open || !match) return;
  const timing = getMatchTiming(match); const elapsed = $("#elapsedClock"), finish = $("#finishClock");
  if (elapsed) elapsed.textContent = timing.durationText;
  if (finish) finish.textContent = timing.estimatedEnd ? new Intl.DateTimeFormat("en-IN", {hour:"numeric",minute:"2-digit",timeZone:"Asia/Kolkata"}).format(new Date(timing.estimatedEnd)) : "—";
}, 30000);
