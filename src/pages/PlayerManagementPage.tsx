import React, { useEffect, useState } from 'react';
import { Player } from '../types';

const BG = 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(235,242,252,0.92) 100%), url(/iStock-2163573192_web.jpg) center/cover no-repeat fixed';

const PlayerManagementPage: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  interface Skill { id: number; skillName: string; }
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillFilter, setSkillFilter] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<'All' | 'SOLD' | 'UNSOLD' | 'NOT_ASSIGNED' | 'ASSIGNED'>('All');

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
        p.id === id ? { ...p, status: p.status === 'SOLD' ? 'UNSOLD' : 'SOLD' } : p
      )
    );
  };

  const filteredPlayers = players.filter(p => {
    const statusMatch = statusFilter === 'All' || p.status === statusFilter;
    const playerSkillId = typeof p.skillId === 'string' ? parseInt(p.skillId) : p.skillId;
    const skillMatch = skillFilter === 0 || playerSkillId === skillFilter;
    return statusMatch && skillMatch;
  });

  const selectStyle: React.CSSProperties = {
    padding: '9px 14px',
    borderRadius: 8,
    background: '#FFFFFF',
    color: '#1A3362',
    border: '1px solid rgba(0,0,0,0.14)',
    fontSize: 13,
    fontFamily: "'Inter', system-ui, sans-serif",
    outline: 'none',
  };

  const statusBadge = (status: string) => {
    if (status === 'SOLD') return 'badge badge-sold';
    if (status === 'UNSOLD') return 'badge badge-unsold';
    if (status === 'ASSIGNED') return 'badge badge-assigned';
    return 'badge badge-pending';
  };

  return (
    <div style={{ minHeight: '100vh', background: BG, padding: '2rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: '2.5rem',
          fontWeight: 900,
          color: '#005A8E',
          letterSpacing: 3,
          textTransform: 'uppercase',
          marginBottom: 4,
        }}>Player Management</div>
        <div style={{ fontSize: 12, color: '#6B7FA0', letterSpacing: 1 }}>
          {filteredPlayers.length} player{filteredPlayers.length !== 1 ? 's' : ''} shown
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <select value={skillFilter} onChange={e => setSkillFilter(Number(e.target.value))} style={selectStyle}>
          <option value={0}>All Skills</option>
          {skills.map(skill => <option key={skill.id} value={skill.id}>{skill.skillName}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} style={selectStyle}>
          <option value="All">All Statuses</option>
          <option value="SOLD">Sold</option>
          <option value="UNSOLD">Unsold</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="NOT_ASSIGNED">Not Assigned</option>
        </select>
      </div>

      {/* Table */}
      <div style={{
        background: 'rgba(255,255,255,0.90)',
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 14,
        overflow: 'hidden',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{
              background: 'rgba(0,120,194,0.07)',
              borderBottom: '1px solid rgba(0,90,142,0.18)',
            }}>
              {['Photo', 'Name', 'Skill', 'Status', 'Base Price', 'Sold Price', 'Stats', ''].map(h => (
                <th key={h} style={{
                  padding: '12px 14px',
                  textAlign: 'left',
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#6B7FA0',
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredPlayers.map((p, i) => (
              <tr key={p.id} style={{
                borderBottom: '1px solid rgba(0,0,0,0.05)',
                background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)',
              }}>
                <td style={{ padding: '10px 14px' }}>
                  <img src={p.photo} alt={p.name} style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(0,0,0,0.10)', objectFit: 'cover' }} />
                </td>
                <td style={{ padding: '10px 14px', fontWeight: 600, color: '#1A3362', fontSize: 13 }}>{p.name}</td>
                <td style={{ padding: '10px 14px', color: '#4A6080', fontSize: 13 }}>
                  {skills.find(s => s.id === Number(p.skillId))?.skillName || '—'}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <span className={statusBadge(p.status)}>{p.status.replace('_', ' ')}</span>
                </td>
                <td style={{ padding: '10px 14px', fontFamily: "'Space Mono', monospace", fontSize: 12, color: '#1A3362' }}>
                  ₹{p.basePrice.toLocaleString()}
                </td>
                <td style={{ padding: '10px 14px', fontFamily: "'Space Mono', monospace", fontSize: 12, color: p.soldPrice ? '#006BA0' : '#8A9AB8' }}>
                  {p.soldPrice ? `₹${p.soldPrice.toLocaleString()}` : '—'}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {Object.entries(p.stats || {}).map(([k, v]) => (
                      <li key={k} style={{ fontSize: 11, color: '#6B7FA0', lineHeight: 1.6 }}>
                        <span style={{ color: '#4A6080', fontWeight: 600 }}>{k}:</span>{' '}
                        <span style={{ color: '#1A3362', fontFamily: "'Space Mono', monospace" }}>{v}</span>
                      </li>
                    ))}
                  </ul>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <button
                    onClick={() => handleStatusToggle(p.id)}
                    style={{
                      padding: '5px 14px',
                      borderRadius: 6,
                      background: 'transparent',
                      color: '#2B72D4',
                      border: '1px solid rgba(43,114,212,0.35)',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      transition: 'background 0.15s',
                    }}
                  >
                    {p.status === 'SOLD' ? 'Mark Unsold' : 'Mark Sold'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredPlayers.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#6B7FA0', fontSize: 14 }}>
            No players match the selected filters.
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerManagementPage;
