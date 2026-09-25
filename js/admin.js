import { createDefaultTournament, normalizeTournament, emptyMatch, createId, validateTournament, isValidOvers } from "./data.js";
import { getFirebaseServices } from "./firebase.js";

let services, tournament, unsubscribe, unsubscribePrivate, publicSnapshot, privateSnapshot = { teams: [] };
let selectedTeamId = "team-1", selectedMatchId = "", selectedMemberId = "";
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
    publicData.teams.forEach(team => { if (!team.captain.publishPhone) team.captain.phone = ""; team.players.forEach(player => { player.phone = ""; }); });
    await services.firestoreSdk.setDoc(services.privateTournamentRef, privateData);
    await services.firestoreSdk.setDoc(services.tournamentRef, publicData);
    setSaveState(success, "saved"); setTimeout(() => setSaveState("Ready"), 2200); return true;
  }
  catch (error) { setSaveState("Save failed", "error"); showErrors(["The change could not be saved. Check your connection and Firestore permissions."]); console.error(error); return false; }
}

function showAuth(user) {
  $("#loginPanel").classList.toggle("hidden", Boolean(user)); $("#adminPanel").classList.toggle("hidden", !user); $("#signOutBtn").classList.toggle("hidden", !user);
  if (user) subscribe(); else { if (unsubscribe) unsubscribe(); if (unsubscribePrivate) unsubscribePrivate(); unsubscribe = null; unsubscribePrivate = null; }
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
}

function renderAdmin() {
  fillForm($("#settingsForm"), tournament.settings);
  renderPools(); renderTeamSelector(); renderTeamEditor(); renderMatchSelector(); renderMatchEditor(); renderMemberSelector(); renderMemberEditor();
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
  fillForm($("#teamForm"), { serial: team.serial, name: team.name, poolId: team.poolId, logoUrl: team.logoUrl, captainName: team.captain.name, captainPhone: team.captain.phone, publishPhone: team.captain.publishPhone });
  $("#teamForm").elements.poolId.innerHTML = poolOptions(team.poolId);
  $("#playerEditor").innerHTML = team.players.map((player, index) => playerRow(player, index)).join("") || `<tr class="empty-row"><td colspan="5">No additional players added.</td></tr>`;
}
function playerRow(player, index) { return `<tr data-player-id="${attr(player.id)}"><td>${index + 2}</td><td><input name="playerName" value="${attr(player.name)}"></td><td><input name="playerRole" value="${attr(player.role)}" placeholder="Batter, bowler…"></td><td><input name="playerPhone" type="tel" value="${attr(player.phone)}"></td><td><button class="icon-danger remove-player" type="button" aria-label="Remove player">×</button></td></tr>`; }

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
  form.elements.team1Id.innerHTML = teamOptions(match.team1Id); form.elements.team2Id.innerHTML = teamOptions(match.team2Id); form.elements.battingTeamId.innerHTML = teamOptions(match.battingTeamId);
  form.elements.poolId.innerHTML = poolOptions(match.poolId);
  fillForm(form, { ...match, battingScorecard: scorecardToText(match.battingScorecard, ["player","runs","balls","fours","sixes"]), bowlingScorecard: scorecardToText(match.bowlingScorecard, ["player","overs","runs","wickets"]) });
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
$("#addPlayerBtn").addEventListener("click", () => { const team = tournament.teams.find(item => item.id === selectedTeamId); team.players.push({ id: createId("player"), name: "", role: "", phone: "", order: team.players.length + 1 }); renderTeamEditor(); });
$("#playerEditor").addEventListener("click", event => { const button = event.target.closest(".remove-player"); if (!button) return; const id = button.closest("tr").dataset.playerId; const team = tournament.teams.find(item => item.id === selectedTeamId); team.players = team.players.filter(player => player.id !== id); renderTeamEditor(); });
$("#teamForm").addEventListener("submit", async event => {
  event.preventDefault(); const form = event.currentTarget, values = formObject(form); const team = tournament.teams.find(item => item.id === selectedTeamId);
  Object.assign(team, { serial: Number(values.serial), name: values.name.trim(), poolId: values.poolId, logoUrl: values.logoUrl.trim(), captain: { name: values.captainName.trim(), phone: values.captainPhone.trim(), publishPhone: form.elements.publishPhone.checked } });
  team.players = $$("#playerEditor tr[data-player-id]").map((row, index) => ({ id: row.dataset.playerId, name: row.querySelector('[name="playerName"]').value.trim(), role: row.querySelector('[name="playerRole"]').value.trim(), phone: row.querySelector('[name="playerPhone"]').value.trim(), order: index + 1 })).filter(player => player.name || player.role || player.phone);
  if (team.name && !team.captain.name) { showErrors(["Enter the captain’s name for this registered team."]); return; }
  if (team.players.length > 13) { showErrors(["A team can have up to 14 players including the captain."]); return; }
  if (await persist()) renderTeamSelector();
});

