import assert from "node:assert/strict";
import { emptyMatch, calculateInnings, getMatchScore, syncMatchSummary, validateTournament, normalizeTournament } from "../js/data.js";

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
console.log("Scoring engine tests passed.");
