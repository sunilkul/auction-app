import React, { useEffect, useState } from 'react';
import { Team, Player } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { AuroraBackground } from '../components/ui/AuroraBackground';
import { GlowCard } from '../components/ui/GlowCard';
import { ShimmerText } from '../components/ui/ShimmerText';
import { BackgroundBeams } from '../components/ui/BackgroundBeams';
import { SpotlightCard } from '../components/ui/SpotlightCard';

const TeamPage: React.FC = () => {
  const [teams, setTeams]               = useState<Team[]>([]);
  const [players, setPlayers]           = useState<Player[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  useEffect(() => {
    fetch('http://localhost:8282/api/teams').then(r => r.json()).then(setTeams);
    fetch('http://localhost:8282/api/players/all-players').then(r => r.json()).then(setPlayers);
  }, []);


  return (
    <AuroraBackground className="min-h-screen">
      <BackgroundBeams />

      <div className="relative z-10 px-6 py-10 max-w-[1400px] mx-auto">

        {/* ── Header ── */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1
            className="font-display font-black uppercase tracking-[0.12em] leading-none"
            style={{ fontSize: 'clamp(2.5rem, 5vw, 4.5rem)' }}
          >
            <ShimmerText>All Teams</ShimmerText>
          </h1>
          <p className="text-slate-500 text-xs tracking-[0.4em] uppercase font-mono mt-3">
            Click a team to view their squad
          </p>
        </motion.div>

        {/* ── Team grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {teams.map((team, i) => {
            const teamPlayers = players.filter(p => Number(p.teamId) === Number(team.id));
            const pct = team.purse > 0 ? Math.round((team.remainingPurse / team.purse) * 100) : 0;
            const barCol = pct > 60 ? '#34d399' : pct > 30 ? '#f59e0b' : '#f87171';

            return (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, y: 24, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -8, scale: 1.02 }}
                onClick={() => setSelectedTeam(team)}
                className="cursor-pointer"
              >
                <SpotlightCard
                  className="rounded-2xl border border-white/[0.07] bg-[rgba(30,41,59,0.65)] backdrop-blur-xl overflow-hidden h-full"
                  spotlightColor="rgba(245,158,11,0.12)"
                >
                  {/* Glow stripe */}
                  <div className="h-0.5" style={{ background: `linear-gradient(90deg, transparent, ${barCol}, transparent)`, boxShadow: `0 0 10px ${barCol}` }} />

                  <div className="p-5 flex flex-col items-center gap-3">
                    {/* Logo */}
                    <motion.div
                      whileHover={{ rotate: [-1, 1, -1], transition: { repeat: Infinity, duration: 0.4 } }}
                      className="relative"
                    >
                      <div className="absolute inset-0 rounded-full blur-2xl opacity-20" style={{ background: barCol }} />
                      <img
                        src={team.logo}
                        alt={team.name}
                        className="relative w-16 h-16 object-contain"
                        style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }}
                      />
                    </motion.div>

                    {/* Name */}
                    <div className="font-display font-black text-lg text-slate-100 uppercase tracking-widest text-center leading-tight">
                      {team.name}
                    </div>

                    {/* Player count */}
                    <div className="text-[0.6rem] font-mono text-slate-500 tracking-widest uppercase">
                      {teamPlayers.length} players bought
                    </div>

                    {/* POC badges */}
                    <div style={{ display: 'flex', gap: 5, width: '100%' }}>
                      {[
                        { label: 'POC 1', name: team.poc1, num: '1' },
                        { label: 'POC 2', name: team.poc2, num: '2' },
                      ].map((poc) => (
                        <div key={poc.label} style={{
                          flex: 1, minWidth: 0, position: 'relative', overflow: 'hidden',
                          borderRadius: 10,
                          background: `linear-gradient(135deg, ${barCol}20 0%, ${barCol}08 100%)`,
                          border: `1px solid ${barCol}45`,
                          boxShadow: `0 0 12px ${barCol}15, inset 0 1px 0 ${barCol}20`,
                          padding: '7px 8px',
                        }}>
                          <div style={{
                            position: 'absolute', right: -2, bottom: -6,
                            fontFamily: "'Bebas Neue', 'Barlow Condensed', sans-serif",
                            fontSize: 44, fontWeight: 900, lineHeight: 1,
                            color: `${barCol}18`, userSelect: 'none', pointerEvents: 'none',
                          }}>{poc.num}</div>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginBottom: 4 }}>
                            <div style={{ width: 4, height: 4, borderRadius: '50%', background: barCol, boxShadow: `0 0 6px ${barCol}`, flexShrink: 0 }} />
                            <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: 2, color: barCol, textTransform: 'uppercase', fontFamily: 'monospace' }}>{poc.label}</span>
                          </div>
                          {(() => {
                            const parts = (poc.name || '').trim().split(/\s+/);
                            const first = parts[0] || '—';
                            const surname = parts.slice(1).join(' ');
                            return (
                              <div style={{ lineHeight: 1.15 }}>
                                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 'clamp(0.65rem, 0.9vw, 0.88rem)', color: '#f1f5f9', textTransform: 'uppercase', letterSpacing: 1 }}>{first}</div>
                                {surname && <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 'clamp(0.58rem, 0.8vw, 0.78rem)', color: `${barCol}cc`, textTransform: 'uppercase', letterSpacing: 1 }}>{surname}</div>}
                              </div>
                            );
                          })()}
                        </div>
                      ))}
                    </div>
                  </div>
                </SpotlightCard>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── Modal ── */}
      <AnimatePresence>
        {selectedTeam && (() => {
          const teamPlayers = players.filter(p => Number(p.teamId) === Number(selectedTeam.id));
          return (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTeam(null)}
            >
              {/* Backdrop */}
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

              <motion.div
                className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl"
                style={{
                  background: 'rgba(15,23,42,0.97)',
                  border: '1px solid rgba(245,158,11,0.25)',
                  boxShadow: '0 25px 80px rgba(0,0,0,0.7), 0 0 60px rgba(245,158,11,0.08)',
                }}
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                onClick={e => e.stopPropagation()}
              >
                {/* Amber top stripe */}
                <div className="h-0.5 rounded-t-2xl" style={{ background: 'linear-gradient(90deg, transparent, #f59e0b, transparent)' }} />

                <div className="p-6">
                  {/* Modal header */}
                  <div className="flex items-center gap-4 mb-6">
                    <img src={selectedTeam.logo} alt={selectedTeam.name}
                      className="w-14 h-11 object-contain"
                      style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))' }}
                    />
                    <div className="flex-1">
                      <div className="font-display font-black text-2xl text-slate-100 uppercase tracking-widest">
                        {selectedTeam.name}
                      </div>
                      <div className="text-slate-500 text-xs font-mono tracking-widest uppercase">
                        {teamPlayers.length} player{teamPlayers.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedTeam(null)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-100 transition-colors"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Table */}
                  {teamPlayers.length === 0 ? (
                    <div className="text-center text-slate-500 font-mono text-sm py-10">
                      No players bought yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(245,158,11,0.15)' }}>
                            {['Photo', 'Name', 'Skill', 'Status', 'Base Price', 'Sold Price'].map(h => (
                              <th key={h} className="py-2.5 px-3 text-left text-[0.6rem] font-mono font-bold text-slate-500 tracking-widest uppercase">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {teamPlayers.map((p, idx) => (
                            <motion.tr
                              key={p.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.04 }}
                              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                              className="hover:bg-white/[0.02] transition-colors"
                            >
                              <td className="py-2.5 px-3">
                                <img src={p.photo} alt={p.name}
                                  className="w-8 h-8 rounded-full object-cover"
                                  style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                                />
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-slate-200 text-sm">{p.name}</td>
                              <td className="py-2.5 px-3 text-xs text-slate-400 font-mono">{p.skillName}</td>
                              <td className="py-2.5 px-3">
                                <span className={`badge badge-${p.status.toLowerCase()}`}>{p.status}</span>
                              </td>
                              <td className="py-2.5 px-3 font-mono text-xs text-slate-400">₹{p.basePrice.toLocaleString()}</td>
                              <td className="py-2.5 px-3 font-mono text-xs font-bold" style={{ color: p.soldPrice ? '#f59e0b' : '#475569' }}>
                                {p.soldPrice ? `₹${p.soldPrice.toLocaleString()}` : '—'}
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </AuroraBackground>
  );
};

export default TeamPage;
