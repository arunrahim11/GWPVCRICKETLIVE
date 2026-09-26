import assert from "node:assert/strict";
import { emptyMatch, calculateInnings, getMatchScore, getMatchTiming, syncMatchSummary, validateTournament, normalizeTournament, updatePhonesByGwid, createChartSchedule, CHART_POOL_FIXTURES } from "../js/data.js";

const delivery = (id, batRuns = 0, extraType = "none", extraRuns = 0, more = {}) => ({ id, batter: "A", bowler: "B", batRuns, extraType, extraRuns, ...more });
const match = emptyMatch(7);
Object.assign(match, { team1Id: "t1", team2Id: "t2", oversPerInnings: 2, powerplayOvers: 1, maxOversPerBowler: 1 });
match.inningsData = [{
  number: 1, battingTeamId: "t1", bowlingTeamId: "t2", events: [
    delivery("1", 4), delivery("2", 0, "wide", 1), delivery("3", 6, "no-ball", 1),
    delivery("4", 0, "none", 0, { wicket: true, dismissalType: "bowled", playerOut: "A" }),
    delivery("5", 1), delivery("6", 2), delivery("7"), delivery("8")
  ]
}];

const first = calculateInnings(match.inningsData[0], match.powerplayOvers);
assert.equal(first.runs, 15); assert.equal(first.wickets, 1); assert.equal(first.legalBalls, 6); assert.equal(first.overs, "1.0");
assert.equal(first.events[1].label, "0.2wd"); assert.equal(first.events[2].label, "0.2nb");
assert.equal(first.runRate, 15); assert.equal(first.battingStats[0].strikeRate.toFixed(1), "185.7"); assert.equal(first.bowlingStats[0].economy, 15);

const notStartedTiming = getMatchTiming({ expectedMinutes:90 }, Date.parse("2026-09-29T02:00:00Z"));
assert.equal(notStartedTiming.elapsedMs, null);
assert.equal(notStartedTiming.remainingMs, 90 * 60 * 1000);
const runningTiming = getMatchTiming({ actualStart:"2026-09-29T02:00:00.000Z", expectedMinutes:90, oversPerInnings:8, inningsData:[] }, Date.parse("2026-09-29T02:30:00Z"));
assert.equal(runningTiming.elapsedMs, 30 * 60 * 1000);
assert.equal(runningTiming.remainingMs, 60 * 60 * 1000);
const expiredTiming = getMatchTiming({ actualStart:"2026-09-29T02:00:00.000Z", expectedMinutes:90, actualEnd:"2026-09-29T03:35:00.000Z" }, Date.parse("2026-09-29T03:40:00Z"));
assert.equal(expiredTiming.remainingMs, 0);

syncMatchSummary(match); assert.equal(match.target, 16);
match.inningsData.push({ number: 2, battingTeamId: "t2", bowlingTeamId: "t1", events: [delivery("9", 6)] });
let chase = getMatchScore(match);
assert.equal(chase.runsRequired, 10); assert.equal(chase.ballsRemaining, 11); assert.equal(chase.requiredRunRate.toFixed(2), "5.45");

match.inningsData[0].events[0].batRuns = 1; syncMatchSummary(match); assert.equal(getMatchScore(match).target, 13);
match.targetOverride = 20; syncMatchSummary(match); assert.equal(getMatchScore(match).target, 20);

const configurationErrors = validateTournament({ teams: Array.from({ length: 9 }, (_, index) => ({ name: "", serial: index + 1 })), matches: [{ ...match, powerplayOvers: 3, oversPerInnings: 2 }] });
assert(configurationErrors.some(error => error.includes("powerplay")));

