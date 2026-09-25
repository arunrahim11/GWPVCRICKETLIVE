const colors = ["#b9f227", "#f4b942", "#57c8ff", "#ff6b6b", "#c38bff", "#5fe0ba", "#ff8f4e", "#f36fb4", "#94a9ff"];

const makePlayers = teamIndex => Array.from({ length: 14 }, (_, index) => ({
  id: `t${teamIndex + 1}-p${index + 1}`,
  name: `Player ${index + 1}`,
  phone: "",
  role: index === 0 ? "Captain / All-rounder" : index === 1 ? "Wicketkeeper" : index < 6 ? "Batter" : index < 10 ? "All-rounder" : "Bowler",
  jersey: String(index + 1)
}));

export const defaultTeams = Array.from({ length: 9 }, (_, index) => ({
  id: index < 5 ? `team-a${index + 1}` : `team-b${index - 4}`,
  name: index < 5 ? `Team A${index + 1}` : `Team B${index - 4}`,
  shortName: index < 5 ? `A${index + 1}` : `B${index - 4}`,
  pool: index < 5 ? "A" : "B",
  captain: "Player 1",
  color: colors[index],
  played: 0,
  won: 0,
  lost: 0,
  points: 0,
  nrr: "0.000",
  players: makePlayers(index)
}));

const poolAFixtures = [[1,2],[3,4],[5,1],[2,3],[4,5],[1,3],[2,5],[4,1],[3,5],[2,4]];
const poolBFixtures = [[1,2],[3,4],[1,3],[2,4],[1,4],[2,3]];

const match = (number, stage, team1Id, team2Id) => ({
  id: `match-${number}`,
  number,
  stage,
  status: "Scheduled",
  team1Id,
  team2Id,
  date: "",
  time: "",
  venue: "GWPV Ground",
  note: "",
  team1Runs: 0,
  team1Wickets: 0,
  team1Overs: "0.0",
  team2Runs: 0,
  team2Wickets: 0,
  team2Overs: "0.0",
  result: "",
  playerOfMatch: "",
  featured: number === 1
});

export const defaultMatches = [
  ...poolAFixtures.map(([a,b], i) => match(i + 1, "Pool A", `team-a${a}`, `team-a${b}`)),
  ...poolBFixtures.map(([a,b], i) => match(i + 11, "Pool B", `team-b${a}`, `team-b${b}`)),
  match(17, "Semifinal", "TBD-A1", "TBD-B2"),
  match(18, "Semifinal", "TBD-B1", "TBD-A2"),
  match(19, "Final", "TBD-SF1", "TBD-SF2")
];

export const defaultRules = [
  "Every team must report at least 30 minutes before its scheduled start time.",
  "Each registered squad contains 14 players; the playing XI must be submitted before the toss.",
  "A win earns 2 points, a tie or no result earns 1 point, and a loss earns 0 points.",
  "The top two teams from each pool qualify for the semifinals. Net Run Rate is the first tiebreaker.",
  "Semifinal 1 is Pool A Rank 1 vs Pool B Rank 2. Semifinal 2 is Pool B Rank 1 vs Pool A Rank 2.",
  "The umpire's decision is final. Only the captain may discuss a decision with the officials.",
  "Match-specific playing conditions, powerplay and bowling limits are announced before the tournament.",
  "Players must maintain society discipline and sporting conduct on and around the field."
];

export function createDefaultTournament() {
  return {
    title: "GWPV Society Cricket Championship",
    venue: "GWPV Ground",
    dates: "Dates to be announced",
    overs: 10,
    status: "Upcoming",
    announcement: "Welcome to the GWPV Society Cricket Championship.",
    teams: structuredClone(defaultTeams),
    matches: structuredClone(defaultMatches),
    rules: [...defaultRules],
    updatedAt: new Date().toISOString()
  };
}
