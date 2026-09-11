const fs = require('fs');

const fixtures = [
  ['15-Nov-25', 'DAY 1', 'MATCH 1', 'EPAM SHINERS', 'EPAM STALWARTS', 'G1', '9:00 AM', '11:30 AM'],
  ['15-Nov-25', 'DAY 1', 'MATCH 2', 'EPAM SPARTANS', 'EPAM PHOENIXES', 'G2', '11:30 AM', '14:00 PM'],
  ['15-Nov-25', 'DAY 1', 'MATCH 3', 'EPAM RADIANTS', 'EPAM DYNAMOS', 'G1', '14:00 PM', '16:30 PM'],
  ['16-Nov-25', 'DAY 2', 'MATCH 4', 'EPAM GLORIFIERS', 'EPAM VICTORS', 'G2', '9:00 AM', '11:30 AM'],
  ['16-Nov-25', 'DAY 2', 'MATCH 5', 'EPAM SPARKS', 'EPAM SHINERS', 'G1', '11:30 AM', '14:00 PM'],
  ['16-Nov-25', 'DAY 2', 'MATCH 6', 'EPAM PHOENIXES', 'EPAM GUARDIANS', 'G2', '14:00 PM', '16:30 PM'],
  ['22-Nov-25', 'DAY 3', 'MATCH 7', 'EPAM DYNAMOS', 'EPAM SPARKS', 'G1', '9:00 AM', '11:30 AM'],
  ['22-Nov-25', 'DAY 3', 'MATCH 8', 'EPAM VICTORS', 'EPAM PHOENIXES', 'G2', '11:30 AM', '14:00 PM'],
  ['22-Nov-25', 'DAY 3', 'MATCH 9', 'EPAM SHINERS', 'EPAM RADIANTS', 'G1', '14:00 PM', '16:30 PM'],
  ['23-Nov-25', 'DAY 4', 'MATCH 10', 'EPAM SPARTANS', 'EPAM GLORIFIERS', 'G2', '9:00 AM', '11:30 AM'],
  ['23-Nov-25', 'DAY 4', 'MATCH 11', 'EPAM STALWARTS', 'EPAM DYNAMOS', 'G1', '11:30 AM', '14:00 PM'],
  ['23-Nov-25', 'DAY 4', 'MATCH 12', 'EPAM GUARDIANS', 'EPAM VICTORS', 'G2', '14:00 PM', '16:30 PM'],
  ['29-Nov-25', 'DAY 5', 'MATCH 13', 'EPAM STALWARTS', 'EPAM RADIANTS', 'G1', '9:00 AM', '11:30 AM'],
  ['29-Nov-25', 'DAY 5', 'MATCH 14', 'EPAM SPARTANS', 'EPAM GUARDIANS', 'G2', '11:30 AM', '14:00 PM'],
  ['29-Nov-25', 'DAY 5', 'MATCH 15', 'EPAM DYNAMOS', 'EPAM SHINERS', 'G1', '14:00 PM', '16:30 PM'],
  ['30-Nov-25', 'DAY 6', 'MATCH 16', 'EPAM RADIANTS', 'EPAM SPARKS', 'G1', '9:00 AM', '11:30 AM'],
  ['30-Nov-25', 'DAY 6', 'MATCH 17', 'EPAM SPARTANS', 'EPAM VICTORS', 'G2', '11:30 AM', '14:00 PM'],
  ['30-Nov-25', 'DAY 6', 'MATCH 18', 'EPAM GLORIFIERS', 'EPAM GUARDIANS', 'G2', '14:00 PM', '16:30 PM'],
  ['06-Dec-25', 'DAY 7', 'MATCH 19', 'EPAM PHOENIXES', 'EPAM GLORIFIERS', 'G2', '9:00 AM', '11:30 AM'],
  ['06-Dec-25', 'DAY 7', 'MATCH 20', 'EPAM SPARKS', 'EPAM STALWARTS', 'G1', '11:30 AM', '14:00 PM'],
];