const migrated = normalizeTournament({ teams: [{ name:"Warriors", captain:"Vinod", players:[{name:"VINOD",role:"Captain"},{name:"Yani",role:"Vice Captain"}] }] });
assert.equal(migrated.teams[0].players.length, 1); assert.equal(migrated.teams[0].players[0].name, "Yani");
const formatMigration = normalizeTournament({ matches: [
  { number:1, oversPerInnings:8, powerplayOvers:2, maxOversPerBowler:2, expectedMinutes:90, inningsBreakMinutes:10 },
  { number:2 },
  { number:3, powerplayOvers:0, maxOversPerBowler:0 }
] });
assert.deepEqual(
  [formatMigration.matches[0].oversPerInnings, formatMigration.matches[0].powerplayOvers, formatMigration.matches[0].maxOversPerBowler],
  [8, 2, 2]
);
assert.deepEqual(
  [formatMigration.matches[1].oversPerInnings, formatMigration.matches[1].powerplayOvers, formatMigration.matches[1].maxOversPerBowler],
  [10, 3, 2]
);
assert.deepEqual(
  [formatMigration.matches[2].powerplayOvers, formatMigration.matches[2].maxOversPerBowler],
  [0, 0]
);

const phoneTeams = [{ captain: { gwid:"67", phone:"" }, players:[{ gwid:"125", phone:"old" },{ gwid:"999", name:"Vamshi Krishna", phone:"unchanged" }] }];
assert.equal(updatePhonesByGwid(phoneTeams, { "067":"9000000000", "125":"9111111111", "310":"9222222222" }, { "310":["Vamshi Krishna"] }), 3);
assert.equal(phoneTeams[0].captain.phone, "9000000000");
assert.equal(phoneTeams[0].players[0].phone, "9111111111");
assert.equal(phoneTeams[0].players[1].phone, "9222222222");
const ambiguousPhoneTeams = [{ captain: { gwid:"174", name:"Vamshi Krishna" }, players:[{ gwid:"175", name:"Vamshi Krishna" }] }];
assert.equal(updatePhonesByGwid(ambiguousPhoneTeams, { "310":"9222222222" }, { "310":["Vamshi Krishna"] }), 0);

const chartTeams = ["441","459","125","231","228","177","433","122","445"].map((gwid, index) => ({
  id: `chart-team-${index + 1}`, captain: { gwid }
}));
const chartSchedule = createChartSchedule(chartTeams);
assert.equal(chartSchedule.length, 19);
assert.equal(chartSchedule.filter(item => item.stage === "Pool A").length, 10);
assert.equal(chartSchedule.filter(item => item.stage === "Pool B").length, 6);
assert.equal(chartSchedule.filter(item => item.stage.startsWith("Semi-final")).length, 2);
assert.equal(chartSchedule.find(item => item.number === 19).stage, "Grand final");
assert.equal(CHART_POOL_FIXTURES.filter(item => item.rest).length, 10);
const existingChartMatch = { ...emptyMatch(1), id:"existing-match-1", team1Id:"chart-team-1", team2Id:"chart-team-2", date:"2026-09-29", stage:"Match 01" };
const refreshedChart = createChartSchedule(chartTeams, [existingChartMatch]);
assert.equal(refreshedChart.find(item => item.number === 1).id, "existing-match-1");
assert.equal(refreshedChart.find(item => item.number === 1).date, "2026-09-29");
assert.equal(refreshedChart.find(item => item.number === 1).stage, "Pool A");
assert.throws(() => createChartSchedule(chartTeams, [{ ...emptyMatch(1), team1Id:"old", team2Id:"fixture", status:"Completed" }]), /cannot be replaced/);

const gwidTeams = Array.from({ length:9 }, (_,index) => ({ name:"", serial:index+1, captain:{name:"",gwid:""}, players:[] }));
gwidTeams[0] = { name:"Warriors", serial:1, captain:{name:"Vinod",gwid:"GWPV001"}, players:[{name:"Yani",gwid:"gwpv001"}] };
assert(validateTournament({ teams:gwidTeams, matches:[] }).some(error => error.includes("GWID")));
console.log("Scoring engine tests passed.");
