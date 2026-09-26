import { createDefaultTournament, normalizeTournament, emptyMatch, createId, validateTournament, isValidOvers, calculateInnings, getMatchScore, getMatchTiming, syncMatchSummary, formatDuration } from "./data.js";
import { getFirebaseServices } from "./firebase.js";

let services, tournament, unsubscribe, unsubscribePrivate, publicSnapshot, privateSnapshot = { teams: [] };
let selectedTeamId = "team-1", selectedMatchId = "", selectedScoreMatchId = "", selectedMemberId = "", selectedInningsNumber = 1;
let teamLogos = {}, unsubscribeLogos;
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const attr = esc;

function setSaveState(label, kind = "") { const el = $("#saveState"); el.innerHTML = `<span></span> ${esc(label)}`; el.className = `status-pill ${kind}`; }
function showErrors(errors) { const el = $("#validationBanner"); el.innerHTML = errors.map(error => `<p>${esc(error)}</p>`).join(""); el.classList.toggle("hidden", !errors.length); if (errors.length) el.scrollIntoView({ behavior: "smooth", block: "center" }); }
function formObject(form) { return Object.fromEntries(new FormData(form).entries()); }
function fillForm(form, values) { Object.entries(values || {}).forEach(([key, value]) => { const field = form.elements.namedItem(key); if (!field) return; if (field.type === "checkbox") field.checked = Boolean(value); else field.value = value ?? ""; }); }
function teamName(id) { return tournament?.teams.find(team => team.id === id)?.name || `Team slot ${tournament?.teams.find(team => team.id === id)?.serial || ""}`.trim(); }
function poolOptions(selected = "") { return `<option value="">Not assigned</option>${tournament.pools.sort((a,b) => a.displayOrder - b.displayOrder).map(pool => `<option value="${attr(pool.id)}" ${pool.id === selected ? "selected" : ""}>${esc(pool.name)}</option>`).join("")}`; }
function teamOptions(selected = "", includeBlank = true) { return `${includeBlank ? '<option value="">Select a team</option>' : ""}${tournament.teams.filter(team => team.name.trim()).sort((a,b) => a.serial - b.serial).map(team => `<option value="${attr(team.id)}" ${team.id === selected ? "selected" : ""}>#${team.serial} · ${esc(team.name)}</option>`).join("")}`; }

async function persist(success = "Saved live") {
  const errors = validateTournament(tournament); showErrors(errors); if (errors.length) return false;
  tournament.updatedAt = new Date().toISOString(); setSaveState("Publishing…");
  try {
    const privateData = { teams: tournament.teams.map(team => ({ id: team.id, captainPhone: team.captain.phone || "", playerPhones: Object.fromEntries(team.players.map(player => [player.id, player.phone || ""])) })), updatedAt: tournament.updatedAt };
    const publicData = structuredClone(tournament);
    await services.firestoreSdk.setDoc(services.privateTournamentRef, privateData);
    await services.firestoreSdk.setDoc(services.tournamentRef, publicData);
    setSaveState(success, "saved"); setTimeout(() => setSaveState("Ready"), 2200); return true;
  }
  catch (error) { setSaveState("Save failed", "error"); showErrors(["The change could not be saved. Check your connection and Firestore permissions."]); console.error(error); return false; }
}

function showAuth(user) {
  $("#loginPanel").classList.toggle("hidden", Boolean(user)); $("#adminPanel").classList.toggle("hidden", !user); $("#signOutBtn").classList.toggle("hidden", !user);
  if (user) subscribe(); else { if (unsubscribe) unsubscribe(); if (unsubscribePrivate) unsubscribePrivate(); if (unsubscribeLogos) unsubscribeLogos(); unsubscribe = null; unsubscribePrivate = null; unsubscribeLogos = null; }
}
function mergePrivateContacts() {
  if (!publicSnapshot) return;
  tournament = normalizeTournament(publicSnapshot);
  tournament.teams.forEach(team => {
    const privateTeam = (privateSnapshot.teams || []).find(item => item.id === team.id);
    if (!privateTeam) return;
    team.captain.phone = privateTeam.captainPhone || team.captain.phone || "";
    team.players.forEach(player => { player.phone = privateTeam.playerPhones?.[player.id] || player.phone || ""; });
  });
  $("#initializeCard").classList.add("hidden"); $("#settingsForm").classList.remove("hidden"); renderAdmin();
}
function subscribe() {
  if (unsubscribe) unsubscribe(); if (unsubscribePrivate) unsubscribePrivate();
  unsubscribe = services.firestoreSdk.onSnapshot(services.tournamentRef, snapshot => {
    publicSnapshot = snapshot.exists() ? snapshot.data() : null;
    tournament = publicSnapshot ? normalizeTournament(publicSnapshot) : null;
    $("#initializeCard").classList.toggle("hidden", Boolean(tournament)); $("#settingsForm").classList.toggle("hidden", !tournament);
    if (tournament) mergePrivateContacts();
  }, error => { setSaveState("Permission error", "error"); console.error(error); });
  unsubscribePrivate = services.firestoreSdk.onSnapshot(services.privateTournamentRef, snapshot => { privateSnapshot = snapshot.exists() ? snapshot.data() : { teams: [] }; if (publicSnapshot) mergePrivateContacts(); }, error => { setSaveState("Private data blocked", "error"); showErrors(["Deploy the included Firestore rules to enable protected phone-number storage."]); console.error(error); });
  unsubscribeLogos = services.firestoreSdk.onSnapshot(services.teamLogosRef, snapshot => { teamLogos = Object.fromEntries(snapshot.docs.map(document => [document.id, document.data().dataUrl]).filter(([,url]) => url)); if (tournament) renderTeamEditor(); }, console.error);
}

function renderAdmin() {
  fillForm($("#settingsForm"), tournament.settings);
  renderPools(); renderTeamSelector(); renderTeamEditor(); renderMatchSelector(); renderMatchEditor(); renderScoreMatchSelector(); renderScoringDesk(); renderMemberSelector(); renderMemberEditor();
}

function renderPools() {
  $("#poolEditor").innerHTML = tournament.pools.length ? tournament.pools.sort((a,b) => a.displayOrder - b.displayOrder).map(pool => `<div class="stack-row" data-pool-id="${attr(pool.id)}"><label>Pool name<input name="name" value="${attr(pool.name)}" placeholder="Pool name"></label><label>Order<input name="displayOrder" type="number" min="0" value="${pool.displayOrder || 0}"></label><button class="danger-btn remove-pool" type="button">Remove</button></div>`).join("") : `<div class="empty-state compact"><p>No pools created. Add your first pool.</p></div>`;
}
function renderTeamSelector() {
  $("#teamSelector").innerHTML = tournament.teams.sort((a,b) => a.serial - b.serial).map(team => `<option value="${attr(team.id)}">Slot ${team.serial}${team.name ? ` · ${esc(team.name)}` : " · Empty"}</option>`).join("");
  if (!tournament.teams.some(team => team.id === selectedTeamId)) selectedTeamId = tournament.teams[0]?.id || "";
  $("#teamSelector").value = selectedTeamId;
}
function renderTeamEditor() {
  const team = tournament.teams.find(item => item.id === selectedTeamId); if (!team) return;
  fillForm($("#teamForm"), { serial: team.serial, name: team.name, poolId: team.poolId, logoUrl: team.logoUrl, captainName: team.captain.name, captainGwid: team.captain.gwid, captainPhone: team.captain.phone });
  $("#teamForm").elements.poolId.innerHTML = poolOptions(team.poolId);
  const captainRow = `<tr class="captain-admin-row"><td>1</td><td><input value="${attr(team.captain.name || "Enter captain above")}" disabled></td><td><input value="${attr(team.captain.gwid || "Enter GWID above")}" disabled></td><td><input value="Captain" disabled></td><td><input value="${attr(team.captain.phone || "")}" disabled></td><td><span class="captain-lock">Captain</span></td></tr>`;
  const additionalRows = team.players.map((player, index) => playerRow(player, index)).join("");
  $("#playerEditor").innerHTML = captainRow + (additionalRows || `<tr class="empty-row"><td colspan="5">No additional players added.</td></tr>`);
  $("#addPlayerBtn").disabled = team.players.length >= 13;
  const logo = teamLogos[team.id] || team.logoUrl;
  $("#teamLogoPreview").innerHTML = logo ? `<img src="${attr(logo)}" alt="${attr(team.name || "Team")} logo">` : "No logo";
  $("#removeTeamLogoBtn").disabled = !teamLogos[team.id];
}
function playerRow(player, index) { return `<tr data-player-id="${attr(player.id)}"><td>${index + 2}</td><td><input name="playerName" value="${attr(player.name)}"></td><td><input name="playerGwid" value="${attr(player.gwid)}" placeholder="Unique GWID"></td><td><input name="playerRole" value="${attr(player.role)}" placeholder="Batter, bowler…"></td><td><input name="playerPhone" type="tel" value="${attr(player.phone)}"></td><td><button class="icon-danger remove-player" type="button" aria-label="Remove player">×</button></td></tr>`; }

function renderMatchSelector() {
  const sorted = [...tournament.matches].sort((a,b) => a.number - b.number);
  $("#matchSelector").innerHTML = sorted.length ? sorted.map(match => `<option value="${attr(match.id)}">Match ${match.number} · ${esc(teamName(match.team1Id))} vs ${esc(teamName(match.team2Id))}</option>`).join("") : `<option value="">No matches created</option>`;
  if (!tournament.matches.some(match => match.id === selectedMatchId)) selectedMatchId = sorted[0]?.id || "";
  $("#matchSelector").value = selectedMatchId; $("#matchForm").classList.toggle("hidden", !selectedMatchId); $("#deleteMatchBtn").disabled = !selectedMatchId;
}
function scorecardToText(rows, keys) { return (rows || []).map(row => keys.map(key => row[key] ?? "").join(" | ")).join("\n"); }
function renderMatchEditor() {
  const match = tournament.matches.find(item => item.id === selectedMatchId); if (!match) return;
  const form = $("#matchForm");
  form.elements.team1Id.innerHTML = teamOptions(match.team1Id); form.elements.team2Id.innerHTML = teamOptions(match.team2Id); form.elements.battingTeamId.innerHTML = teamOptions(match.battingTeamId); form.elements.tossWinnerId.innerHTML = teamOptions(match.tossWinnerId);
  form.elements.poolId.innerHTML = poolOptions(match.poolId);
  fillForm(form, { ...match, battingScorecard: scorecardToText(match.battingScorecard, ["player","runs","balls","fours","sixes"]), bowlingScorecard: scorecardToText(match.bowlingScorecard, ["player","overs","runs","wickets"]) });
}

function renderScoreMatchSelector() {
  const matches = [...tournament.matches].sort((a,b) => a.number - b.number);
  $("#scoreMatchSelector").innerHTML = matches.length ? matches.map(match => `<option value="${attr(match.id)}">Match ${match.number} · ${esc(teamName(match.team1Id))} vs ${esc(teamName(match.team2Id))}</option>`).join("") : `<option value="">Create a match first</option>`;
  if (!matches.some(match => match.id === selectedScoreMatchId)) selectedScoreMatchId = matches.find(match => match.status === "Live")?.id || matches[0]?.id || "";
  $("#scoreMatchSelector").value = selectedScoreMatchId;
}
function ensureInnings(match, number) {
  match.inningsData ||= [];
  let innings = match.inningsData.find(item => Number(item.number) === Number(number));
  if (!innings) {
    const firstBatting = match.battingTeamId || match.team1Id;
    const battingTeamId = Number(number) === 1 ? firstBatting : (firstBatting === match.team1Id ? match.team2Id : match.team1Id);
    innings = { number: Number(number), battingTeamId, bowlingTeamId: battingTeamId === match.team1Id ? match.team2Id : match.team1Id, adjustmentRuns: 0, events: [] };
    match.inningsData.push(innings);
  }
  return innings;
}
function playerOptions(teamId) {
  const current = tournament.teams.find(item => item.id === teamId); if (!current) return "";
  return [current.captain?.name, ...(current.players || []).map(player => player.name)].filter(Boolean).map(name => `<option value="${attr(name)}"></option>`).join("");
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
function formatClock(iso) { return iso ? new Intl.DateTimeFormat("en-IN", { hour:"numeric", minute:"2-digit", second:"2-digit", timeZone:"Asia/Kolkata" }).format(new Date(iso)) : ""; }
function renderScoringDesk() {
  const match = tournament.matches.find(item => item.id === selectedScoreMatchId);
  $("#scoreWorkspace").classList.toggle("hidden", !match); if (!match) { $("#scoreControlSummary").innerHTML = `<p class="muted">Create and schedule a match before opening live scoring.</p>`; return; }
  const score = getMatchScore(match), timing = getMatchTiming(match);
  $("#scoreControlSummary").innerHTML = `<div><span>Status</span><strong>${esc(match.status)}</strong></div><div><span>Format</span><strong>${match.oversPerInnings} overs</strong></div><div><span>Powerplay</span><strong>${match.powerplayOvers} overs</strong></div><div><span>Elapsed</span><strong>${esc(timing.durationText)}</strong></div><div><span>Estimated finish</span><strong>${timing.estimatedEnd && !match.actualEnd ? formatClock(timing.estimatedEnd) : "—"}</strong></div>`;
  $("#startMatchBtn").disabled = Boolean(match.actualStart); $("#startSecondInningsBtn").disabled = !match.actualStart || Boolean(score.innings2); $("#completeMatchBtn").disabled = match.status === "Completed";
  selectedInningsNumber = Number($("#inningsSelector").value || selectedInningsNumber || match.innings || 1); $("#inningsSelector").value = String(selectedInningsNumber);
  const innings = ensureInnings(match, selectedInningsNumber), calc = calculateInnings(innings, match.powerplayOvers);
  const inPowerplay = calc.legalBalls < Number(match.powerplayOvers || 0) * 6;
  $("#powerplayAdminBadge").classList.toggle("hidden", !inPowerplay); $("#scoringTitle").textContent = `${selectedInningsNumber === 1 ? "1st" : "2nd"} innings · ${teamName(innings.battingTeamId)}`;
  $("#scoringMeta").textContent = `${teamName(innings.bowlingTeamId)} bowling · ${match.oversPerInnings} overs · Powerplay ${match.powerplayOvers} overs`;
  const runsRequired = selectedInningsNumber === 2 ? score.runsRequired : null;
  $("#adminLiveScore").innerHTML = `<div class="giant-score"><strong>${calc.runs}/${calc.wickets}</strong><span>${calc.overs} overs</span></div><div class="rate-grid"><div><span>CRR</span><strong>${calc.runRate.toFixed(2)}</strong></div>${selectedInningsNumber === 2 ? `<div><span>Target</span><strong>${score.target || "—"}</strong></div><div><span>Need</span><strong>${runsRequired ?? "—"} from ${score.ballsRemaining ?? "—"}</strong></div><div><span>RRR</span><strong>${score.requiredRunRate == null ? "—" : score.requiredRunRate.toFixed(2)}</strong></div>` : `<div><span>Balls</span><strong>${calc.legalBalls}/${match.oversPerInnings * 6}</strong></div>`}</div>`;
  $("#battingPlayers").innerHTML = playerOptions(innings.battingTeamId); $("#bowlingPlayers").innerHTML = playerOptions(innings.bowlingTeamId);
  const form = $("#deliveryForm"); if (!form.elements.eventId.value) fillForm(form, { batter: match.currentStriker, nonStriker: match.currentNonStriker, bowler: match.currentBowler });
  $("#adjustmentRuns").value = innings.adjustmentRuns || 0;
  $("#overSummaryAdmin").innerHTML = `<h3>Over summary</h3>${calc.overGroups.length ? calc.overGroups.slice().reverse().map(over => `<div class="over-mini ${over.powerplay ? "powerplay-over" : ""}"><span>Over ${over.number}${over.powerplay ? " · PP" : ""}</span><div>${over.events.map(event => `<b>${esc(eventToken(event))}</b>`).join("")}</div><strong>${over.runs} run${over.runs === 1 ? "" : "s"}${over.wickets ? ` · ${over.wickets}W` : ""}</strong></div>`).join("") : `<p class="muted">No deliveries entered.</p>`}`;
  $("#deliveryLog").innerHTML = calc.events.length ? calc.events.slice().reverse().map(event => `<div class="delivery-row ${event.powerplay ? "powerplay-delivery" : ""}"><span class="ball-label">${esc(event.label)}</span><strong>${esc(eventToken(event))}</strong><div><b>${esc(event.batter || "Batter")} · ${esc(event.bowler || "Bowler")}</b><p>${esc(event.commentary || (event.wicket ? `${event.playerOut || event.batter || "Batter"} ${event.dismissalType || "out"}` : `${event.totalRuns} run${event.totalRuns === 1 ? "" : "s"}`))}</p></div><small>${esc(formatClock(event.timestamp))}</small><button class="text-btn edit-delivery" data-event-id="${attr(event.id)}">Edit</button><button class="icon-danger delete-delivery" data-event-id="${attr(event.id)}">×</button></div>`).join("") : `<div class="empty-state compact"><p>No balls recorded in this innings.</p></div>`;
}

function renderMemberSelector() {
  const sorted = [...tournament.committees].sort((a,b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0));
  $("#memberSelector").innerHTML = sorted.length ? sorted.map(member => `<option value="${attr(member.id)}">${esc(member.name || "New member")} · ${esc(member.designation || "No designation")}</option>`).join("") : `<option value="">No committee members</option>`;
  if (!tournament.committees.some(member => member.id === selectedMemberId)) selectedMemberId = sorted[0]?.id || "";
  $("#memberSelector").value = selectedMemberId; $("#memberForm").classList.toggle("hidden", !selectedMemberId); $("#deleteMemberBtn").disabled = !selectedMemberId;
}
function renderMemberEditor() { const member = tournament.committees.find(item => item.id === selectedMemberId); if (member) fillForm($("#memberForm"), member); }

function parseScorecard(text, keys) {
  return text.split("\n").map(line => line.trim()).filter(Boolean).map(line => {
    const values = line.split("|").map(value => value.trim()); return Object.fromEntries(keys.map((key, index) => [key, values[index] || ""]));
  });
}

$("#loginForm").addEventListener("submit", async event => { event.preventDefault(); $("#loginError").textContent = ""; try { await services.authSdk.signInWithEmailAndPassword(services.auth, $("#loginEmail").value.trim(), $("#loginPassword").value); } catch (error) { $("#loginError").textContent = "Sign-in failed. Check the email, password, and Firebase Authentication setup."; console.error(error); } });
$("#signOutBtn").addEventListener("click", () => services.authSdk.signOut(services.auth));
$("#initializeBtn").addEventListener("click", async () => { tournament = createDefaultTournament(); await persist("Tournament initialized"); });
$("#settingsForm").addEventListener("submit", async event => { event.preventDefault(); tournament.settings = { ...tournament.settings, ...formObject(event.currentTarget), timezone: "Asia/Kolkata" }; await persist(); });

$("#addPoolBtn").addEventListener("click", () => { tournament.pools.push({ id: createId("pool"), name: "", displayOrder: tournament.pools.length + 1 }); renderPools(); });
$("#poolEditor").addEventListener("click", event => { const button = event.target.closest(".remove-pool"); if (!button) return; const id = button.closest("[data-pool-id]").dataset.poolId; if (tournament.teams.some(team => team.poolId === id) || tournament.matches.some(match => match.poolId === id)) { showErrors(["This pool is assigned to a team or match. Reassign it before removing the pool."]); return; } tournament.pools = tournament.pools.filter(pool => pool.id !== id); renderPools(); });
$("#savePoolsBtn").addEventListener("click", async () => { tournament.pools = $$("#poolEditor [data-pool-id]").map((row, index) => ({ id: row.dataset.poolId, name: row.querySelector('[name="name"]').value.trim(), displayOrder: Number(row.querySelector('[name="displayOrder"]').value) || index + 1 })); if (tournament.pools.some(pool => !pool.name)) { showErrors(["Every pool needs a name."]); return; } const names = tournament.pools.map(pool => pool.name.toLowerCase()); if (new Set(names).size !== names.length) { showErrors(["Pool names must be unique."]); return; } await persist(); });

$("#teamSelector").addEventListener("change", event => { selectedTeamId = event.target.value; renderTeamEditor(); });
$("#addPlayerBtn").addEventListener("click", () => { const team = tournament.teams.find(item => item.id === selectedTeamId); if (team.players.length >= 13) { showErrors(["This team already has 14 players: one captain and 13 additional players."]); return; } team.players.push({ id: createId("player"), name: "", gwid: "", role: "", phone: "", order: team.players.length + 1 }); renderTeamEditor(); });
$("#playerEditor").addEventListener("click", event => { const button = event.target.closest(".remove-player"); if (!button) return; const id = button.closest("tr").dataset.playerId; const team = tournament.teams.find(item => item.id === selectedTeamId); team.players = team.players.filter(player => player.id !== id); renderTeamEditor(); });
$("#teamForm").addEventListener("submit", async event => {
  event.preventDefault(); const form = event.currentTarget, values = formObject(form); const team = tournament.teams.find(item => item.id === selectedTeamId);
  Object.assign(team, { serial: Number(values.serial), name: values.name.trim(), poolId: values.poolId, logoUrl: values.logoUrl.trim(), captain: { name: values.captainName.trim(), gwid: values.captainGwid.trim(), phone: values.captainPhone.trim() } });
  const captainKey = team.captain.name.trim().toLowerCase();
  team.players = $$("#playerEditor tr[data-player-id]").map((row, index) => ({ id: row.dataset.playerId, name: row.querySelector('[name="playerName"]').value.trim(), gwid: row.querySelector('[name="playerGwid"]').value.trim(), role: row.querySelector('[name="playerRole"]').value.trim(), phone: row.querySelector('[name="playerPhone"]').value.trim(), order: index + 1 })).filter(player => (player.name || player.gwid || player.role || player.phone) && (!captainKey || player.name.toLowerCase() !== captainKey));
  if (team.name && !team.captain.name) { showErrors(["Enter the captain’s name for this registered team."]); return; }
  if (team.name && !team.captain.gwid) { showErrors(["Enter a unique GWID for the captain."]); return; }
  if (team.players.some(player => player.name && !player.gwid)) { showErrors(["Every named player must have a GWID."]); return; }
  if (team.players.length > 13) { showErrors(["A team can have 14 players total: the captain plus 13 additional players."]); return; }
  if (await persist()) renderTeamSelector();
});

$("#teamLogoFile").addEventListener("change", async event => {
  const file = event.target.files?.[0]; if (!file) return;
  if (!file.type.startsWith("image/")) { showErrors(["Choose a JPG, PNG, WebP, or GIF image."]); event.target.value = ""; return; }
  if (file.size > 100 * 1024) { showErrors([`Logo is ${(file.size / 1024).toFixed(1)} KB. Please choose an image of 100 KB or less.`]); event.target.value = ""; return; }
  const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
  const team = tournament.teams.find(item => item.id === selectedTeamId); if (!team) return;
  $("#logoUploadStatus").textContent = "Uploading…";
  try { await services.firestoreSdk.setDoc(services.firestoreSdk.doc(services.teamLogosRef, team.id), { teamId:team.id, dataUrl, fileName:file.name, sizeBytes:file.size, updatedAt:new Date().toISOString() }); teamLogos[team.id] = dataUrl; $("#logoUploadStatus").textContent = "Logo uploaded"; renderTeamEditor(); }
  catch (error) {
    showErrors([error.code === "permission-denied"
      ? "Logo upload was denied. Publish firestore.rules in Firebase Console and confirm you are signed in with the configured organizer account."
      : `Logo upload failed: ${error.message || "Check your connection and try again."}`]);
    console.error(error);
  }
  event.target.value = "";
});
$("#removeTeamLogoBtn").addEventListener("click", async () => { const team = tournament.teams.find(item => item.id === selectedTeamId); if (!team || !teamLogos[team.id]) return; await services.firestoreSdk.deleteDoc(services.firestoreSdk.doc(services.teamLogosRef, team.id)); delete teamLogos[team.id]; $("#logoUploadStatus").textContent = "Uploaded logo removed"; renderTeamEditor(); });

$("#newMatchBtn").addEventListener("click", () => { const match = emptyMatch(Math.max(0, ...tournament.matches.map(item => Number(item.number) || 0)) + 1); tournament.matches.push(match); selectedMatchId = match.id; renderMatchSelector(); renderMatchEditor(); });
$("#matchSelector").addEventListener("change", event => { selectedMatchId = event.target.value; renderMatchEditor(); });
$("#deleteMatchBtn").addEventListener("click", async () => { if (!selectedMatchId || !confirm("Delete this match permanently?")) return; tournament.matches = tournament.matches.filter(match => match.id !== selectedMatchId); selectedMatchId = ""; await persist("Match deleted"); });
$("#matchForm").addEventListener("submit", async event => {
  event.preventDefault(); const values = formObject(event.currentTarget); const match = tournament.matches.find(item => item.id === selectedMatchId); if (!match) return;
  if (!isValidOvers(values.team1Overs) || !isValidOvers(values.team2Overs)) { showErrors(["Overs must use legal cricket notation: the final digit can only be 0 to 5. After 4.5, enter 5.0."]); return; }
  const duplicate = tournament.matches.some(item => item.id !== match.id && Number(item.number) === Number(values.number)); if (duplicate) { showErrors(["Match numbers must be unique."]); return; }
  Object.assign(match, values, { number: Number(values.number), innings: Number(values.innings) || 1, oversPerInnings: Number(values.oversPerInnings) || 10, powerplayOvers: Number(values.powerplayOvers) || 0, maxOversPerBowler: Number(values.maxOversPerBowler) || 0, expectedMinutes: Number(values.expectedMinutes) || 90, inningsBreakMinutes: Number(values.inningsBreakMinutes) || 0, targetOverride: values.targetOverride === "" ? "" : Number(values.targetOverride), team1Runs: values.team1Runs === "" ? "" : Number(values.team1Runs), team1Wickets: values.team1Wickets === "" ? "" : Number(values.team1Wickets), team2Runs: values.team2Runs === "" ? "" : Number(values.team2Runs), team2Wickets: values.team2Wickets === "" ? "" : Number(values.team2Wickets), battingScorecard: parseScorecard(values.battingScorecard, ["player","runs","balls","fours","sixes"]), bowlingScorecard: parseScorecard(values.bowlingScorecard, ["player","overs","runs","wickets"]), lastUpdated: new Date().toISOString() });
  syncMatchSummary(match);
  if (await persist()) renderMatchSelector();
});

$("#scoreMatchSelector").addEventListener("change", event => { selectedScoreMatchId = event.target.value; selectedInningsNumber = 1; $("#inningsSelector").value = "1"; resetDeliveryForm(); renderScoringDesk(); });
$("#inningsSelector").addEventListener("change", event => { selectedInningsNumber = Number(event.target.value); resetDeliveryForm(); renderScoringDesk(); });
$("#startMatchBtn").addEventListener("click", async () => {
  const match = tournament.matches.find(item => item.id === selectedScoreMatchId); if (!match) return;
  if (!match.team1Id || !match.team2Id) { showErrors(["Select both teams in the match editor before starting scoring."]); return; }
  match.status = "Live"; match.actualStart ||= new Date().toISOString(); match.actualEnd = ""; match.innings = 1;
  if (!match.battingTeamId) match.battingTeamId = match.tossWinnerId && match.tossDecision ? (match.tossDecision === "Bat" ? match.tossWinnerId : (match.tossWinnerId === match.team1Id ? match.team2Id : match.team1Id)) : match.team1Id;
  const innings = ensureInnings(match, 1); innings.battingTeamId = match.battingTeamId; innings.bowlingTeamId = match.battingTeamId === match.team1Id ? match.team2Id : match.team1Id;
  selectedInningsNumber = 1; await persist("Match is live");
});
$("#startSecondInningsBtn").addEventListener("click", async () => {
  const match = tournament.matches.find(item => item.id === selectedScoreMatchId); if (!match) return;
  const first = ensureInnings(match, 1), firstScore = calculateInnings(first, match.powerplayOvers);
  const second = ensureInnings(match, 2); second.battingTeamId = first.bowlingTeamId; second.bowlingTeamId = first.battingTeamId;
  match.target = Number(match.targetOverride) || firstScore.runs + 1; match.innings = 2; match.battingTeamId = second.battingTeamId; match.currentStriker = ""; match.currentNonStriker = ""; match.currentBowler = "";
  selectedInningsNumber = 2; $("#inningsSelector").value = "2"; resetDeliveryForm(); await persist("Second innings started");
});
$("#completeMatchBtn").addEventListener("click", async () => { const match = tournament.matches.find(item => item.id === selectedScoreMatchId); if (!match) return; match.status = "Completed"; match.actualEnd = new Date().toISOString(); syncMatchSummary(match); await persist("Match completed"); });
$$('[data-quick-run]').forEach(button => button.addEventListener("click", () => { const form = $("#deliveryForm"); form.elements.batRuns.value = button.dataset.quickRun; form.requestSubmit(); }));
function resetDeliveryForm(preservePlayers = true) {
  const form = $("#deliveryForm"); const players = { batter: form.elements.batter.value, nonStriker: form.elements.nonStriker.value, bowler: form.elements.bowler.value };
  form.reset(); fillForm(form, { eventId:"", batRuns:0, extraType:"none", extraRuns:0, ...(preservePlayers ? players : {}) });
  $("#saveDeliveryBtn").textContent = "Add delivery"; $("#cancelDeliveryEditBtn").classList.add("hidden");
}
$("#cancelDeliveryEditBtn").addEventListener("click", () => { resetDeliveryForm(); renderScoringDesk(); });
$("#deliveryForm").addEventListener("submit", async event => {
  event.preventDefault(); const match = tournament.matches.find(item => item.id === selectedScoreMatchId); if (!match) return;
  const innings = ensureInnings(match, selectedInningsNumber), values = formObject(event.currentTarget);
  let batRuns = Number(values.batRuns) || 0, extraRuns = Number(values.extraRuns) || 0;
  if (["wide","no-ball"].includes(values.extraType) && extraRuns < 1) extraRuns = 1;
  if (values.extraType === "dead-ball") { batRuns = 0; extraRuns = 0; }
  if (event.currentTarget.elements.wicket.checked && values.extraType === "no-ball" && values.dismissalType && !["run-out","obstructing-field"].includes(values.dismissalType)) { showErrors(["On a no-ball, use Run out (or leave wicket unchecked) for this scorer."]); return; }
  const existing = innings.events.find(item => item.id === values.eventId);
  const ball = { id: existing?.id || createId("ball"), timestamp: existing?.timestamp || new Date().toISOString(), batter: values.batter.trim(), nonStriker: values.nonStriker.trim(), bowler: values.bowler.trim(), batRuns, extraType: values.extraType, extraRuns, wicket: event.currentTarget.elements.wicket.checked, dismissalType: values.dismissalType, playerOut: event.currentTarget.elements.wicket.checked ? (values.playerOut.trim() || values.batter.trim()) : "", commentary: values.commentary.trim() };
  const currentCalc = calculateInnings(innings, match.powerplayOvers);
  if (!existing && (currentCalc.legalBalls >= Number(match.oversPerInnings || 0) * 6 || currentCalc.wickets >= 10)) { showErrors(["This innings is complete. Start the second innings or correct an existing delivery."]); return; }
  const proposedEvents = existing ? innings.events.map(item => item.id === existing.id ? ball : item) : [...innings.events, ball];
  const proposedCalc = calculateInnings({ ...innings, events: proposedEvents }, match.powerplayOvers);
  const overBowled = proposedCalc.bowlingStats.find(item => Number(match.maxOversPerBowler) > 0 && item.legalBalls > Number(match.maxOversPerBowler) * 6);
  if (overBowled) { showErrors([`${overBowled.player} exceeds the ${match.maxOversPerBowler}-over bowler limit.`]); return; }
  if (existing) Object.assign(existing, ball); else innings.events.push(ball);
  if (!existing) {
    const total = batRuns + extraRuns; let striker = ball.batter, nonStriker = ball.nonStriker;
    if (total % 2 === 1) [striker, nonStriker] = [nonStriker, striker];
    const calc = calculateInnings(innings, match.powerplayOvers); if (ball.extraType !== "wide" && ball.extraType !== "no-ball" && ball.extraType !== "dead-ball" && calc.legalBalls % 6 === 0) [striker, nonStriker] = [nonStriker, striker];
    if (ball.wicket && ball.playerOut === striker) striker = "";
    match.currentStriker = striker; match.currentNonStriker = nonStriker; match.currentBowler = ball.bowler;
  }
  match.innings = selectedInningsNumber; match.battingTeamId = innings.battingTeamId; match.status = "Live"; match.actualStart ||= new Date().toISOString(); match.lastUpdated = new Date().toISOString(); syncMatchSummary(match);
  resetDeliveryForm(false); if (await persist(existing ? "Delivery corrected" : "Delivery added")) renderScoringDesk();
});
$("#undoDeliveryBtn").addEventListener("click", async () => { const match = tournament.matches.find(item => item.id === selectedScoreMatchId); if (!match) return; const innings = ensureInnings(match, selectedInningsNumber); if (!innings.events.length) return; innings.events.pop(); syncMatchSummary(match); resetDeliveryForm(false); await persist("Last delivery removed"); });
$("#deliveryLog").addEventListener("click", async event => {
  const edit = event.target.closest(".edit-delivery"), remove = event.target.closest(".delete-delivery"); if (!edit && !remove) return;
  const match = tournament.matches.find(item => item.id === selectedScoreMatchId), innings = ensureInnings(match, selectedInningsNumber), id = (edit || remove).dataset.eventId;
  if (remove) { innings.events = innings.events.filter(ball => ball.id !== id); syncMatchSummary(match); await persist("Delivery deleted"); return; }
  const ball = innings.events.find(item => item.id === id); if (!ball) return; fillForm($("#deliveryForm"), ball); $("#deliveryForm").elements.wicket.checked = Boolean(ball.wicket); $("#saveDeliveryBtn").textContent = "Save correction"; $("#cancelDeliveryEditBtn").classList.remove("hidden"); $("#deliveryForm").scrollIntoView({behavior:"smooth",block:"center"});
});
$("#saveAdjustmentBtn").addEventListener("click", async () => { const match = tournament.matches.find(item => item.id === selectedScoreMatchId); if (!match) return; const innings = ensureInnings(match, selectedInningsNumber); innings.adjustmentRuns = Number($("#adjustmentRuns").value) || 0; syncMatchSummary(match); await persist("Score adjustment applied"); });

$("#newMemberBtn").addEventListener("click", () => { const member = { id: createId("member"), section: "main", name: "", photoUrl: "", designation: "", responsibility: "", displayOrder: tournament.committees.length + 1 }; tournament.committees.push(member); selectedMemberId = member.id; renderMemberSelector(); renderMemberEditor(); });
$("#memberSelector").addEventListener("change", event => { selectedMemberId = event.target.value; renderMemberEditor(); });
$("#deleteMemberBtn").addEventListener("click", async () => { if (!selectedMemberId || !confirm("Delete this committee member?")) return; tournament.committees = tournament.committees.filter(member => member.id !== selectedMemberId); selectedMemberId = ""; await persist("Committee member deleted"); });
$("#memberForm").addEventListener("submit", async event => { event.preventDefault(); const member = tournament.committees.find(item => item.id === selectedMemberId); Object.assign(member, formObject(event.currentTarget), { displayOrder: Number(event.currentTarget.elements.displayOrder.value) || 0 }); await persist(); });

function openAdminTab(name) {
  const button = $$('[data-admin-tab]').find(item => item.dataset.adminTab === name) || $('[data-admin-tab="settings"]');
  $$('[data-admin-tab]').forEach(item => item.classList.toggle("active", item === button)); $$('.admin-tab').forEach(tab => tab.classList.toggle("active", tab.id === `admin-${button.dataset.adminTab}`));
  history.replaceState(null, "", `#${button.dataset.adminTab}`);
}
$$('[data-admin-tab]').forEach(button => button.addEventListener("click", () => openAdminTab(button.dataset.adminTab)));
openAdminTab(location.hash.slice(1) || "settings");

async function boot() {
  services = await getFirebaseServices(); if (!services) { $("#setupNotice").classList.remove("hidden"); return; }
  services.authSdk.onAuthStateChanged(services.auth, showAuth); $("#loginPanel").classList.remove("hidden");
}
boot().catch(error => { $("#setupNotice").classList.remove("hidden"); console.error(error); });
setInterval(() => { if (tournament && selectedScoreMatchId && !$("#deliveryForm").contains(document.activeElement)) renderScoringDesk(); }, 30000);
