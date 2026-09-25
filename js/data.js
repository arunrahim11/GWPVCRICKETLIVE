export const MATCH_STATUSES = ["Upcoming", "Live", "Completed", "Postponed", "Cancelled"];
export const COMMITTEE_SECTIONS = [
  { value: "main", label: "Main committee" },
  { value: "organizing", label: "Organizing team" },
  { value: "volunteers", label: "Volunteers & supporting members" }
];

export const createId = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export function emptyTeam(serial) {
  return { id: `team-${serial}`, serial, name: "", logoUrl: "", captain: { name: "", phone: "", publishPhone: false }, poolId: "", players: [] };
}

export function emptyMatch(number = 1) {
  return {
    id: createId("match"), number, team1Id: "", team2Id: "", poolId: "", stage: "", date: "", time: "", venue: "",
    status: "Upcoming", innings: 1, battingTeamId: "", target: "", result: "", note: "", playerOfMatch: "",
    team1Runs: "", team1Wickets: "", team1Overs: "", team2Runs: "", team2Wickets: "", team2Overs: "",
    battingScorecard: [], bowlingScorecard: [], lastUpdated: ""
  };
}

export function createDefaultTournament() {
  return {
    schemaVersion: 2,
    settings: { title: "GWPV Cricket Tournament", venue: "", startDate: "", endDate: "", announcement: "", timezone: "Asia/Kolkata" },
    pools: [], teams: Array.from({ length: 9 }, (_, index) => emptyTeam(index + 1)), matches: [], committees: [],
    updatedAt: new Date().toISOString()
  };
}

function cleanPlayer(player = {}, index = 0) {
  return { id: player.id || createId("player"), name: player.name || "", role: player.role || "", phone: player.phone || "", order: Number(player.order) || index + 1 };
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
      captain: { name: captainName, phone: source.captain?.phone || captainPlayer?.phone || "", publishPhone: Boolean(source.captain?.publishPhone) },
      poolId: source.poolId || mappedPool?.id || "",
      players: (source.players || []).filter(player => player.name !== captainName).map(cleanPlayer)
    };
  });
  const matches = (raw.matches || []).map((match, index) => ({
    ...emptyMatch(index + 1), ...match, id: match.id || createId("match"), number: Number(match.number) || index + 1,
    status: match.status === "Scheduled" || match.status === "Innings Break" ? (match.status === "Scheduled" ? "Upcoming" : "Live") : match.status || "Upcoming",
    innings: Number(match.innings) || 1,
    battingScorecard: Array.isArray(match.battingScorecard) ? match.battingScorecard : [], bowlingScorecard: Array.isArray(match.bowlingScorecard) ? match.bowlingScorecard : []
  }));
  return {
    ...defaults, ...raw, schemaVersion: 2,
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

export function validateTournament(data) {
  const errors = [];
  const namedTeams = data.teams.filter(team => team.name.trim());
  const names = namedTeams.map(team => team.name.trim().toLowerCase());
  const serials = data.teams.map(team => Number(team.serial));
  if (new Set(names).size !== names.length) errors.push("Team names must be unique.");
  if (new Set(serials).size !== serials.length) errors.push("Team serial numbers must be unique.");
  if (serials.some(serial => !Number.isInteger(serial) || serial < 1 || serial > 9)) errors.push("Team serial numbers must be from 1 to 9.");
  data.matches.forEach(match => {
    if (match.team1Id && match.team1Id === match.team2Id) errors.push(`Match ${match.number}: choose two different teams.`);
    if (!isValidOvers(match.team1Overs) || !isValidOvers(match.team2Overs)) errors.push(`Match ${match.number}: overs must end in .0 to .5 (for example 4.5, then 5.0).`);
  });
  return errors;
}
