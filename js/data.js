export const MATCH_STATUSES = ["Upcoming", "Live", "Completed", "Postponed", "Cancelled"];
export const COMMITTEE_SECTIONS = [
  { value: "main", label: "Main committee" },
  { value: "organizing", label: "Organizing team" },
  { value: "volunteers", label: "Volunteers & supporting members" }
];

export const createId = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export function emptyTeam(serial) {
  return { id: `team-${serial}`, serial, name: "", logoUrl: "", captain: { name: "", gwid: "", phone: "", publishPhone: false }, poolId: "", players: [] };
}

export function emptyMatch(number = 1) {
  return {
    id: createId("match"), number, team1Id: "", team2Id: "", poolId: "", stage: "", date: "", time: "", venue: "",
    status: "Upcoming", innings: 1, battingTeamId: "", target: "", targetOverride: "", result: "", note: "", playerOfMatch: "",
    oversPerInnings: 10, powerplayOvers: 3, maxOversPerBowler: 2, expectedMinutes: 90, inningsBreakMinutes: 10,
    actualStart: "", actualEnd: "", tossWinnerId: "", tossDecision: "",
    currentStriker: "", currentNonStriker: "", currentBowler: "",
    team1Runs: "", team1Wickets: "", team1Overs: "", team2Runs: "", team2Wickets: "", team2Overs: "",
    inningsData: [], battingScorecard: [], bowlingScorecard: [], lastUpdated: ""
  };
}

export function createDefaultTournament() {
  return {
    schemaVersion: 3,
    settings: { title: "GWPV Cricket Tournament", venue: "", startDate: "", endDate: "", announcement: "", timezone: "Asia/Kolkata", publishDirectoryPhones: true },
    pools: [], teams: Array.from({ length: 9 }, (_, index) => emptyTeam(index + 1)), matches: [], committees: [],
    updatedAt: new Date().toISOString()
  };
}

function cleanPlayer(player = {}, index = 0) {
  return { id: player.id || createId("player"), name: player.name || "", gwid: player.gwid || "", role: player.role || "", phone: player.phone || "", order: Number(player.order) || index + 1 };
}

export function normalizeTournament(raw) {
  if (!raw) return createDefaultTournament();
  const defaults = createDefaultTournament();
  const oldPools = [...new Set((raw.teams || []).map(team => team.pool).filter(Boolean))];
  const pools = Array.isArray(raw.pools) ? raw.pools.map((pool, index) => ({
    id: pool.id || createId("pool"), name: pool.name || String(pool), displayOrder: Number(pool.displayOrder) || index + 1
  })) : oldPools.map((name, index) => ({ id: `pool-${String(name).toLowerCase()}`, name: `Pool ${name}`, displayOrder: index + 1 }));
  const sourceTeams = Array.isArray(raw.teams) ? raw.teams : [];
  const teams = Array.from({ length: 9 }, (_, index) => {
    const source = sourceTeams[index] || {};
    const captainName = typeof source.captain === "string" ? source.captain : source.captain?.name || "";
    const captainPlayer = (source.players || []).find(player => player.name && player.name === captainName);
    const oldPoolName = source.pool ? `Pool ${source.pool}` : "";
    const mappedPool = pools.find(pool => pool.id === source.poolId || pool.name === oldPoolName || pool.name === source.pool);
    return {
      ...emptyTeam(index + 1), id: source.id || `team-${index + 1}`, serial: Number(source.serial) || index + 1,
      name: source.name || "", logoUrl: source.logoUrl || source.photoUrl || "",
      captain: { name: captainName, gwid: source.captain?.gwid || captainPlayer?.gwid || "", phone: source.captain?.phone || captainPlayer?.phone || "", publishPhone: Boolean(source.captain?.publishPhone) },
      poolId: source.poolId || mappedPool?.id || "",
      players: (source.players || []).filter(player => String(player.name || "").trim().toLowerCase() !== String(captainName || "").trim().toLowerCase()).map(cleanPlayer)
    };
  });
  const matches = (raw.matches || []).map((match, index) => ({
    ...emptyMatch(index + 1), ...match, id: match.id || createId("match"), number: Number(match.number) || index + 1,
    status: match.status === "Scheduled" || match.status === "Innings Break" ? (match.status === "Scheduled" ? "Upcoming" : "Live") : match.status || "Upcoming",
    innings: Number(match.innings) || 1,
    oversPerInnings: Number(match.oversPerInnings) || 10, powerplayOvers: Number(match.powerplayOvers) || 0,
    maxOversPerBowler: Number(match.maxOversPerBowler) || 0, expectedMinutes: Number(match.expectedMinutes) || 90,
    inningsBreakMinutes: Number(match.inningsBreakMinutes) || 0,
    inningsData: Array.isArray(match.inningsData) ? match.inningsData.map((innings, inningsIndex) => ({
      number: innings.number || inningsIndex + 1, battingTeamId: innings.battingTeamId || "", bowlingTeamId: innings.bowlingTeamId || "",
      adjustmentRuns: Number(innings.adjustmentRuns) || 0, events: Array.isArray(innings.events) ? innings.events : []
    })) : [],
    battingScorecard: Array.isArray(match.battingScorecard) ? match.battingScorecard : [], bowlingScorecard: Array.isArray(match.bowlingScorecard) ? match.bowlingScorecard : []
  }));
  return {
    ...defaults, ...raw, schemaVersion: 3,
    settings: {
      ...defaults.settings, ...(raw.settings || {}), title: raw.settings?.title || raw.title || defaults.settings.title,
      venue: raw.settings?.venue || raw.venue || "", announcement: raw.settings?.announcement || raw.announcement || ""
    },
    pools, teams, matches, committees: Array.isArray(raw.committees) ? raw.committees : []
  };
}

