export const MATCH_STATUSES = ["Upcoming", "Live", "Completed", "Postponed", "Cancelled"];
export const COMMITTEE_SECTIONS = [
  { value: "main", label: "Main committee" },
  { value: "organizing", label: "Organizing team" },
  { value: "volunteers", label: "Volunteers & supporting members" }
];

export const CHART_POOL_FIXTURES = [
  { number: 1, pool: "A", team1: "A1", team2: "A2", rest: "A5", date: "2026-09-29", time: "08:00" },
  { number: 2, pool: "B", team1: "B1", team2: "B2", date: "2026-09-29", time: "09:30" },
  { number: 3, pool: "A", team1: "A3", team2: "A4", rest: "A5", date: "2026-09-29", time: "11:00" },
  { number: 4, pool: "B", team1: "B3", team2: "B4", date: "2026-09-29", time: "13:00" },
  { number: 5, pool: "A", team1: "A1", team2: "A5", rest: "A4", date: "2026-09-29", time: "14:30" },
  { number: 6, pool: "B", team1: "B1", team2: "B3", date: "2026-09-30", time: "08:00" },
  { number: 7, pool: "A", team1: "A2", team2: "A3", rest: "A4", date: "2026-09-30", time: "09:30" },
  { number: 8, pool: "B", team1: "B2", team2: "B4", date: "2026-09-30", time: "11:00" },
  { number: 9, pool: "A", team1: "A4", team2: "A5", rest: "A3", date: "2026-09-30", time: "13:00" },
  { number: 10, pool: "B", team1: "B1", team2: "B4", date: "2026-09-30", time: "14:30" },
  { number: 11, pool: "A", team1: "A1", team2: "A3", rest: "A2", date: "2026-10-01", time: "08:00" },
  { number: 12, pool: "B", team1: "B2", team2: "B3", date: "2026-10-01", time: "09:30" },
  { number: 13, pool: "A", team1: "A2", team2: "A5", rest: "A1", date: "2026-10-01", time: "11:00" },
  { number: 14, pool: "A", team1: "A1", team2: "A4", rest: "A2", date: "2026-10-01", time: "13:00" },
  { number: 15, pool: "A", team1: "A3", team2: "A5", rest: "A1", date: "2026-10-01", time: "14:30" },
  { number: 16, pool: "A", team1: "A2", team2: "A4", rest: "A3", date: "2026-10-01", time: "16:00" }
];

export const CHART_TEAM_GWIDS = {
  A1: "441", A2: "459", A3: "125", A4: "231", A5: "228",
  B1: "177", B2: "433", B3: "122", B4: "445"
};

const CHART_KNOCKOUT_FIXTURES = [
  { number: 17, team1Id: "TBD-A1", team2Id: "TBD-B2", stage: "Semi-final 1", date: "2026-10-02", time: "08:00", oversPerInnings: 10 },
  { number: 18, team1Id: "TBD-B1", team2Id: "TBD-A2", stage: "Semi-final 2", date: "2026-10-02", time: "11:00", oversPerInnings: 10 },
  { number: 19, team1Id: "TBD-SF1", team2Id: "TBD-SF2", stage: "Grand final", date: "2026-10-02", time: "14:00", oversPerInnings: 12 }
];

