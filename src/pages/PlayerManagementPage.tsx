import React, { useEffect, useState } from 'react';
import { Player, Team } from '../types';
import FireworksCanvas from '../components/FireworksCanvas';
import { motion, AnimatePresence } from 'framer-motion';
import { AuroraBackground } from '../components/ui/AuroraBackground';
import { BackgroundBeams } from '../components/ui/BackgroundBeams';
import { ShimmerText } from '../components/ui/ShimmerText';
import { cn } from '../components/ui/cn';

const SKILL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  BATSMAN:          { bg: 'rgba(52,211,153,0.1)',   text: '#34d399', border: 'rgba(52,211,153,0.3)' },
  BOWLER:           { bg: 'rgba(248,113,113,0.1)',   text: '#f87171', border: 'rgba(248,113,113,0.3)' },
  'ALL ROUNDER':    { bg: 'rgba(245,158,11,0.1)',    text: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
  ALL_ROUNDER:      { bg: 'rgba(245,158,11,0.1)',    text: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
  'WICKET KEEPER':  { bg: 'rgba(129,140,248,0.1)',   text: '#818cf8', border: 'rgba(129,140,248,0.3)' },
  WK_BATSMAN:       { bg: 'rgba(129,140,248,0.1)',   text: '#818cf8', border: 'rgba(129,140,248,0.3)' },
};

const STATUS_CONFIG: Record<string, { accent: string; bg: string; border: string; label: string }> = {
  SOLD:         { accent: '#34d399', bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.25)',  label: 'Sold' },
  UNSOLD:       { accent: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.25)', label: 'Unsold' },
  NOT_ASSIGNED: { accent: '#38bdf8', bg: 'rgba(56,189,248,0.08)',  border: 'rgba(56,189,248,0.25)',  label: 'Not Assigned' },
  ASSIGNED:     { accent: '#818cf8', bg: 'rgba(129,140,248,0.08)', border: 'rgba(129,140,248,0.25)', label: 'Assigned' },
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

  const handleOpenSellModal = (player: Player) =>
    setSellModal({ player, teamId: null, price: String(player.basePrice), submitting: false, error: '' });

  const handleMarkUnsold = async (id: number) => {
    try {
      await fetch(`http://localhost:8282/api/players/reset-auction?playerId=${id}`, { method: 'POST' });
      setPlayers(prev => prev.map(p =>
        p.id === id ? { ...p, status: 'NOT_ASSIGNED', soldPrice: null, teamId: null, teamName: undefined } : p
      ));
    } catch { /* silently ignore */ }
  };

  const handleConfirmSold = async () => {
    if (!sellModal) return;
    const { player, teamId, price } = sellModal;
    if (!teamId)                          { setSellModal(m => m ? { ...m, error: 'Please select a team.' } : m); return; }
    const soldPrice = parseInt(price, 10);
    if (isNaN(soldPrice) || soldPrice <= 0) { setSellModal(m => m ? { ...m, error: 'Enter a valid price.' } : m); return; }
    const selectedTeam = teams.find(t => t.id === teamId);
    if (selectedTeam && selectedTeam.remainingPurse < soldPrice) {
      setSellModal(m => m ? { ...m, error: `${selectedTeam.name} has insufficient purse (₹${selectedTeam.remainingPurse.toLocaleString()} remaining).` } : m);
      return;
    }
    setSellModal(m => m ? { ...m, submitting: true, error: '' } : m);
    try {
      await fetch('http://localhost:8282/api/players/auction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: player.id, teamId, soldPrice, status: 'SOLD' }),
      });
      const soldTeam = teams.find(t => t.id === teamId);
      setPlayers(prev => prev.map(p =>
        p.id === player.id ? { ...p, status: 'SOLD', soldPrice, teamId, teamName: soldTeam?.name } : p
      ));
      setSellModal(null);
      setSoldAnim({ playerName: player.name, teamName: soldTeam?.name ?? '—', teamLogo: soldTeam?.logo ?? '', amount: soldPrice });
      setTimeout(() => setSoldAnim(null), 3200);
    } catch {
      setSellModal(m => m ? { ...m, submitting: false, error: 'Failed to save. Please try again.' } : m);
    }
  };

  const filteredPlayers = players.filter(p => {
    const statusOk = statusFilter === 'All' || p.status === statusFilter;
    const skillId  = typeof p.skillId === 'string' ? parseInt(p.skillId) : p.skillId;
    const skillOk  = skillFilter === 0 || skillId === skillFilter;
    const nameOk   = !nameSearch.trim() || p.name.toLowerCase().includes(nameSearch.toLowerCase());
    return statusOk && skillOk && nameOk;
  });

  const soldCount = players.filter(p => p.status === 'SOLD').length;
  const unsoldCount = players.filter(p => p.status === 'UNSOLD').length;
  const notAssignedCount = players.filter(p => p.status === 'NOT_ASSIGNED').length;

  const getSkillStyle = (skillName: string) => {
    const key = (skillName ?? '').toUpperCase().replace(/-/g, '_');
    return SKILL_COLORS[key] ?? SKILL_COLORS[skillName?.toUpperCase()]
      ?? { bg: 'rgba(56,189,248,0.08)', text: '#38bdf8', border: 'rgba(56,189,248,0.25)' };
  };

  return (
    <AuroraBackground className="min-h-screen">
      <BackgroundBeams />

      <div className="relative z-10 px-6 py-10 max-w-[1400px] mx-auto">

        {/* ── Header ── */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1
            className="font-display font-black uppercase tracking-[0.1em] leading-none mb-5"
            style={{ fontSize: 'clamp(2.4rem, 5vw, 4rem)' }}
          >
            <ShimmerText>Player Management</ShimmerText>
          </h1>

          {/* Summary pills */}
          <div className="flex gap-3 flex-wrap">
            {[
              { label: 'Total',        count: players.length,     color: '#94a3b8' },
              { label: 'Sold',         count: soldCount,          color: '#34d399' },
              { label: 'Not Assigned', count: notAssignedCount,   color: '#38bdf8' },
              { label: 'Unsold',       count: unsoldCount,        color: '#f87171' },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.08 + 0.2 }}
                className="flex items-center gap-2 px-4 py-2 rounded-full"
                style={{ background: `${s.color}10`, border: `1px solid ${s.color}25` }}
              >
                <span className="font-mono font-black text-xl leading-none" style={{ color: s.color }}>{s.count}</span>
                <span className="text-[0.6rem] font-bold tracking-widest uppercase" style={{ color: '#64748b' }}>{s.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── Filters ── */}
        <motion.div
          className="rounded-2xl p-5 mb-6 space-y-4"
          style={{ background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(148,163,184,0.08)', backdropFilter: 'blur(16px)' }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
        >
          {/* Search */}
          <div className="flex items-center gap-3">
            <span className="text-[0.6rem] text-slate-500 tracking-[0.25em] uppercase font-bold min-w-[40px]">Search</span>
            <div className="relative flex-1 max-w-xs">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                placeholder="Search player…"
                value={nameSearch}
                onChange={e => setNameSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl text-sm text-slate-100 outline-none transition-all"
                style={{
                  background: 'rgba(15,23,42,0.6)',
                  border: '1px solid rgba(148,163,184,0.15)',
                }}
              />
              {nameSearch && (
                <button onClick={() => setNameSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs transition-colors">
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Skill filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[0.6rem] text-slate-500 tracking-[0.25em] uppercase font-bold min-w-[40px]">Skill</span>
            {[{ id: 0, skillName: 'All' }, ...skills].map(s => (
              <FilterPill key={s.id} active={skillFilter === s.id} color="#38bdf8" onClick={() => setSkillFilter(s.id)}>
                {s.skillName}
              </FilterPill>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[0.6rem] text-slate-500 tracking-[0.25em] uppercase font-bold min-w-[40px]">Status</span>
            {([
              { value: 'All',          label: 'All',          color: '#94a3b8' },
              { value: 'SOLD',         label: 'Sold',         color: '#34d399' },
              { value: 'UNSOLD',       label: 'Unsold',       color: '#f87171' },
              { value: 'ASSIGNED',     label: 'Assigned',     color: '#818cf8' },
              { value: 'NOT_ASSIGNED', label: 'Not Assigned', color: '#38bdf8' },
            ] as const).map(opt => (
              <FilterPill key={opt.value} active={statusFilter === opt.value} color={opt.color} onClick={() => setStatusFilter(opt.value)}>
                {opt.label}
              </FilterPill>
            ))}
          </div>
        </motion.div>

        {/* ── Count ── */}
        <div className="text-[0.65rem] text-slate-500 font-mono uppercase tracking-widest mb-3">
          {filteredPlayers.length} player{filteredPlayers.length !== 1 ? 's' : ''} shown
        </div>

        {/* ── Table ── */}
        {filteredPlayers.length > 0 ? (
          <motion.div
            className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(148,163,184,0.08)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
          >
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'linear-gradient(90deg, rgba(15,23,42,0.98), rgba(30,41,59,0.98))', borderBottom: '1px solid rgba(245,158,11,0.15)' }}>
                  {['#', 'Player', 'Skill', 'Status', 'Base', 'Sold', 'Team', 'Action'].map(col => (
                    <th key={col}
                      className="py-3 px-4 text-left text-[0.6rem] font-mono font-bold tracking-[0.2em] uppercase text-slate-500 whitespace-nowrap"
                      style={{ textAlign: col === '#' ? 'center' : 'left' }}
                    >
                      {col}
                    </th>
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
          </motion.div>
        ) : (
          <div className="text-center text-slate-500 font-mono text-sm py-20 tracking-widest uppercase">
            No players match the filters.
          </div>
        )}
      </div>

      {/* ── Sell Modal ── */}
      <AnimatePresence>
        {sellModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={e => { if (e.target === e.currentTarget) setSellModal(null); }}
          >
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
            <motion.div
              className="relative w-full max-w-md rounded-2xl p-7"
              style={{
                background: 'rgba(15,23,42,0.98)',
                border: '1px solid rgba(52,211,153,0.25)',
                boxShadow: '0 25px 80px rgba(0,0,0,0.7), 0 0 40px rgba(52,211,153,0.05)',
              }}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="h-0.5 rounded-t-2xl absolute top-0 left-0 right-0" style={{ background: 'linear-gradient(90deg, transparent, #34d399, transparent)' }} />

              <div className="text-[0.6rem] text-slate-500 tracking-[0.3em] uppercase font-mono mb-1">Mark as Sold</div>
              <div className="font-display font-black text-2xl text-slate-100 uppercase tracking-widest leading-none mb-1">
                {sellModal.player.name}
              </div>
              <div className="text-slate-500 text-xs mb-5">
                Base price: <span className="font-mono font-bold text-amber-400">₹{sellModal.player.basePrice.toLocaleString()}</span>
              </div>

              <div className="h-px bg-white/5 mb-5" />

              {/* Team select */}
              <label className="block text-[0.6rem] text-slate-500 tracking-[0.25em] uppercase font-mono mb-2">Select Team</label>
              <select
                value={sellModal.teamId ?? ''}
                onChange={e => setSellModal(m => m ? { ...m, teamId: Number(e.target.value) || null, error: '' } : m)}
                className="w-full px-4 py-2.5 rounded-xl mb-2 text-sm font-semibold text-slate-100 outline-none"
                style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(148,163,184,0.15)' }}
              >
                <option value="">— Choose a team —</option>
                {teams.map(t => {
                  const askPrice = parseInt(sellModal.price, 10);
                  const canAfford = isNaN(askPrice) || askPrice <= 0 || t.remainingPurse >= askPrice;
                  return (
                    <option key={t.id} value={t.id} disabled={!canAfford}>
                      {t.name}{!canAfford ? ' — Insufficient Balance' : ''}
                    </option>
                  );
                })}
              </select>

              {/* Purse hint for the selected team */}
              {sellModal.teamId && (() => {
                const t = teams.find(t => t.id === sellModal.teamId);
                if (!t) return null;
                const askPrice = parseInt(sellModal.price, 10);
                const canAfford = isNaN(askPrice) || askPrice <= 0 || t.remainingPurse >= askPrice;
                const pct = Math.round((t.remainingPurse / t.purse) * 100);
                const barColor = pct > 60 ? '#34d399' : pct > 30 ? '#f59e0b' : '#f87171';
                return (
                  <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl mb-4"
                    style={{
                      background: canAfford ? 'rgba(52,211,153,0.06)' : 'rgba(248,113,113,0.06)',
                      border: `1px solid ${canAfford ? 'rgba(52,211,153,0.18)' : 'rgba(248,113,113,0.25)'}`,
                    }}>
                    <div>
                      <div className="text-[0.55rem] text-slate-500 font-mono uppercase tracking-widest mb-0.5">Remaining Purse</div>
                      <div className="font-mono text-sm font-bold" style={{ color: barColor }}>
                        ₹{t.remainingPurse.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-[0.6rem] font-bold uppercase tracking-wider" style={{ color: canAfford ? '#34d399' : '#f87171' }}>
                      {canAfford ? '✓ Can Afford' : '⚠ Insufficient'}
                    </div>
                  </div>
                );
              })()}

              {/* Price input */}
              <label className="block text-[0.6rem] text-slate-500 tracking-[0.25em] uppercase font-mono mb-2">Sold Price</label>
              <div className="relative mb-5">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono font-bold text-amber-400">₹</span>
                <input
                  type="number" min={1}
                  value={sellModal.price}
                  onChange={e => setSellModal(m => m ? { ...m, price: e.target.value, error: '' } : m)}
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl text-sm font-mono font-bold text-amber-400 outline-none"
                  style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(148,163,184,0.15)' }}
                />
              </div>

              {sellModal.error && (
                <div className="text-rose-400 text-xs font-bold text-center mb-4">{sellModal.error}</div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setSellModal(null)} disabled={sellModal.submitting}
                  className="flex-1 py-2.5 rounded-xl text-sm font-display font-black tracking-widest uppercase text-slate-400 transition-all hover:text-slate-100"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  Cancel
                </button>
                <button onClick={handleConfirmSold} disabled={sellModal.submitting}
                  className="flex-[2] py-2.5 rounded-xl text-sm font-display font-black tracking-widest uppercase text-black transition-all"
                  style={{
                    background: sellModal.submitting ? 'rgba(52,211,153,0.4)' : '#34d399',
                    boxShadow: sellModal.submitting ? 'none' : '0 0 20px rgba(52,211,153,0.4)',
                    cursor: sellModal.submitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {sellModal.submitting ? 'Saving…' : 'Confirm Sale ✓'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SOLD animation overlay ── */}
      {soldAnim && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 3000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(2,6,23,0.90)',
          animation: 'sold-backdrop 3.2s ease-in-out forwards',
          backdropFilter: 'blur(8px)',
        }}>
          <FireworksCanvas />
          <div style={{ textAlign: 'center', animation: 'sold-card 3.2s ease-in-out forwards' }}>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 'clamp(5rem, 12vw, 9rem)',
              fontWeight: 900,
              letterSpacing: 12, lineHeight: 1, color: '#34d399',
              textShadow: '0 0 40px rgba(52,211,153,0.8), 0 0 80px rgba(52,211,153,0.4)',
              animation: 'sold-badge 0.6s cubic-bezier(0.22,1,0.36,1) 0.1s both',
            }}>SOLD!</div>
            <div style={{ width: 80, height: 2, background: 'rgba(52,211,153,0.4)', borderRadius: 99, margin: '10px auto 18px' }} />
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 900,
              letterSpacing: 4, textTransform: 'uppercase', color: '#f8fafc', marginBottom: 6,
              animation: 'sold-fade-up 0.5s ease-out 0.4s both',
            }}>{soldAnim.playerName}</div>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: 3,
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 14,
              animation: 'sold-fade-up 0.5s ease-out 0.55s both',
            }}>sold to</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, animation: 'sold-fade-up 0.5s ease-out 0.65s both' }}>
              {soldAnim.teamLogo && (
                <img src={soldAnim.teamLogo} alt={soldAnim.teamName} style={{
                  width: 64, height: 64, objectFit: 'contain', borderRadius: '50%',
                  border: '2px solid rgba(245,158,11,0.6)',
                  boxShadow: '0 0 24px rgba(245,158,11,0.5)',
                  background: 'rgba(255,255,255,0.06)', padding: 4,
                }} />
              )}
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900,
                letterSpacing: 5, color: '#f59e0b',
                textShadow: '0 0 28px rgba(245,158,11,0.85), 0 0 60px rgba(245,158,11,0.4)',
                textTransform: 'uppercase',
              }}>{soldAnim.teamName}</div>
            </div>
            <div style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 'clamp(1.2rem, 2.5vw, 1.8rem)', fontWeight: 700, color: '#34d399',
              marginTop: 18, animation: 'sold-fade-up 0.5s ease-out 0.8s both',
            }}>₹{soldAnim.amount.toLocaleString()}</div>
          </div>
        </div>
      )}
    </AuroraBackground>
  );
};

/* ── Filter Pill ── */
const FilterPill: React.FC<{ active: boolean; color: string; onClick: () => void; children: React.ReactNode }> = ({ active, color, onClick, children }) => (
  <button
    onClick={onClick}
    className="px-3 py-1 rounded-full text-[0.65rem] font-bold tracking-widest uppercase transition-all duration-200 cursor-pointer"
    style={{
      background: active ? `${color}20` : 'rgba(255,255,255,0.03)',
      border: `1px solid ${active ? color + '50' : 'rgba(255,255,255,0.08)'}`,
      color: active ? color : '#64748b',
      boxShadow: active ? `0 0 12px ${color}30` : 'none',
    }}
  >
    {children}
  </button>
);

/* ── Player Row ── */
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
  const [hov, setHov] = useState(false);
  const isSold = p.status === 'SOLD';
  const btnColor = isSold ? '#f87171' : '#34d399';

  return (
    <tr
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov
          ? `rgba(30,41,59,0.7)`
          : isEven ? 'rgba(15,23,42,0.5)' : 'rgba(15,23,42,0.3)',
        borderBottom: '1px solid rgba(148,163,184,0.05)',
        transition: 'background 0.15s',
      }}
    >
      {/* # */}
      <td className="py-3 px-4 text-center">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-[0.6rem] font-mono font-black mx-auto transition-all duration-150"
          style={{
            background: hov ? sc.accent : 'rgba(255,255,255,0.05)',
            color: hov ? '#020617' : '#475569',
          }}
        >
          {index}
        </div>
      </td>

      {/* Player */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <img src={p.photo} alt={p.name}
              className="w-9 h-9 rounded-full object-cover"
              style={{ border: `1.5px solid ${sc.accent}40`, boxShadow: `0 0 10px ${sc.accent}20` }}
            />
            {p.isNewPlayer === 1 && (
              <div className="absolute -bottom-1 -right-1 bg-amber-400 text-black text-[6px] font-black rounded-full px-1 py-0.5 uppercase tracking-wider leading-none"
                style={{ border: '1.5px solid rgba(2,6,23,0.8)' }}>
                NEW
              </div>
            )}
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-200 whitespace-nowrap">{p.name}</div>
          </div>
        </div>
      </td>

      {/* Skill */}
      <td className="py-3 px-4">
        <span className="text-[0.6rem] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full whitespace-nowrap"
          style={{ background: skillStyle.bg, color: skillStyle.text, border: `1px solid ${skillStyle.border}` }}>
          {skillName}
        </span>
      </td>

      {/* Status */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: sc.accent, boxShadow: `0 0 6px ${sc.accent}` }} />
          <span className="text-[0.6rem] font-bold tracking-wider uppercase whitespace-nowrap" style={{ color: sc.accent }}>
            {sc.label}
          </span>
        </div>
      </td>

      {/* Base Price */}
      <td className="py-3 px-4">
        <span className="font-mono text-xs font-bold text-slate-400">₹{p.basePrice.toLocaleString()}</span>
      </td>

      {/* Sold Price */}
      <td className="py-3 px-4">
        {p.soldPrice ? (
          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded"
            style={{ background: sc.bg, color: sc.accent, border: `1px solid ${sc.border}` }}>
            ₹{p.soldPrice.toLocaleString()}
          </span>
        ) : (
          <span className="font-mono text-xs text-slate-700">—</span>
        )}
      </td>

      {/* Team */}
      <td className="py-3 px-4">
        {p.teamName
          ? <span className="text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: sc.accent }}>{p.teamName}</span>
          : <span className="text-slate-700 text-xs">—</span>
        }
      </td>

      {/* Action */}
      <td className="py-3 px-4">
        <button
          onClick={() => isSold ? onMarkUnsold(p.id) : onMarkSold(p)}
          className="px-3 py-1.5 rounded-lg text-[0.65rem] font-bold tracking-widest uppercase transition-all duration-150 whitespace-nowrap"
          style={{
            background: hov ? `${btnColor}20` : 'rgba(255,255,255,0.04)',
            color: hov ? btnColor : '#475569',
            border: `1px solid ${hov ? btnColor + '40' : 'rgba(255,255,255,0.06)'}`,
            boxShadow: hov ? `0 0 12px ${btnColor}25` : 'none',
          }}
        >
          {isSold ? '↩ Unsold' : '✓ Sell'}
        </button>
      </td>
    </tr>
  );
};

export default PlayerManagementPage;
