import React, { useEffect, useState } from 'react';
import { Team, Player } from '../types';

const BG = 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(235,242,252,0.92) 100%), url(/iStock-2163573192_web.jpg) center/cover no-repeat fixed';

interface Skill { id: number; skillName: string; }

const WheelPickerPage: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [assignments, setAssignments] = useState<{ [teamId: number]: Player[] }>({});
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('http://localhost:8282/api/skills').then(res => res.json()),
      fetch('http://localhost:8282/api/teams/non-auction').then(res => res.json()),
    ]).then(([skillsData, teamsData]) => {
      setSkills(Array.isArray(skillsData) ? skillsData : []);
      setTeams(Array.isArray(teamsData) ? teamsData : []);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedSkill) { setPlayers([]); setAssignments({}); return; }
    setLoading(true);
    fetch(`http://localhost:8282/api/players/non-auctioned?skillId=${selectedSkill}`)
      .then(res => res.json())
      .then((data) => {
        setPlayers(Array.isArray(data) ? data.filter((p: Player) => !p.teamId) : []);
        setAssignments({});
      })
      .finally(() => setLoading(false));
  }, [selectedSkill]);

  function shuffle<T>(array: T[]): T[] {
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
    const newAssignments: { [teamId: number]: Player[] } = {};
    teams.forEach(team => { newAssignments[team.id] = []; });
    shuffledPlayers.forEach((player, idx) => {
      const team = teams[idx % teams.length];
      newAssignments[team.id].push(player);
    });
    setAssignments(newAssignments);
  };

  const canGenerate = !loading && teams.length > 0 && players.length > 0;

  return (
    <div style={{ minHeight: '100vh', background: BG, padding: '2.5rem 2rem' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 'clamp(2.2rem, 4vw, 3.5rem)',
          fontWeight: 900,
          color: '#C47B0A',
          letterSpacing: 4,
          textTransform: 'uppercase',
          lineHeight: 1,
        }}>Team Generator</div>
        <div style={{ fontSize: 11, color: '#6B7FA0', letterSpacing: 5, textTransform: 'uppercase', marginTop: 8 }}>
          Randomly assign players to teams
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginBottom: '2.5rem', flexWrap: 'wrap' }}>
        <select
          value={selectedSkill ?? ''}
          onChange={e => setSelectedSkill(Number(e.target.value) || null)}
          style={{
            fontSize: 14,
            padding: '10px 18px',
            borderRadius: 8,
            border: '1px solid rgba(0,0,0,0.14)',
            background: '#FFFFFF',
            color: '#1A3362',
            outline: 'none',
            fontFamily: "'Inter', system-ui, sans-serif",
            minWidth: 180,
          }}
        >
          <option value="">Select Skill</option>
          {skills.map((skill, idx) => (
            <option key={skill.id ?? `skill-${idx}`} value={skill.id?.toString() ?? ''}>{skill.skillName}</option>
          ))}
        </select>

        <button
          onClick={generateTeams}
          disabled={!canGenerate}
          style={{
            fontSize: 16,
            padding: '11px 36px',
            borderRadius: 10,
            background: canGenerate ? '#F5A623' : 'rgba(196,123,10,0.15)',
            color: canGenerate ? '#04080F' : '#8A9AB8',
            fontWeight: 900,
            border: 'none',
            cursor: canGenerate ? 'pointer' : 'not-allowed',
            fontFamily: "'Barlow Condensed', sans-serif",
            letterSpacing: 3,
            textTransform: 'uppercase',
            boxShadow: canGenerate ? '0 4px 20px rgba(196,123,10,0.25)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          {loading ? 'Loading…' : 'Generate'}
        </button>
      </div>

      {/* Team assignment cards */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 24, maxWidth: 1400, margin: '0 auto' }}>
        {teams.map(team => (
          <div key={team.id} style={{
            background: 'rgba(255,255,255,0.90)',
            border: '1px solid rgba(0,0,0,0.08)',
            borderTop: '2px solid #F5A623',
            borderRadius: 16,
            minWidth: 240,
            maxWidth: 300,
            padding: '1.25rem 1rem',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            flex: '1 1 240px',
          }}>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 800,
              fontSize: '1.3rem',
              color: '#B87B10',
              textAlign: 'center',
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              marginBottom: 14,
              paddingBottom: 10,
              borderBottom: '1px solid rgba(0,0,0,0.07)',
            }}>{team.name}</div>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(assignments[team.id] || []).map(player => (
                <li key={player.id} style={{
                  color: '#1A3362',
                  fontSize: 13,
                  fontWeight: 600,
                  background: 'rgba(0,0,0,0.04)',
                  border: '1px solid rgba(0,0,0,0.07)',
                  borderRadius: 7,
                  padding: '6px 12px',
                  textAlign: 'center',
                  letterSpacing: 0.3,
                }}>{player.name}</li>
              ))}
              {(assignments[team.id] || []).length === 0 && (
                <li style={{ color: '#8A9AB8', fontSize: 12, textAlign: 'center', padding: '12px 0', fontStyle: 'italic' }}>
                  {Object.keys(assignments).length > 0 ? 'No players assigned' : 'Hit Generate to assign'}
                </li>
              )}
            </ul>
          </div>
        ))}
      </div>

      {teams.length === 0 && !loading && (
        <div style={{ color: '#6B7FA0', textAlign: 'center', marginTop: 48, fontSize: 14 }}>No teams found.</div>
      )}
      {selectedSkill && players.length === 0 && !loading && (
        <div style={{ color: '#6B7FA0', textAlign: 'center', marginTop: 24, fontSize: 14 }}>No unassigned players for the selected skill.</div>
      )}
    </div>
  );
};

export default WheelPickerPage;
