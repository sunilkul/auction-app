const fs = require('fs');
const source = JSON.parse(fs.readFileSync('analysis/EPAM_Fixture_Fairness_Analysis.json', 'utf8'));
const teams = source.originalStats.map(stat => stat.team).sort();
const matches = [...new Map(source.originalStats.flatMap(stat => stat.entries).map(entry => [entry.match, entry])).values()].sort((a, b) => Number(a.match.replace(/\D/g, '')) - Number(b.match.replace(/\D/g, '')));
const dates = ['15-Nov-25', '22-Nov-25', '29-Nov-25', '06-Dec-25', '13-Dec-25', '20-Dec-25', '27-Dec-25', '03-Jan-26', '10-Jan-26', '17-Jan-26'];
const slots = [
  { name: 'Morning', start: '9:00 AM', end: '11:30 AM' },
  { name: 'Afternoon', start: '11:30 AM', end: '14:00 PM' },
];
const parseDate = value => { const [day, month, year] = value.split('-'); return new Date(Number(`20${year}`), ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(month), Number(day)); };
const gapDays = (left, right) => Math.round((parseDate(right) - parseDate(left)) / 86400000);
const edgeTeams = entry => [entry.teamA, entry.teamB];
const usedTeams = round => new Set(round.flatMap(edgeTeams));
const canAdd = (rounds, roundIndex, entry) => {
  if (usedTeams(rounds[roundIndex]).has(entry.teamA) || usedTeams(rounds[roundIndex]).has(entry.teamB)) return false;
  for (const neighbor of [roundIndex - 1, roundIndex + 1]) {
    if (neighbor >= 0 && neighbor < rounds.length && usedTeams(rounds[neighbor]).has(entry.teamA)) return false;
    if (neighbor >= 0 && neighbor < rounds.length && usedTeams(rounds[neighbor]).has(entry.teamB)) return false;
  }
  return true;
};
function findRounds() {
  for (let attempt = 0; attempt < 200000; attempt += 1) {
    const rounds = Array.from({ length: dates.length }, () => []);
    const shuffled = [...matches].sort(() => Math.random() - 0.5);
    let success = true;
    for (const entry of shuffled) {
      const choices = Array.from({ length: dates.length }, (_, index) => index).sort(() => Math.random() - 0.5).sort((a, b) => rounds[a].length - rounds[b].length);
      const roundIndex = choices.find(index => rounds[index].length < 2 && canAdd(rounds, index, entry));
      if (roundIndex === undefined) { success = false; break; }
      rounds[roundIndex].push(entry);
    }
    if (success && rounds.every(round => round.length === 2)) return rounds;
  }
  throw new Error('Unable to find a 10-date schedule with seven-day minimum gaps.');
}
function findOrientations(rounds) {
  for (let mask = 0; mask < 2 ** dates.length; mask += 1) {
    const schedule = rounds.flatMap((round, dateIndex) => round.map((entry, matchIndex) => {
      const slotIndex = matchIndex ^ ((mask >> dateIndex) & 1);
      const slot = slots[slotIndex];
      return { ...entry, date: dates[dateIndex], day: `DAY ${dateIndex + 1}`, slot: slot.name, start: slot.start, end: slot.end };
    }));
    const counts = Object.fromEntries(teams.map(team => [team, 0]));
    schedule.forEach(entry => { if (entry.slot === 'Morning') edgeTeams(entry).forEach(team => { counts[team] += 1; }); });
    if (teams.every(team => counts[team] >= 2)) return schedule;
  }
  return null;
}
let schedule;
for (let attempt = 0; !schedule && attempt < 100; attempt += 1) schedule = findOrientations(findRounds());
if (!schedule) throw new Error('Unable to rotate slots so every team receives at least two morning matches.');
schedule.sort((a, b) => parseDate(a.date) - parseDate(b.date) || a.slot.localeCompare(b.slot));
const byTeam = Object.fromEntries(teams.map(team => [team, []]));
schedule.forEach(entry => edgeTeams(entry).forEach(team => byTeam[team].push(entry)));
const stats = teams.map(team => {
  const entries = byTeam[team].sort((a, b) => parseDate(a.date) - parseDate(b.date));
  const gaps = entries.slice(1).map((entry, index) => gapDays(entries[index].date, entry.date));
  return { team, morning: entries.filter(entry => entry.slot === 'Morning').length, afternoon: entries.filter(entry => entry.slot === 'Afternoon').length, gaps, minimumGap: Math.min(...gaps), maximumGap: Math.max(...gaps), averageGap: gaps.reduce((sum, value) => sum + value, 0) / gaps.length };
});
if (stats.some(stat => stat.morning < 2 || stat.minimumGap < 7)) throw new Error('Validation failed for morning count or date gap.');
const escape = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const table = (title, headers, rows) => `<h2>${title}</h2><table><thead><tr>${headers.map(escape).map(value => `<th>${value}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(escape).map(value => `<td>${value}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
const scheduleRows = schedule.map(entry => [entry.date, entry.day, entry.match, entry.teamA, entry.teamB, entry.group, entry.slot, entry.start, entry.end]);
const statRows = stats.map(stat => [stat.team, stat.morning, stat.afternoon, stat.gaps.join(', '), stat.averageGap.toFixed(2), stat.minimumGap, stat.maximumGap]);
const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Calibri,Arial,sans-serif;color:#17202a}h1{color:#17365d}h2{background:#d9eaf7;padding:7px}table{border-collapse:collapse;margin:0 0 24px;min-width:900px}th,td{border:1px solid #9eabb5;padding:6px 9px;text-align:left}th{background:#17365d;color:white}tr:nth-child(even){background:#f3f6f8}.note{background:#fff2cc;border:1px solid #d6b656;padding:9px;max-width:1000px}</style></head><body><h1>EPAM Expanded Fair Fixture Schedule</h1><p class="note">This schedule uses 10 weekly dates and two matches per date. It preserves every original fixture and group, gives every team at least two morning matches, and guarantees a minimum seven-calendar-day gap between matches for every team. Match dates and daily slots are changed to satisfy the requested fairness constraints.</p>${table('Validation Summary',['Measure','Result'],[['Teams', teams.length],['Matches', schedule.length],['Dates', dates.length],['Matches per date','2'],['Morning matches per team','At least 2'],['Minimum gap per team','At least 7 calendar days'],['Maximum gap observed', Math.max(...stats.map(stat => stat.maximumGap)) + ' days']])}${table('Updated Fair Schedule',['Date','Day','Match','Team A','Team B','Group','Slot','Start','End'],scheduleRows)}${table('Team Morning and Gap Statistics',['Team','Morning matches','Afternoon matches','Gaps between matches (days)','Average gap','Minimum gap','Maximum gap'],statRows)}</body></html>`;
fs.mkdirSync('analysis', { recursive: true });
fs.writeFileSync('analysis/EPAM_Expanded_Fair_Schedule.xls', html, 'utf8');
fs.writeFileSync('analysis/EPAM_Expanded_Fair_Schedule.json', JSON.stringify({ schedule, stats }, null, 2));
console.log(JSON.stringify({ schedule: schedule.length, dates: dates.length, stats }, null, 2));