export const createId = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export function emptyTeam(serial) {
  return { id: `team-${serial}`, serial, name: "", logoUrl: "", captain: { name: "", gwid: "", phone: "" }, poolId: "", players: [] };
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

export function createChartSchedule(teams, existingMatches = []) {
  const teamIds = Object.fromEntries(Object.entries(CHART_TEAM_GWIDS).map(([code, gwid]) => {
    const matches = teams.filter(team => String(team.captain?.gwid || "").trim().padStart(3, "0") === gwid);
    if (matches.length !== 1) throw new Error(`Chart team ${code} must match exactly one captain with GWID ${gwid}.`);
    return [code, matches[0].id];
  }));
  const existingByNumber = new Map(existingMatches.map(match => [Number(match.number), match]));
  const chartFixtures = [
    ...CHART_POOL_FIXTURES.map(fixture => ({
      number: fixture.number, team1Id: teamIds[fixture.team1], team2Id: teamIds[fixture.team2],
      poolId: `pool-${fixture.pool.toLowerCase()}`, stage: `Pool ${fixture.pool}`,
      date: fixture.date, time: fixture.time
    })),
    ...CHART_KNOCKOUT_FIXTURES
  ];
  const scheduledNumbers = new Set(chartFixtures.map(fixture => fixture.number));
  return [
    ...chartFixtures.map(fixture => {
      const existing = existingByNumber.get(fixture.number);
      const teamsChanged = existing && (existing.team1Id !== fixture.team1Id || existing.team2Id !== fixture.team2Id);
      const hasProgress = existing && (
        existing.status !== "Upcoming" || existing.actualStart || existing.actualEnd || existing.result
        || existing.inningsData?.some(innings => innings.events?.length)
        || existing.battingScorecard?.length || existing.bowlingScorecard?.length
        || existing.team1Runs !== "" || existing.team2Runs !== ""
      );
      if (teamsChanged && hasProgress) throw new Error(`Match ${fixture.number} already has score or result data and cannot be replaced.`);
      return {
        ...emptyMatch(fixture.number),
        ...(existing || {}),
        id: existing?.id || `chart-match-${fixture.number}`,
        number: fixture.number,
        team1Id: fixture.team1Id,
        team2Id: fixture.team2Id,
        poolId: fixture.poolId || "",
        stage: fixture.stage,
        date: fixture.date,
        time: fixture.time,
        ...(fixture.oversPerInnings ? { oversPerInnings: fixture.oversPerInnings } : {}),
        ...(teamsChanged ? {
          status: "Upcoming", venue: "", innings: 1, battingTeamId: "",
          target: "", targetOverride: "", result: "", note: "", playerOfMatch: "",
          actualStart: "", actualEnd: "", currentStriker: "", currentNonStriker: "", currentBowler: "",
          team1Runs: "", team1Wickets: "", team1Overs: "", team2Runs: "", team2Wickets: "", team2Overs: "",
          inningsData: [], battingScorecard: [], bowlingScorecard: [], lastUpdated: ""
        } : {})
      };
    }),
    ...existingMatches.filter(match => !scheduledNumbers.has(Number(match.number)))
  ].sort((a, b) => a.number - b.number);
}

export function createDefaultTournament() {
  return {
    schemaVersion: 3,
    settings: { title: "GWPV Cricket Tournament", venue: "", startDate: "", endDate: "", announcement: "", timezone: "Asia/Kolkata" },
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
      captain: { name: captainName, gwid: source.captain?.gwid || captainPlayer?.gwid || "", phone: source.captain?.phone || captainPlayer?.phone || "" },
      poolId: source.poolId || mappedPool?.id || "",
      players: (source.players || []).filter(player => String(player.name || "").trim().toLowerCase() !== String(captainName || "").trim().toLowerCase()).map(cleanPlayer)
    };
  });
  const matches = (raw.matches || []).map((match, index) => ({
    ...emptyMatch(index + 1), ...match, id: match.id || createId("match"), number: Number(match.number) || index + 1,
    status: match.status === "Scheduled" || match.status === "Innings Break" ? (match.status === "Scheduled" ? "Upcoming" : "Live") : match.status || "Upcoming",
    innings: Number(match.innings) || 1,
    oversPerInnings: match.oversPerInnings == null || match.oversPerInnings === "" ? 10 : Number(match.oversPerInnings) || 10,
    powerplayOvers: match.powerplayOvers == null || match.powerplayOvers === "" ? 3 : Number(match.powerplayOvers) || 0,
    maxOversPerBowler: match.maxOversPerBowler == null || match.maxOversPerBowler === "" ? 2 : Number(match.maxOversPerBowler) || 0,
    expectedMinutes: match.expectedMinutes == null || match.expectedMinutes === "" ? 90 : Number(match.expectedMinutes) || 90,
    inningsBreakMinutes: match.inningsBreakMinutes == null || match.inningsBreakMinutes === "" ? 10 : Number(match.inningsBreakMinutes) || 0,
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

export function updatePhonesByGwid(teams, phoneByGwid, fallbackNamesByGwid = {}) {
  const people = teams.flatMap(team => [team.captain, ...team.players]);
  const fallbackPhones = new Map();
  Object.entries(fallbackNamesByGwid).forEach(([id, names]) => {
    const gwid = id.trim().padStart(3, "0");
    if (!Object.hasOwn(phoneByGwid, gwid)) return;
    const normalizedNames = new Set(names.map(name => name.trim().toLowerCase().replace(/[^a-z0-9]/g, "")));
    const matches = people.filter(person =>
      !Object.hasOwn(phoneByGwid, String(person.gwid || "").trim().padStart(3, "0"))
      && normalizedNames.has(String(person.name || "").trim().toLowerCase().replace(/[^a-z0-9]/g, ""))
    );
    if (matches.length === 1) fallbackPhones.set(matches[0], phoneByGwid[gwid]);
  });
  let updated = 0;
  people.forEach(person => {
    const gwid = String(person.gwid || "").trim().padStart(3, "0");
    const phone = phoneByGwid[gwid] || fallbackPhones.get(person);
    if (!phone) return;
    person.phone = phone;
    updated += 1;
  });
  return updated;
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
  const expectedMs = Math.max(1, Number(match.expectedMinutes) || 90) * 60000;
  if (!match.actualStart) return { elapsedMs: null, remainingMs: expectedMs, estimatedEnd: "", durationText: "Not started" };
  const start = new Date(match.actualStart).getTime();
  const end = match.actualEnd ? new Date(match.actualEnd).getTime() : now;
  const elapsedMs = Math.max(0, end - start);
  const remainingMs = Math.max(0, expectedMs - elapsedMs);
  if (match.actualEnd) return { elapsedMs, remainingMs, estimatedEnd: match.actualEnd, durationText: formatDuration(elapsedMs) };
  const score = getMatchScore(match);
  const completedBalls = (score.calc1?.legalBalls || 0) + (score.calc2?.legalBalls || 0);
  const totalBalls = Math.max(1, Number(match.oversPerInnings || 0) * 12);
  const projectedMs = completedBalls >= 6 ? (elapsedMs / completedBalls) * totalBalls + Number(match.inningsBreakMinutes || 0) * 60000 : expectedMs;
  const estimatedEnd = new Date(start + Math.max(elapsedMs, projectedMs)).toISOString();
  return { elapsedMs, remainingMs, estimatedEnd, durationText: formatDuration(elapsedMs) };
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
