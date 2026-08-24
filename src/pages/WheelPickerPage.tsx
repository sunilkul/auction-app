import React, { useEffect, useState } from 'react';
import { Team, Player } from '../types';
interface Skill { id: number; skillName: string; }

const TeamGeneratorPage: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [assignments, setAssignments] = useState<{ [teamId: number]: Player[] }>({});
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch skills and teams on mount
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('http://localhost:8282/api/skills').then(res => res.json()),
      fetch('http://localhost:8282/api/teams/non-auction').then(res => res.json())
    ]).then(([skillsData, teamsData]) => {
      setSkills(Array.isArray(skillsData) ? skillsData : []);
      setTeams(Array.isArray(teamsData) ? teamsData : []);
    }).finally(() => setLoading(false));
  }, []);

  // Fetch players for selected skill
  useEffect(() => {
    if (!selectedSkill) {
      setPlayers([]);
      setAssignments({});
      return;
    }
    setLoading(true);
    fetch(`http://localhost:8282/api/players/non-auctioned?skillId=${selectedSkill}`)
      .then(res => res.json())
      .then((data) => {
        setPlayers(Array.isArray(data) ? data.filter((p: Player) => !p.teamId) : []);
        setAssignments({}); // Only clear assignments when skill changes
      })
      .finally(() => setLoading(false));
  }, [selectedSkill]);

  function shuffle<T>(array: T[]): T[] {
    // Fisher-Yates shuffle
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  const generateTeams = () => {
    if (teams.length === 0 || players.length === 0) return;
    const shuffledPlayers = shuffle(players);
    const teamCount = teams.length;
    const newAssignments: { [teamId: number]: Player[] } = {};
    teams.forEach(team => { newAssignments[team.id] = []; });
    shuffledPlayers.forEach((player, idx) => {
      const team = teams[idx % teamCount];
      newAssignments[team.id].push(player);
    });
    setAssignments(newAssignments);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f2027 0%, #2c5364 100%)', padding: 32 }}>
      <h1 style={{ textAlign: 'center', color: '#fff', fontSize: 36, fontWeight: 900, marginBottom: 32 }}>Random Team Generator</h1>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32, gap: 24 }}>
        <div>
          <label style={{ color: '#fff', fontWeight: 600, marginRight: 8 }}>Skill:</label>
          <select value={selectedSkill ?? ''} onChange={e => setSelectedSkill(Number(e.target.value) || null)} style={{ fontSize: 16, padding: '4px 12px', borderRadius: 6, border: '1px solid #1976d2', minWidth: 160 }}>
            <option value="">Select Skill</option>
            {skills.map((skill, idx) => (
              <option key={skill.id ?? `skill-${idx}`} value={skill.id?.toString() ?? ''}>{skill.skillName}</option>
            ))}
          </select>
        </div>
        <button onClick={generateTeams} disabled={loading || teams.length === 0 || players.length === 0} style={{ fontSize: 20, padding: '12px 32px', borderRadius: 12, background: loading ? '#888' : '#1976d2', color: '#fff', fontWeight: 700, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>Generate Teams</button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 32 }}>
        {teams.map(team => (
          <div key={team.id} style={{ background: '#fff2', borderRadius: 16, minWidth: 260, padding: 24, boxShadow: '0 4px 24px #0004' }}>
            <h2 style={{ color: '#ffd700', fontWeight: 800, fontSize: 24, marginBottom: 16, textAlign: 'center', letterSpacing: 1 }}>{team.name}</h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {(assignments[team.id] || []).map(player => (
                <li key={player.id} style={{ color: '#fff', fontSize: 18, fontWeight: 600, margin: '8px 0', background: '#1976d2', borderRadius: 8, padding: '6px 12px', textAlign: 'center', letterSpacing: 0.5 }}>{player.name}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div style={{ color: '#fff', textAlign: 'center', marginTop: 32, fontSize: 18 }}>
        {teams.length === 0 && <div>No teams found!</div>}
        {selectedSkill && players.length === 0 && <div>No players found for selected skill!</div>}
      </div>
    </div>
  );
};

export default TeamGeneratorPage;