export function isValidOvers(value) {
  return value === "" || value == null || /^\d+\.[0-5]$/.test(String(value).trim());
}

export function oversToBalls(value) {
  if (!isValidOvers(value) || value === "" || value == null) return null;
  const [overs, balls] = String(value).split(".").map(Number);
  return overs * 6 + balls;
}

export function ballsToOvers(balls = 0) {
  const legalBalls = Math.max(0, Number(balls) || 0);
  return `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;
}

export function isLegalDelivery(event = {}) {
  return !["wide", "no-ball", "dead-ball"].includes(event.extraType);
}

export function deliveryRuns(event = {}) {
  const batRuns = Math.max(0, Number(event.batRuns) || 0);
  let extras = Math.max(0, Number(event.extraRuns) || 0);
  if (["wide", "no-ball"].includes(event.extraType) && extras < 1) extras = 1;
  return batRuns + extras;
}

export function calculateInnings(innings = {}, powerplayOvers = 0) {
  let legalBalls = 0, runs = Number(innings.adjustmentRuns) || 0, wickets = 0;
  const overs = new Map();
  const batting = new Map(), bowling = new Map();
  const events = (innings.events || []).map((event, index) => {
    const overNumber = Math.floor(legalBalls / 6);
    const ballNumber = (legalBalls % 6) + 1;
    const legal = isLegalDelivery(event);
    const suffix = event.extraType === "wide" ? "wd" : event.extraType === "no-ball" ? "nb" : event.extraType === "dead-ball" ? "db" : "";
    const totalRuns = deliveryRuns(event);
    const powerplay = legalBalls < Number(powerplayOvers || 0) * 6;
    runs += totalRuns;
    if (event.wicket && event.dismissalType !== "retired-hurt") wickets += 1;
    if (event.batter) {
      if (!batting.has(event.batter)) batting.set(event.batter, { player:event.batter, runs:0, balls:0, fours:0, sixes:0, dismissal:"not out" });
      const batter = batting.get(event.batter); batter.runs += Math.max(0, Number(event.batRuns) || 0); if (event.extraType !== "wide" && event.extraType !== "dead-ball") batter.balls += 1;
      if (Number(event.batRuns) === 4) batter.fours += 1; if (Number(event.batRuns) === 6) batter.sixes += 1;
    }
    if (event.wicket && event.playerOut) {
      if (!batting.has(event.playerOut)) batting.set(event.playerOut, { player:event.playerOut, runs:0, balls:0, fours:0, sixes:0, dismissal:"not out" });
      batting.get(event.playerOut).dismissal = event.dismissalType === "retired-hurt" ? "retired hurt" : (event.dismissalType || "out").replaceAll("-", " ");
    }
    if (event.bowler) {
      if (!bowling.has(event.bowler)) bowling.set(event.bowler, { player:event.bowler, legalBalls:0, runs:0, wickets:0, dots:0 });
      const bowler = bowling.get(event.bowler); if (legal) bowler.legalBalls += 1;
      if (!["bye","leg-bye","penalty","dead-ball"].includes(event.extraType)) bowler.runs += totalRuns;
      if (event.wicket && !["run-out","retired-hurt","obstructing-field"].includes(event.dismissalType)) bowler.wickets += 1;
      if (totalRuns === 0 && legal) bowler.dots += 1;
    }
    const computed = { ...event, index, legal, totalRuns, label: `${overNumber}.${ballNumber}${suffix}`, powerplay };
    if (!overs.has(overNumber)) overs.set(overNumber, { number: overNumber + 1, runs: 0, wickets: 0, events: [], powerplay });
    const group = overs.get(overNumber); group.runs += totalRuns; if (event.wicket && event.dismissalType !== "retired-hurt") group.wickets += 1; group.events.push(computed);
    if (legal) legalBalls += 1;
    return computed;
  });
  const runRate = legalBalls ? runs / (legalBalls / 6) : 0;
  const battingStats = [...batting.values()].map(item => ({ ...item, strikeRate: item.balls ? (item.runs / item.balls) * 100 : 0 }));
  const bowlingStats = [...bowling.values()].map(item => ({ ...item, overs: ballsToOvers(item.legalBalls), economy: item.legalBalls ? item.runs / (item.legalBalls / 6) : 0 }));
  return { runs, wickets, legalBalls, overs: ballsToOvers(legalBalls), runRate, events, overGroups: [...overs.values()], battingStats, bowlingStats };
}

export function getMatchScore(match = {}) {
  const innings1 = match.inningsData?.find(item => Number(item.number) === 1);
  const innings2 = match.inningsData?.find(item => Number(item.number) === 2);
  const calc1 = innings1 ? calculateInnings(innings1, match.powerplayOvers) : null;
  const calc2 = innings2 ? calculateInnings(innings2, match.powerplayOvers) : null;
  const target = Number(match.targetOverride) || (calc1 ? calc1.runs + 1 : Number(match.target) || 0);
  const maxBalls = Math.max(0, Number(match.oversPerInnings) || 0) * 6;
  const runsRequired = calc2 && target ? Math.max(0, target - calc2.runs) : null;
  const ballsRemaining = calc2 ? Math.max(0, maxBalls - calc2.legalBalls) : null;
  const requiredRunRate = runsRequired != null && ballsRemaining > 0 ? runsRequired / (ballsRemaining / 6) : null;
  return { innings1, innings2, calc1, calc2, target, runsRequired, ballsRemaining, requiredRunRate };
}

export function syncMatchSummary(match) {
  const score = getMatchScore(match);
  [[score.innings1, score.calc1], [score.innings2, score.calc2]].forEach(([innings, calc]) => {
    if (!innings || !calc) return;
    const side = innings.battingTeamId === match.team1Id ? "team1" : innings.battingTeamId === match.team2Id ? "team2" : "";
    if (!side) return;
    match[`${side}Runs`] = calc.runs; match[`${side}Wickets`] = calc.wickets; match[`${side}Overs`] = calc.overs;
  });
  if (score.calc1) match.target = Number(match.targetOverride) || score.calc1.runs + 1;
  return match;
}

export function formatDuration(milliseconds) {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return "—";
  const minutes = Math.floor(milliseconds / 60000);
  const hours = Math.floor(minutes / 60), remainder = minutes % 60;
  return hours ? `${hours}h ${remainder}m` : `${remainder}m`;
}

export function getMatchTiming(match, now = Date.now()) {
  if (!match.actualStart) return { elapsedMs: null, estimatedEnd: "", durationText: "Not started" };
  const start = new Date(match.actualStart).getTime();
  const end = match.actualEnd ? new Date(match.actualEnd).getTime() : now;
  const elapsedMs = Math.max(0, end - start);
  if (match.actualEnd) return { elapsedMs, estimatedEnd: match.actualEnd, durationText: formatDuration(elapsedMs) };
  const score = getMatchScore(match);
  const completedBalls = (score.calc1?.legalBalls || 0) + (score.calc2?.legalBalls || 0);
  const totalBalls = Math.max(1, Number(match.oversPerInnings || 0) * 12);
  const expectedMs = Math.max(1, Number(match.expectedMinutes) || 90) * 60000;
  const projectedMs = completedBalls >= 6 ? (elapsedMs / completedBalls) * totalBalls + Number(match.inningsBreakMinutes || 0) * 60000 : expectedMs;
  const estimatedEnd = new Date(start + Math.max(elapsedMs, projectedMs)).toISOString();
  return { elapsedMs, estimatedEnd, durationText: formatDuration(elapsedMs) };
}

export function validateTournament(data) {
  const errors = [];
  const namedTeams = data.teams.filter(team => team.name.trim());
  const names = namedTeams.map(team => team.name.trim().toLowerCase());
  const serials = data.teams.map(team => Number(team.serial));
  const registeredPeople = data.teams.flatMap(team => team.name.trim() ? [
    ...(team.captain?.name?.trim() ? [{ name: team.captain.name, gwid: team.captain.gwid }] : []),
    ...(team.players || []).filter(player => player.name.trim()).map(player => ({ name: player.name, gwid: player.gwid }))
  ] : []);
  const gwids = registeredPeople.map(person => String(person.gwid || "").trim().toLowerCase()).filter(Boolean);
  if (new Set(names).size !== names.length) errors.push("Team names must be unique.");
  if (new Set(serials).size !== serials.length) errors.push("Team serial numbers must be unique.");
  if (serials.some(serial => !Number.isInteger(serial) || serial < 1 || serial > 9)) errors.push("Team serial numbers must be from 1 to 9.");
  if (new Set(gwids).size !== gwids.length) errors.push("Every GWID must be unique across all teams.");
  data.matches.forEach(match => {
    if (match.team1Id && match.team1Id === match.team2Id) errors.push(`Match ${match.number}: choose two different teams.`);
    if (!isValidOvers(match.team1Overs) || !isValidOvers(match.team2Overs)) errors.push(`Match ${match.number}: overs must end in .0 to .5 (for example 4.5, then 5.0).`);
    if (Number(match.powerplayOvers) > Number(match.oversPerInnings)) errors.push(`Match ${match.number}: powerplay overs cannot exceed total overs.`);
  });
  return errors;
}