const slots = ['Morning', 'Afternoon', 'Evening'];
const slotTimes = {
  Morning: ['9:00 AM', '11:30 AM'],
  Afternoon: ['11:30 AM', '14:00 PM'],
  Evening: ['14:00 PM', '16:30 PM'],
};
const teamNames = [...new Set(fixtures.flatMap(row => row.slice(3, 5)))].sort();
const dateValue = value => {
  const [day, month, year] = value.split('-');
  return new Date(Number(`20${year}`), ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(month), Number(day));
};
const dateText = value => value;
const slotFromTime = value => value === '9:00 AM' ? 'Morning' : value === '11:30 AM' ? 'Afternoon' : 'Evening';
const original = fixtures.map(row => ({ date: row[0], day: row[1], match: row[2], teamA: row[3], teamB: row[4], group: row[5], start: row[6], end: row[7], slot: slotFromTime(row[6]) }));
const scheduleByTeam = schedule => {
  const result = Object.fromEntries(teamNames.map(team => [team, []]));
  schedule.forEach(row => [row.teamA, row.teamB].forEach(team => result[team].push(row)));
  Object.values(result).forEach(list => list.sort((a, b) => dateValue(a.date) - dateValue(b.date) || a.match.localeCompare(b.match, undefined, { numeric: true })));
  return result;
};
const statsFor = (schedule, team) => {
  const entries = scheduleByTeam(schedule)[team];
  const gaps = entries.slice(1).map((entry, index) => Math.round((dateValue(entry.date) - dateValue(entries[index].date)) / 86400000));
  const counts = Object.fromEntries(slots.map(slot => [slot, entries.filter(entry => entry.slot === slot).length]));
  return { team, entries, counts, gaps, totalGap: gaps.reduce((sum, gap) => sum + gap, 0), averageGap: gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length, minimumGap: Math.min(...gaps), maximumGap: Math.max(...gaps), consecutiveWeekendCount: gaps.filter(gap => gap <= 1).length };
};
const originalStats = teamNames.map(team => statsFor(original, team));

// Search all permutations of the three daily slots and minimize uneven slot counts,
// repeated slots on adjacent match dates, and extreme daily start times.
const permutations = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
const byDay = [...new Set(original.map(row => row.date))].map(date => original.filter(row => row.date === date));
let best = null;
function scoreSchedule(candidate) {
  const stats = teamNames.map(team => statsFor(candidate, team));
  const countPenalty = stats.reduce((sum, stat) => sum + (Math.max(...Object.values(stat.counts)) - Math.min(...Object.values(stat.counts))) * 100, 0);
  const morningCounts = stats.map(stat => stat.counts.Morning);
  const morningCoveragePenalty = morningCounts.filter(count => count === 0).length * 1000;
  const morningDoublePenalty = Math.max(0, 4 - morningCounts.filter(count => count >= 2).length) * 250;
  const excessiveMorningPenalty = morningCounts.filter(count => count > 2).length * 100;
  const repeatPenalty = stats.reduce((sum, stat) => sum + stat.entries.slice(1).reduce((inner, entry, index) => inner + (entry.slot === stat.entries[index].slot ? 12 : 0), 0), 0);
  const extremePenalty = stats.reduce((sum, stat) => sum + (stat.counts.Morning === 0 || stat.counts.Evening === 0 ? 20 : 0), 0);
  return countPenalty + morningCoveragePenalty + morningDoublePenalty + excessiveMorningPenalty + repeatPenalty + extremePenalty;
}
function search(dayIndex, candidate) {
  if (dayIndex === byDay.length) {
    const score = scoreSchedule(candidate);
    if (!best || score < best.score) best = { score, schedule: candidate.map(row => ({ ...row })) };
    return;
  }
  byDay[dayIndex].forEach((row, rowIndex) => { // rowIndex keeps the original match order stable within each permutation.
    void rowIndex;
  });
  permutations.forEach(permutation => {
    const assigned = byDay[dayIndex].map((row, index) => ({ ...row, slot: slots[permutation[index]], start: slotTimes[slots[permutation[index]]][0], end: slotTimes[slots[permutation[index]]][1] }));
    search(dayIndex + 1, candidate.concat(assigned));
  });
}
search(0, []);
const revised = best.schedule;
const revisedStats = teamNames.map(team => statsFor(revised, team));
if (revisedStats.some(stat => stat.counts.Morning === 0) || revisedStats.filter(stat => stat.counts.Morning >= 2).length < 4) {
  throw new Error('Morning allocation did not reach the maximum feasible distribution.');
}

