import React, { useEffect, useState } from 'react';
import { Player } from '../types';

const BG = 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(235,242,252,0.92) 100%), url(/iStock-2163573192_web.jpg) center/cover no-repeat fixed';

const SKILL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  BATSMAN:          { bg: 'rgba(0,168,90,0.10)',   text: '#007A45', border: 'rgba(0,168,90,0.30)' },
  BOWLER:           { bg: 'rgba(229,40,63,0.09)',   text: '#B51830', border: 'rgba(229,40,63,0.25)' },
  'ALL ROUNDER':    { bg: 'rgba(215,140,0,0.10)',   text: '#8A5A00', border: 'rgba(215,140,0,0.28)' },
  ALL_ROUNDER:      { bg: 'rgba(215,140,0,0.10)',   text: '#8A5A00', border: 'rgba(215,140,0,0.28)' },
  'WICKET KEEPER':  { bg: 'rgba(120,50,200,0.09)',  text: '#6B30AC', border: 'rgba(120,50,200,0.25)' },
  WK_BATSMAN:       { bg: 'rgba(120,50,200,0.09)',  text: '#6B30AC', border: 'rgba(120,50,200,0.25)' },
};

const STATUS_CONFIG: Record<string, { accent: string; bg: string; border: string; label: string }> = {
  SOLD:         { accent: '#00A85A', bg: 'rgba(0,168,90,0.10)',   border: 'rgba(0,168,90,0.30)',   label: 'Sold' },
  UNSOLD:       { accent: '#E5283F', bg: 'rgba(229,40,63,0.09)',  border: 'rgba(229,40,63,0.25)',  label: 'Unsold' },
  NOT_ASSIGNED: { accent: '#0078C2', bg: 'rgba(0,120,194,0.10)',  border: 'rgba(0,120,194,0.28)', label: 'Not Assigned' },
  ASSIGNED:     { accent: '#2B72D4', bg: 'rgba(43,114,212,0.09)', border: 'rgba(43,114,212,0.25)', label: 'Assigned' },
};

interface Skill { id: number; skillName: string; }