$("#newMatchBtn").addEventListener("click", () => { const match = emptyMatch(Math.max(0, ...tournament.matches.map(item => Number(item.number) || 0)) + 1); tournament.matches.push(match); selectedMatchId = match.id; renderMatchSelector(); renderMatchEditor(); });
$("#matchSelector").addEventListener("change", event => { selectedMatchId = event.target.value; renderMatchEditor(); });
$("#deleteMatchBtn").addEventListener("click", async () => { if (!selectedMatchId || !confirm("Delete this match permanently?")) return; tournament.matches = tournament.matches.filter(match => match.id !== selectedMatchId); selectedMatchId = ""; await persist("Match deleted"); });
$("#matchForm").addEventListener("submit", async event => {
  event.preventDefault(); const values = formObject(event.currentTarget); const match = tournament.matches.find(item => item.id === selectedMatchId); if (!match) return;
  if (!isValidOvers(values.team1Overs) || !isValidOvers(values.team2Overs)) { showErrors(["Overs must use legal cricket notation: the final digit can only be 0 to 5. After 4.5, enter 5.0."]); return; }
  const duplicate = tournament.matches.some(item => item.id !== match.id && Number(item.number) === Number(values.number)); if (duplicate) { showErrors(["Match numbers must be unique."]); return; }
  Object.assign(match, values, { number: Number(values.number), innings: Number(values.innings) || 1, target: values.target === "" ? "" : Number(values.target), team1Runs: values.team1Runs === "" ? "" : Number(values.team1Runs), team1Wickets: values.team1Wickets === "" ? "" : Number(values.team1Wickets), team2Runs: values.team2Runs === "" ? "" : Number(values.team2Runs), team2Wickets: values.team2Wickets === "" ? "" : Number(values.team2Wickets), battingScorecard: parseScorecard(values.battingScorecard, ["player","runs","balls","fours","sixes"]), bowlingScorecard: parseScorecard(values.bowlingScorecard, ["player","overs","runs","wickets"]), lastUpdated: new Date().toISOString() });
  if (await persist()) renderMatchSelector();
});

$("#newMemberBtn").addEventListener("click", () => { const member = { id: createId("member"), section: "main", name: "", photoUrl: "", designation: "", responsibility: "", displayOrder: tournament.committees.length + 1 }; tournament.committees.push(member); selectedMemberId = member.id; renderMemberSelector(); renderMemberEditor(); });
$("#memberSelector").addEventListener("change", event => { selectedMemberId = event.target.value; renderMemberEditor(); });
$("#deleteMemberBtn").addEventListener("click", async () => { if (!selectedMemberId || !confirm("Delete this committee member?")) return; tournament.committees = tournament.committees.filter(member => member.id !== selectedMemberId); selectedMemberId = ""; await persist("Committee member deleted"); });
$("#memberForm").addEventListener("submit", async event => { event.preventDefault(); const member = tournament.committees.find(item => item.id === selectedMemberId); Object.assign(member, formObject(event.currentTarget), { displayOrder: Number(event.currentTarget.elements.displayOrder.value) || 0 }); await persist(); });

$$('[data-admin-tab]').forEach(button => button.addEventListener("click", () => { $$('[data-admin-tab]').forEach(item => item.classList.toggle("active", item === button)); $$('.admin-tab').forEach(tab => tab.classList.toggle("active", tab.id === `admin-${button.dataset.adminTab}`)); }));

async function boot() {
  services = await getFirebaseServices(); if (!services) { $("#setupNotice").classList.remove("hidden"); return; }
  services.authSdk.onAuthStateChanged(services.auth, showAuth); $("#loginPanel").classList.remove("hidden");
}
boot().catch(error => { $("#setupNotice").classList.remove("hidden"); console.error(error); });
