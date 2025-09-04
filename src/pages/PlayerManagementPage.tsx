import React, { useEffect, useState } from 'react';
import { Player } from '../types';

const PlayerManagementPage: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  interface Skill { id: number; skillName: string; }
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillFilter, setSkillFilter] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<'All' | 'SOLD' | 'UNSOLD'>('All');

  useEffect(() => {
    fetch('http://localhost:8282/api/players')
      .then(res => res.json())
      .then(setPlayers);
    fetch('http://localhost:8282/api/skills')
      .then(res => res.json())
      .then((data: Skill[]) => setSkills(data));
  }, []);

  const handleStatusToggle = (id: number) => {
    setPlayers(players =>
      players.map(p =>
        p.id === id
          ? { ...p, status: p.status === 'SOLD' ? 'UNSOLD' : 'SOLD' }
          : p
      )
    );
  };

  const filteredPlayers = players.filter(p => {
    const statusMatch = statusFilter === 'All' || p.status === statusFilter;
    // Ensure both are numbers for comparison
    const playerSkillId = typeof p.skillId === 'string' ? parseInt(p.skillId) : p.skillId;
    const skillMatch = skillFilter === 0 || playerSkillId === skillFilter;
    return statusMatch && skillMatch;
  });

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontSize: 32, fontWeight: 700 }}>Player Management</h1>
      <div style={{ display: 'flex', gap: 16, margin: '16px 0' }}>
        <select value={skillFilter} onChange={e => setSkillFilter(Number(e.target.value))} style={{ padding: 8, borderRadius: 8 }}>
          <option value={0}>All Skills</option>
          {skills.map(skill => <option key={skill.id} value={skill.id}>{skill.skillName}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} style={{ padding: 8, borderRadius: 8 }}>
          <option value="All">All</option>
          <option value="SOLD">Sold</option>
          <option value="UNSOLD">Unsold</option>
        </select>
      </div>
      <table style={{ width: '100%', marginTop: 24, borderCollapse: 'collapse', background: '#fff', borderRadius: 12, overflow: 'hidden' }}>
        <thead style={{ background: '#0f2027', color: '#fff' }}>
          <tr>
            <th>Photo</th><th>Name</th><th>Skill</th><th>Status</th><th>Base Price</th><th>Sold Price</th><th>Stats</th><th>Toggle</th>
          </tr>
        </thead>
        <tbody>
          {filteredPlayers.map(p => (
            <tr key={p.id} style={{ textAlign: 'center', borderBottom: '1px solid #eee' }}>
              <td><img src={p.photo} alt={p.name} style={{ width: 48, height: 48, borderRadius: '50%' }} /></td>
              <td>{p.name}</td>
              <td>{skills.find(s => s.id === Number(p.skillId))?.skillName || ''}</td>
              <td style={{ color: p.status === 'SOLD' ? '#009688' : '#ff5722', fontWeight: 700 }}>{p.status}</td>
              <td>₹{p.basePrice.toLocaleString()}</td>
              <td>{p.soldPrice ? `₹${p.soldPrice.toLocaleString()}` : '-'}</td>
              <td>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 12 }}>
                  {Object.entries(p.stats || {}).map(([k, v]) => (
                    <li key={k}>{k}: {v}</li>
                  ))}
                </ul>
              </td>
              <td>
                <button onClick={() => handleStatusToggle(p.id)} style={{ padding: '4px 12px', borderRadius: 6, background: '#1976d2', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  {p.status === 'SOLD' ? 'Mark Unsold' : 'Mark Sold'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
export default PlayerManagementPage;