const PlayerManagementPage: React.FC = () => {
  const [players, setPlayers]           = useState<Player[]>([]);
  const [skills, setSkills]             = useState<Skill[]>([]);
  const [skillFilter, setSkillFilter]   = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<'All' | 'SOLD' | 'UNSOLD' | 'NOT_ASSIGNED' | 'ASSIGNED'>('All');
  const [nameSearch, setNameSearch]     = useState('');

  useEffect(() => {
    fetch('http://localhost:8282/api/players/all-players').then(r => r.json()).then(setPlayers);
    fetch('http://localhost:8282/api/skills').then(r => r.json()).then(setSkills);
  }, []);

  const handleStatusToggle = (id: number) => {
    setPlayers(prev =>
      prev.map(p => p.id === id ? { ...p, status: p.status === 'SOLD' ? 'UNSOLD' : 'SOLD' } : p)
    );
  };

  const filteredPlayers = players.filter(p => {
    const statusMatch = statusFilter === 'All' || p.status === statusFilter;
    const playerSkillId = typeof p.skillId === 'string' ? parseInt(p.skillId) : p.skillId;
    const skillMatch = skillFilter === 0 || playerSkillId === skillFilter;
    const nameMatch = nameSearch.trim() === '' || p.name.toLowerCase().includes(nameSearch.toLowerCase());
    return statusMatch && skillMatch && nameMatch;
  });

  const soldCount        = players.filter(p => p.status === 'SOLD').length;
  const unsoldCount      = players.filter(p => p.status === 'UNSOLD').length;
  const notAssignedCount = players.filter(p => p.status === 'NOT_ASSIGNED').length;

  const getSkillStyle = (skillName: string) => {
    const key = (skillName ?? '').toUpperCase().replace(/-/g, '_');
    return SKILL_COLORS[key] ?? SKILL_COLORS[skillName?.toUpperCase()]
      ?? { bg: 'rgba(0,120,194,0.10)', text: '#006BA0', border: 'rgba(0,120,194,0.28)' };
  };

  const pillBtn = (active: boolean, accentColor: string): React.CSSProperties => ({
    padding: '5px 14px',
    borderRadius: 999,
    border: `1px solid ${active ? accentColor : 'rgba(0,0,0,0.13)'}`,
    background: active ? accentColor : 'rgba(255,255,255,0.85)',
    color: active ? '#fff' : '#4A6080',
    fontSize: 11, fontWeight: 700, letterSpacing: 0.8, cursor: 'pointer',
    textTransform: 'uppercase' as const,
    transition: 'all 0.15s',
    boxShadow: active ? `0 0 14px ${accentColor}40` : 'none',
    fontFamily: "'Inter', sans-serif",
  });

  return (
    <div style={{ minHeight: '100vh', background: BG, padding: '2rem 2.5rem 3rem' }}>

      {/* ── Header ───────────────────────────────────── */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 'clamp(2.4rem, 5vw, 3.8rem)',
          fontWeight: 900,
          color: '#005A8E',
          letterSpacing: 5,
          textTransform: 'uppercase',
          lineHeight: 1,
          textShadow: '0 0 20px rgba(0,90,142,0.15), 0 2px 4px rgba(0,0,0,0.10)',
          marginBottom: 16,
        }}>Player Management</div>

        {/* Summary pills */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { label: 'Total',        count: players.length, accent: '#6B7FA0', bg: 'rgba(107,127,160,0.10)', border: 'rgba(107,127,160,0.25)' },
            { label: 'Sold',         count: soldCount,       accent: '#007A45', bg: 'rgba(0,168,90,0.09)',    border: 'rgba(0,168,90,0.28)' },
            { label: 'Not Assigned', count: notAssignedCount,accent: '#006BA0', bg: 'rgba(0,120,194,0.09)',   border: 'rgba(0,120,194,0.25)' },
            { label: 'Unsold',       count: unsoldCount,     accent: '#B51830', bg: 'rgba(229,40,63,0.08)',   border: 'rgba(229,40,63,0.22)' },
          ].map(item => (
            <div key={item.label} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '5px 15px', borderRadius: 999,
              background: item.bg, border: `1px solid ${item.border}`,
              backdropFilter: 'blur(6px)',
            }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: item.accent, fontFamily: "'Space Mono', monospace", lineHeight: 1 }}>
                {item.count}
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#6B7FA0', letterSpacing: 1.2, textTransform: 'uppercase' }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Filters + Search ─────────────────────────── */}
      <div style={{
        background: 'rgba(255,255,255,0.82)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(43,114,212,0.12)',
        borderRadius: 14,
        padding: '16px 20px',
        marginBottom: '1.5rem',
        display: 'flex', flexDirection: 'column', gap: 14,
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
      }}>

        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 9, color: '#8A9AB8', letterSpacing: 2.5, textTransform: 'uppercase', fontWeight: 700, minWidth: 36 }}>Search</span>
          <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
            <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#005A8E" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search by player name…"
              value={nameSearch}
              onChange={e => setNameSearch(e.target.value)}
              style={{
                width: '100%', padding: '7px 12px 7px 32px',
                borderRadius: 999,
                border: '1.5px solid rgba(0,90,142,0.20)',
                background: 'rgba(255,255,255,0.9)',
                fontSize: 12, color: '#0D1E3E', fontFamily: "'Inter', sans-serif",
                outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.15s, box-shadow 0.15s',
                boxShadow: nameSearch ? '0 0 0 3px rgba(0,120,194,0.12)' : 'none',
              }}
              onFocus={e => { e.target.style.borderColor = '#0078C2'; e.target.style.boxShadow = '0 0 0 3px rgba(0,120,194,0.12)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(0,90,142,0.20)'; e.target.style.boxShadow = nameSearch ? '0 0 0 3px rgba(0,120,194,0.12)' : 'none'; }}
            />
            {nameSearch && (
              <button
                onClick={() => setNameSearch('')}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  color: '#8A9AB8', fontSize: 14, lineHeight: 1,
                }}
              >✕</button>
            )}
          </div>
        </div>

        {/* Skill filter */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: '#8A9AB8', letterSpacing: 2.5, textTransform: 'uppercase', fontWeight: 700, minWidth: 36 }}>Skill</span>
          {[{ id: 0, skillName: 'All' }, ...skills].map(skill => (
            <button key={skill.id} onClick={() => setSkillFilter(skill.id)}
              style={pillBtn(skillFilter === skill.id, '#0078C2')}>
              {skill.skillName}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: '#8A9AB8', letterSpacing: 2.5, textTransform: 'uppercase', fontWeight: 700, minWidth: 36 }}>Status</span>
          {([
            { value: 'All',          label: 'All',          accent: '#6B7FA0' },
            { value: 'SOLD',         label: 'Sold',         accent: '#00A85A' },
            { value: 'UNSOLD',       label: 'Unsold',       accent: '#E5283F' },
            { value: 'ASSIGNED',     label: 'Assigned',     accent: '#2B72D4' },
            { value: 'NOT_ASSIGNED', label: 'Not Assigned', accent: '#0078C2' },
          ] as const).map(opt => (
            <button key={opt.value} onClick={() => setStatusFilter(opt.value)}
              style={pillBtn(statusFilter === opt.value, opt.accent)}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Player count ─────────────────────────────── */}
      <div style={{ fontSize: 11, color: '#8A9AB8', letterSpacing: 2, marginBottom: '1rem', textTransform: 'uppercase', fontWeight: 600 }}>
        {filteredPlayers.length} player{filteredPlayers.length !== 1 ? 's' : ''} shown
      </div>

      {/* ── Table ────────────────────────────────────── */}
      {filteredPlayers.length > 0 ? (
        <div style={{
          background: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(14px)',
          border: '1px solid rgba(43,114,212,0.12)',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 8px 40px rgba(0,0,0,0.10)',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{
                background: 'linear-gradient(90deg, #003D6B 0%, #005A8E 50%, #0078C2 100%)',
              }}>
                {['#', 'Player', 'Skill', 'Status', 'Base Price', 'Sold Price', 'Team', 'Action'].map(col => (
                  <th key={col} style={{
                    padding: col === '#' ? '14px 10px 14px 20px' : '14px 16px',
                    textAlign: col === '#' ? 'center' : 'left',
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.75)',
                    fontFamily: "'Inter', sans-serif",
                    borderBottom: '1px solid rgba(255,255,255,0.10)',
                    whiteSpace: 'nowrap',
                  }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.map((p, idx) => {
                const sc        = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.NOT_ASSIGNED;
                const skillName = skills.find(s => s.id === Number(p.skillId))?.skillName ?? p.skillName ?? '—';
                const skillSt   = getSkillStyle(skillName);
                return (
                  <PlayerRow
                    key={p.id}
                    index={idx + 1}
                    player={p}
                    statusCfg={sc}
                    skillName={skillName}
                    skillStyle={skillSt}
                    isEven={idx % 2 === 0}
                    onToggle={handleStatusToggle}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '64px 0', color: '#8A9AB8', fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase' }}>
          No players match the selected filters.
        </div>
      )}
    </div>
  );
};

/* ── Player Row ───────────────────────────────────── */
interface StatusCfg { accent: string; bg: string; border: string; label: string; }

interface RowProps {
  index: number;
  player: Player;
  statusCfg: StatusCfg;
  skillName: string;
  skillStyle: { bg: string; text: string; border: string };
  isEven: boolean;
  onToggle: (id: number) => void;
}

const PlayerRow: React.FC<RowProps> = ({ index, player: p, statusCfg: sc, skillName, skillStyle, isEven, onToggle }) => {
  const [hovered, setHovered] = useState(false);
  const [btnHov, setBtnHov]   = useState(false);
  const isSold = p.status === 'SOLD';
  const btnAccent = isSold ? '#E5283F' : sc.accent;

  const rowBg = hovered
    ? `linear-gradient(90deg, ${sc.accent}12 0%, rgba(235,244,255,0.95) 100%)`
    : isEven ? 'rgba(248,251,255,0.9)' : 'rgba(255,255,255,0.95)';

  const tdStyle = (extra?: React.CSSProperties): React.CSSProperties => ({
    padding: '12px 16px',
    verticalAlign: 'middle',
    borderBottom: '1px solid rgba(43,114,212,0.07)',
    transition: 'background 0.18s',
    ...extra,
  });

  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ background: rowBg, transition: 'background 0.18s' }}
    >
      {/* # */}
      <td style={tdStyle({ padding: '12px 10px 12px 20px', textAlign: 'center', width: 40 })}>
        <div style={{
          width: 26, height: 26, borderRadius: '50%',
          background: hovered ? sc.accent : 'rgba(0,90,142,0.08)',
          color: hovered ? '#fff' : '#6B7FA0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 800, fontFamily: "'Space Mono', monospace",
          transition: 'all 0.18s', margin: '0 auto',
        }}>{index}</div>
      </td>

      {/* Player */}
      <td style={tdStyle({ minWidth: 200 })}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img
              src={p.photo} alt={p.name}
              style={{
                width: 40, height: 40, borderRadius: '50%', objectFit: 'cover',
                border: `2px solid ${sc.accent}45`,
                boxShadow: `0 0 10px ${sc.accent}25, 0 2px 6px rgba(0,0,0,0.10)`,
                transition: 'box-shadow 0.18s',
              }}
            />
            {p.isNewPlayer === 1 && (
              <div style={{
                position: 'absolute', bottom: -2, right: -2,
                background: '#FFB800', color: '#000',
                fontSize: 6, fontWeight: 900, borderRadius: 999,
                padding: '1px 4px', letterSpacing: 0.6, textTransform: 'uppercase',
                border: '1.5px solid rgba(255,255,255,0.9)', lineHeight: 1.5,
              }}>NEW</div>
            )}
          </div>
          <div>
            <div style={{
              fontSize: 13, fontWeight: 700, color: '#0D1E3E',
              fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap',
            }}>{p.name}</div>
            {p.groupCode && (
              <div style={{ fontSize: 10, color: '#8A9AB8', fontWeight: 600, marginTop: 1 }}>{p.groupCode}</div>
            )}
          </div>
        </div>
      </td>

      {/* Skill */}
      <td style={tdStyle()}>
        <span style={{
          fontSize: 10, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase',
          padding: '3px 10px', borderRadius: 999,
          background: skillStyle.bg, color: skillStyle.text, border: `1px solid ${skillStyle.border}`,
          whiteSpace: 'nowrap',
        }}>{skillName}</span>
      </td>

      {/* Status */}
      <td style={tdStyle()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: sc.accent,
            boxShadow: `0 0 6px ${sc.accent}80`,
          }} />
          <span style={{
            fontSize: 10, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase',
            color: sc.accent, whiteSpace: 'nowrap',
          }}>{sc.label}</span>
        </div>
      </td>

      {/* Base Price */}
      <td style={tdStyle()}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#005A8E', fontFamily: "'Space Mono', monospace" }}>
          ₹{p.basePrice.toLocaleString()}
        </span>
      </td>

      {/* Sold Price */}
      <td style={tdStyle()}>
        {p.soldPrice ? (
          <span style={{
            fontSize: 13, fontWeight: 700, fontFamily: "'Space Mono', monospace",
            color: sc.accent,
            background: sc.bg, border: `1px solid ${sc.border}`,
            padding: '2px 8px', borderRadius: 6,
          }}>₹{p.soldPrice.toLocaleString()}</span>
        ) : (
          <span style={{ color: '#C0CCDB', fontFamily: "'Space Mono', monospace", fontSize: 13 }}>—</span>
        )}
      </td>

      {/* Team */}
      <td style={tdStyle({ minWidth: 130 })}>
        {p.teamName ? (
          <span style={{
            fontSize: 11, fontWeight: 700, color: sc.accent,
            letterSpacing: 0.5, textTransform: 'uppercase',
          }}>{p.teamName}</span>
        ) : (
          <span style={{ color: '#C0CCDB', fontSize: 11 }}>—</span>
        )}
      </td>

      {/* Action */}
      <td style={tdStyle({ padding: '12px 20px 12px 12px' })}>
        <button
          onClick={() => onToggle(p.id)}
          onMouseEnter={() => setBtnHov(true)}
          onMouseLeave={() => setBtnHov(false)}
          style={{
            padding: '6px 14px', borderRadius: 8,
            background: btnHov ? btnAccent : 'rgba(255,255,255,0.85)',
            color: btnHov ? '#fff' : btnAccent,
            border: `1px solid ${btnAccent}55`,
            cursor: 'pointer', fontSize: 10, fontWeight: 800,
            letterSpacing: 1.2, textTransform: 'uppercase',
            transition: 'all 0.15s', whiteSpace: 'nowrap',
            boxShadow: btnHov ? `0 0 14px ${btnAccent}35` : 'inset 0 1px 0 rgba(255,255,255,0.9)',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {isSold ? 'Mark Unsold' : 'Mark Sold'}
        </button>
      </td>
    </tr>
  );
};

export default PlayerManagementPage;