const esc = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const table = (title, headers, data) => `<h2>${esc(title)}</h2><table><thead><tr>${headers.map(header => `<th>${esc(header)}</th>`).join('')}</tr></thead><tbody>${data.map(row => `<tr>${row.map(cell => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
const scheduleRows = schedule => schedule.map(row => [dateText(row.date), row.day, row.match, row.teamA, row.teamB, row.group, row.slot, row.start, row.end]);
const statsRows = stats => stats.map(stat => [stat.team, stat.counts.Morning, stat.counts.Afternoon, stat.counts.Evening, stat.gaps.join(', '), stat.averageGap.toFixed(2), stat.minimumGap, stat.maximumGap, stat.consecutiveWeekendCount]);
const detailRows = stats => stats.flatMap(stat => stat.entries.map((entry, index) => [stat.team, index + 1, entry.match, entry.date, entry.day, entry.slot, index === 0 ? '-' : Math.round((dateValue(entry.date) - dateValue(stat.entries[index - 1].date)) / 86400000)]));
const summaryRows = [
  ['Total teams', teamNames.length], ['Total matches', original.length], ['Match dates', byDay.length], ['Morning allocation target', 'Maximum feasible: 4 teams x 2, 6 teams x 1'], ['Gap definition', 'Calendar days between match dates'], ['Consecutive weekend definition', 'Gap of 0 or 1 calendar day'], ['Original worst short gap', `${Math.min(...originalStats.map(stat => stat.minimumGap))} day(s)`], ['Revised worst short gap', `${Math.min(...revisedStats.map(stat => stat.minimumGap))} day(s)`],
];
const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Calibri,Arial,sans-serif;color:#17202a}h1{color:#17365d}h2{background:#d9eaf7;padding:7px}table{border-collapse:collapse;margin:0 0 24px;min-width:900px}th,td{border:1px solid #9eabb5;padding:6px 9px;text-align:left}th{background:#17365d;color:white}tr:nth-child(even){background:#f3f6f8}.note{background:#fff2cc;border:1px solid #d6b656;padding:9px;max-width:1000px}</style></head><body><h1>EPAM Final Fair Fixture Schedule</h1><p class="note">This final schedule keeps the original 7 dates, exactly 3 matches per date, all fixtures, groups, match numbers, and fixed time ranges. Only the fixture-to-slot assignment is rotated. With 7 morning slots there are only 14 morning team appearances, so the mathematically fairest possible allocation is four teams with two morning matches and six teams with one. Date gaps remain constrained by the supplied dates.</p>${table('Executive Summary',['Measure','Result'],summaryRows)}${table('Original Schedule',['Date','Day','Match','Team A','Team B','Group','Slot','Start','End'],scheduleRows(original))}${table('Original Team Analysis',['Team','Morning','Afternoon','Evening','Gaps between matches (days)','Average gap','Minimum gap','Maximum gap','Consecutive weekend gaps'],statsRows(originalStats.sort((a,b)=>a.averageGap-b.averageGap || a.team.localeCompare(b.team))))}${table('Match-by-Match Gap Detail',['Team','Sequence','Match','Date','Day','Slot','Gap from previous match (days)'],detailRows(originalStats))}${table('Final Fair Schedule',['Date','Day','Match','Team A','Team B','Group','Slot','Start','End'],scheduleRows(revised))}${table('Final Team Analysis',['Team','Morning','Afternoon','Evening','Gaps between matches (days)','Average gap','Minimum gap','Maximum gap','Consecutive weekend gaps'],statsRows(revisedStats.sort((a,b)=>a.averageGap-b.averageGap || a.team.localeCompare(b.team))))}</body></html>`;
fs.mkdirSync('analysis', { recursive: true });
fs.writeFileSync('analysis/EPAM_Final_Fair_Schedule.xls', html, 'utf8');
fs.writeFileSync('analysis/EPAM_Final_Fair_Schedule.json', JSON.stringify({ originalStats, revisedStats, revised }, null, 2));
console.log(JSON.stringify({ score: best.score, originalStats, revisedStats, revised: revised.map(row => [row.date, row.match, row.slot]) }, null, 2));
