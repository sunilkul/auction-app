import React, { useEffect, useState } from 'react';
import { Player, Team } from '../types';
import FireworksCanvas from '../components/FireworksCanvas';

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

interface SellModalState {
  player: Player;
  teamId: number | null;
  price: string;
  submitting: boolean;
  error: string;
}

const PlayerManagementPage: React.FC = () => {
  const [players, setPlayers]           = useState<Player[]>([]);
  const [skills, setSkills]             = useState<Skill[]>([]);
  const [teams, setTeams]               = useState<Team[]>([]);
  const [skillFilter, setSkillFilter]   = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<'All' | 'SOLD' | 'UNSOLD' | 'NOT_ASSIGNED' | 'ASSIGNED'>('All');
  const [nameSearch, setNameSearch]     = useState('');
  const [sellModal, setSellModal]       = useState<SellModalState | null>(null);
  const [soldAnim, setSoldAnim]         = useState<{ playerName: string; teamName: string; teamLogo: string; amount: number } | null>(null);

  useEffect(() => {
    fetch('http://localhost:8282/api/players/all-players').then(r => r.json()).then(setPlayers);
    fetch('http://localhost:8282/api/skills').then(r => r.json()).then(setSkills);
    fetch('http://localhost:8282/api/teams').then(r => r.json()).then(setTeams);
  }, []);

  const handleOpenSellModal = (player: Player) => {
    setSellModal({ player, teamId: null, price: String(player.basePrice), submitting: false, error: '' });
  };

  const handleMarkUnsold = async (id: number) => {
    try {
      await fetch(`http://localhost:8282/api/players/reset-auction?playerId=${id}`, {
        method: 'POST',
      });
      setPlayers(prev => prev.map(p =>
        p.id === id ? { ...p, status: 'NOT_ASSIGNED', soldPrice: null, teamId: null, teamName: undefined } : p
      ));
    } catch {
      // silently ignore
    }
  };

  const handleConfirmSold = async () => {
    if (!sellModal) return;
    const { player, teamId, price } = sellModal;
    if (!teamId) { setSellModal(m => m ? { ...m, error: 'Please select a team.' } : m); return; }
    const soldPrice = parseInt(price, 10);
    if (isNaN(soldPrice) || soldPrice <= 0) { setSellModal(m => m ? { ...m, error: 'Enter a valid price.' } : m); return; }
    setSellModal(m => m ? { ...m, submitting: true, error: '' } : m);
    try {
      await fetch('http://localhost:8282/api/players/auction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: player.id, teamId, soldPrice, status: 'SOLD' }),
      });
      const soldTeam = teams.find(t => t.id === teamId);
      setPlayers(prev => prev.map(p =>
        p.id === player.id
          ? { ...p, status: 'SOLD', soldPrice, teamId, teamName: soldTeam?.name }
          : p
      ));
      setSellModal(null);
      setSoldAnim({ playerName: player.name, teamName: soldTeam?.name ?? '—', teamLogo: soldTeam?.logo ?? '', amount: soldPrice });
      setTimeout(() => setSoldAnim(null), 3200);
    } catch {
      setSellModal(m => m ? { ...m, submitting: false, error: 'Failed to save. Please try again.' } : m);
    }
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

      {/* ── Sell Modal ───────────────────────────────── */}
      {sellModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(4,8,20,0.60)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={e => { if (e.target === e.currentTarget) setSellModal(null); }}
        >
          <div style={{
            background: 'rgba(255,255,255,0.97)',
            borderRadius: 18,
            padding: '28px 28px 24px',
            width: '100%', maxWidth: 420,
            boxShadow: '0 20px 60px rgba(0,0,0,0.25), 0 4px 20px rgba(0,0,0,0.12)',
            border: '1px solid rgba(43,114,212,0.14)',
          }}>
            {/* Header */}
            <div style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: 9, fontWeight: 800, letterSpacing: 3,
                color: '#8A9AB8', textTransform: 'uppercase', marginBottom: 6,
              }}>Mark as Sold</div>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: '1.6rem', fontWeight: 900, color: '#0D1E3E',
                letterSpacing: 1, textTransform: 'uppercase', lineHeight: 1,
              }}>{sellModal.player.name}</div>
              <div style={{ fontSize: 11, color: '#6B7FA0', marginTop: 4 }}>
                Base price: <span style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, color: '#005A8E' }}>₹{sellModal.player.basePrice.toLocaleString()}</span>
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', marginBottom: 20 }} />

            {/* Team select */}
            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: 'block', fontSize: 9, fontWeight: 800,
                letterSpacing: 2.5, textTransform: 'uppercase',
                color: '#8A9AB8', marginBottom: 8,
              }}>Select Team</label>
              <select
                value={sellModal.teamId ?? ''}
                onChange={e => setSellModal(m => m ? { ...m, teamId: Number(e.target.value) || null, error: '' } : m)}
                style={{
                  width: '100%', padding: '10px 14px',
                  borderRadius: 10,
                  border: sellModal.teamId
                    ? '1.5px solid rgba(0,120,194,0.45)'
                    : '1.5px solid rgba(43,114,212,0.20)',
                  background: sellModal.teamId ? 'rgba(0,120,194,0.06)' : 'rgba(255,255,255,0.9)',
                  color: sellModal.teamId ? '#005A8E' : '#8A9AB8',
                  fontSize: 13, fontWeight: 700,
                  fontFamily: "'Inter', sans-serif",
                  outline: 'none', cursor: 'pointer',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238A9AB8' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 14px center',
                  paddingRight: 36,
                }}
              >
                <option value="">— Choose a team —</option>
                {teams.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* Price input */}
            <div style={{ marginBottom: 22 }}>
              <label style={{
                display: 'block', fontSize: 9, fontWeight: 800,
                letterSpacing: 2.5, textTransform: 'uppercase',
                color: '#8A9AB8', marginBottom: 8,
              }}>Sold Price (₹)</label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                  fontFamily: "'Space Mono', monospace", fontSize: 14, color: '#005A8E', fontWeight: 700,
                }}>₹</span>
                <input
                  type="number"
                  min={1}
                  value={sellModal.price}
                  onChange={e => setSellModal(m => m ? { ...m, price: e.target.value, error: '' } : m)}
                  style={{
                    width: '100%', padding: '10px 14px 10px 30px',
                    borderRadius: 10,
                    border: '1.5px solid rgba(43,114,212,0.20)',
                    background: 'rgba(255,255,255,0.9)',
                    fontSize: 14, fontWeight: 700,
                    fontFamily: "'Space Mono', monospace",
                    color: '#005A8E', outline: 'none', boxSizing: 'border-box',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#0078C2'; e.target.style.boxShadow = '0 0 0 3px rgba(0,120,194,0.12)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(43,114,212,0.20)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
            </div>

            {/* Error */}
            {sellModal.error && (
              <div style={{ color: '#E5283F', fontSize: 11, fontWeight: 700, marginBottom: 14, textAlign: 'center' }}>
                {sellModal.error}
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setSellModal(null)}
                disabled={sellModal.submitting}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 10,
                  border: '1.5px solid rgba(43,114,212,0.18)',
                  background: 'rgba(255,255,255,0.9)', color: '#6B7FA0',
                  fontSize: 13, fontWeight: 800, letterSpacing: 1.5,
                  textTransform: 'uppercase', cursor: 'pointer',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  transition: 'all 0.15s',
                }}
              >Cancel</button>
              <button
                onClick={handleConfirmSold}
                disabled={sellModal.submitting}
                style={{
                  flex: 2, padding: '11px 0', borderRadius: 10,
                  border: 'none',
                  background: sellModal.submitting ? 'rgba(0,168,90,0.35)' : '#00A85A',
                  color: '#fff',
                  fontSize: 13, fontWeight: 800, letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  cursor: sellModal.submitting ? 'not-allowed' : 'pointer',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  boxShadow: sellModal.submitting ? 'none' : '0 0 18px rgba(0,168,90,0.40)',
                  transition: 'all 0.15s',
                }}
              >{sellModal.submitting ? 'Saving…' : 'Confirm Sale'}</button>
            </div>
          </div>
        </div>
      )}

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
                    onMarkSold={handleOpenSellModal}
                    onMarkUnsold={handleMarkUnsold}
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

      {/* ── SOLD animation overlay ── */}
      {soldAnim && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 3000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(4,8,15,0.82)',
          animation: 'sold-backdrop 3.2s ease-in-out forwards',
          backdropFilter: 'blur(6px)',
        }}>
          <FireworksCanvas />
          <div style={{ textAlign: 'center', animation: 'sold-card 3.2s ease-in-out forwards' }}>
            <div style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 'clamp(5rem, 12vw, 9rem)',
              letterSpacing: 12, lineHeight: 1, color: '#00D97E',
              textShadow: '0 0 40px rgba(0,217,126,0.8), 0 0 80px rgba(0,217,126,0.4)',
              animation: 'sold-badge 0.6s cubic-bezier(0.22,1,0.36,1) 0.1s both',
            }}>SOLD!</div>

            <div style={{ width: 80, height: 2, background: 'rgba(0,217,126,0.4)', borderRadius: 99, margin: '10px auto 18px' }} />

            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 900,
              letterSpacing: 4, textTransform: 'uppercase', color: '#FFFFFF', marginBottom: 6,
              animation: 'sold-fade-up 0.5s ease-out 0.4s both',
            }}>{soldAnim.playerName}</div>

            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: 3,
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 14,
              animation: 'sold-fade-up 0.5s ease-out 0.55s both',
            }}>sold to</div>

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
              animation: 'sold-fade-up 0.5s ease-out 0.65s both',
            }}>
              {soldAnim.teamLogo && (
                <img src={soldAnim.teamLogo} alt={soldAnim.teamName} style={{
                  width: 64, height: 64, objectFit: 'contain', borderRadius: '50%',
                  border: '2px solid rgba(0,120,194,0.6)',
                  boxShadow: '0 0 24px rgba(0,120,194,0.5)',
                  background: 'rgba(255,255,255,0.08)', padding: 4,
                }} />
              )}
              <div style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
                letterSpacing: 5, color: '#FFD700',
                textShadow: '0 0 28px rgba(255,215,0,0.85), 0 0 60px rgba(255,215,0,0.4)',
                textTransform: 'uppercase',
              }}>{soldAnim.teamName}</div>
            </div>

            <div style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 'clamp(1.2rem, 2.5vw, 1.8rem)', fontWeight: 700, color: '#00D97E',
              marginTop: 18, animation: 'sold-fade-up 0.5s ease-out 0.8s both',
            }}>₹{soldAnim.amount.toLocaleString()}</div>
          </div>
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
  onMarkSold: (player: Player) => void;
  onMarkUnsold: (id: number) => void;
}

const PlayerRow: React.FC<RowProps> = ({ index, player: p, statusCfg: sc, skillName, skillStyle, isEven, onMarkSold, onMarkUnsold }) => {
  const [hovered, setHovered] = useState(false);
  const [btnHov, setBtnHov]   = useState(false);
  const isSold = p.status === 'SOLD';
  const btnAccent = isSold ? '#E5283F' : '#00A85A';

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
          onClick={() => isSold ? onMarkUnsold(p.id) : onMarkSold(p)}
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
