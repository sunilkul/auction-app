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
  const [players, setPlayers] = useState<Player[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillFilter, setSkillFilter] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<'All' | 'SOLD' | 'UNSOLD' | 'NOT_ASSIGNED' | 'ASSIGNED'>('All');

  useEffect(() => {
    fetch('http://localhost:8282/api/players').then(r => r.json()).then(setPlayers);
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
    return statusMatch && skillMatch;
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
      <div style={{ marginBottom: '2rem' }}>
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

      {/* ── Filters ──────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: '1.75rem' }}>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: '#8A9AB8', letterSpacing: 2.5, textTransform: 'uppercase', fontWeight: 700, minWidth: 36 }}>Skill</span>
          {[{ id: 0, skillName: 'All' }, ...skills].map(skill => (
            <button key={skill.id} onClick={() => setSkillFilter(skill.id)}
              style={pillBtn(skillFilter === skill.id, '#0078C2')}>
              {skill.skillName}
            </button>
          ))}
        </div>

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
      <div style={{ fontSize: 11, color: '#8A9AB8', letterSpacing: 2, marginBottom: '1.25rem', textTransform: 'uppercase', fontWeight: 600 }}>
        {filteredPlayers.length} player{filteredPlayers.length !== 1 ? 's' : ''} shown
      </div>

      {/* ── Card Grid ────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(252px, 1fr))',
        gap: '1rem',
      }}>
        {filteredPlayers.map(p => {
          const sc        = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.NOT_ASSIGNED;
          const skillName = skills.find(s => s.id === Number(p.skillId))?.skillName ?? p.skillName ?? '—';
          const skillSt   = getSkillStyle(skillName);
          const statsRows = Object.entries(p.stats ?? {}).slice(0, 4);

          return (
            <PlayerCard
              key={p.id}
              player={p}
              statusCfg={sc}
              skillName={skillName}
              skillStyle={skillSt}
              statsRows={statsRows}
              onToggle={handleStatusToggle}
            />
          );
        })}
      </div>

      {filteredPlayers.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 0', color: '#8A9AB8', fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase' }}>
          No players match the selected filters.
        </div>
      )}
    </div>
  );
};

/* ── Player Card ──────────────────────────────────── */
interface StatusCfg { accent: string; bg: string; border: string; label: string; }

interface CardProps {
  player: Player;
  statusCfg: StatusCfg;
  skillName: string;
  skillStyle: { bg: string; text: string; border: string };
  statsRows: [string, number][];
  onToggle: (id: number) => void;
}

const PlayerCard: React.FC<CardProps> = ({ player: p, statusCfg: sc, skillName, skillStyle, statsRows, onToggle }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered
          ? `radial-gradient(ellipse at 50% 0%, rgba(255,255,255,1) 0%, rgba(228,238,252,0.97) 100%)`
          : 'linear-gradient(150deg, rgba(255,255,255,0.97) 0%, rgba(236,244,255,0.95) 100%)',
        border: `1px solid ${hovered ? sc.accent + '55' : 'rgba(43,114,212,0.10)'}`,
        borderBottom: `3px solid ${sc.accent}`,
        borderRadius: 14,
        overflow: 'hidden',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered
          ? `0 12px 40px rgba(0,0,0,0.13), 0 0 0 1px ${sc.accent}25`
          : '0 4px 18px rgba(0,0,0,0.08)',
        transition: 'transform 0.22s cubic-bezier(0.22,1,0.36,1), box-shadow 0.22s, border-color 0.22s',
      }}
    >
      {/* Status accent top bar */}
      <div style={{
        height: 3,
        background: `linear-gradient(90deg, ${sc.accent}, ${sc.accent}70)`,
        boxShadow: `0 0 10px ${sc.accent}60`,
      }} />

      <div style={{ padding: '14px 15px 15px' }}>

        {/* Photo + Name + Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img
              src={p.photo} alt={p.name}
              style={{
                width: 52, height: 52, borderRadius: '50%', objectFit: 'cover',
                border: `2px solid ${sc.accent}45`,
                boxShadow: `0 0 14px ${sc.accent}28, 0 2px 6px rgba(0,0,0,0.12)`,
              }}
            />
            {p.isNewPlayer === 1 && (
              <div style={{
                position: 'absolute', bottom: -3, right: -3,
                background: '#FFB800', color: '#000',
                fontSize: 7, fontWeight: 900, borderRadius: 999,
                padding: '1px 5px', letterSpacing: 0.6, textTransform: 'uppercase',
                border: '1.5px solid rgba(255,255,255,0.9)',
                lineHeight: 1.5,
              }}>NEW</div>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 13, fontWeight: 700, color: '#0D1E3E',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              marginBottom: 6, fontFamily: "'Inter', sans-serif",
            }}>{p.name}</div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 9, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase',
                padding: '2px 8px', borderRadius: 999,
                background: skillStyle.bg, color: skillStyle.text, border: `1px solid ${skillStyle.border}`,
              }}>{skillName}</span>
              <span style={{
                fontSize: 9, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase',
                padding: '2px 8px', borderRadius: 999,
                background: sc.bg, color: sc.accent, border: `1px solid ${sc.border}`,
              }}>{sc.label}</span>
            </div>
          </div>
        </div>

        {/* Prices */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 11 }}>
          {[
            {
              label: 'Base Price',
              value: `₹${p.basePrice.toLocaleString()}`,
              color: '#005A8E',
              bg: 'linear-gradient(135deg, rgba(0,90,142,0.08) 0%, rgba(0,120,194,0.04) 100%)',
              border: 'rgba(0,90,142,0.18)',
            },
            {
              label: 'Sold Price',
              value: p.soldPrice ? `₹${p.soldPrice.toLocaleString()}` : '—',
              color: p.soldPrice ? sc.accent : '#A0AFC8',
              bg: p.soldPrice ? sc.bg : 'rgba(255,255,255,0.7)',
              border: p.soldPrice ? sc.border : 'rgba(0,0,0,0.08)',
            },
          ].map(item => (
            <div key={item.label} style={{
              background: item.bg, borderRadius: 9, padding: '7px 10px',
              border: `1px solid ${item.border}`,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)',
            }}>
              <div style={{ fontSize: 8, color: '#8A9AB8', letterSpacing: 1.8, textTransform: 'uppercase', fontWeight: 700, marginBottom: 3 }}>{item.label}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: item.color, fontFamily: "'Space Mono', monospace" }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Team (if sold) */}
        {p.teamName && (
          <div style={{
            fontSize: 10, color: sc.accent, fontWeight: 700, letterSpacing: 1,
            textTransform: 'uppercase', marginBottom: 9,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <span style={{ opacity: 0.55, fontSize: 8 }}>▶</span> {p.teamName}
          </div>
        )}

        {/* Stats */}
        {statsRows.length > 0 && (
          <div style={{
            borderTop: '1px solid rgba(0,0,0,0.06)',
            paddingTop: 9, marginBottom: 11,
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px',
          }}>
            {statsRows.map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 9, color: '#8A9AB8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, whiteSpace: 'nowrap' }}>{k}</span>
                <span style={{ fontSize: 11, color: '#1A3362', fontFamily: "'Space Mono', monospace", fontWeight: 700 }}>{v}</span>
              </div>
            ))}
          </div>
        )}

        {/* Action button */}
        <ActionButton status={p.status} accent={sc.accent} onClick={() => onToggle(p.id)} />
      </div>
    </div>
  );
};

const ActionButton: React.FC<{ status: string; accent: string; onClick: () => void }> = ({ status, accent, onClick }) => {
  const [hov, setHov] = useState(false);
  const isSold = status === 'SOLD';
  const btnAccent = isSold ? '#E5283F' : accent;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: '100%', padding: '8px', borderRadius: 8,
        background: hov ? btnAccent : 'rgba(255,255,255,0.85)',
        color: hov ? '#fff' : btnAccent,
        border: `1px solid ${btnAccent}55`,
        cursor: 'pointer', fontSize: 11, fontWeight: 800,
        letterSpacing: 1.5, textTransform: 'uppercase',
        transition: 'all 0.15s',
        boxShadow: hov ? `0 0 16px ${btnAccent}35, inset 0 1px 0 rgba(255,255,255,0.25)` : 'inset 0 1px 0 rgba(255,255,255,0.9)',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {isSold ? 'Mark Unsold' : 'Mark Sold'}
    </button>
  );
};

export default PlayerManagementPage;
