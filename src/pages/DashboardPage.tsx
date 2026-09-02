import React, { useEffect, useState } from 'react';
import { Team } from '../types';
import { motion } from 'framer-motion';
import { AuroraBackground } from '../components/ui/AuroraBackground';
import { GlowCard } from '../components/ui/GlowCard';
import { ShimmerText } from '../components/ui/ShimmerText';
import { BackgroundBeams } from '../components/ui/BackgroundBeams';

const DashboardPage: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);

  const totalSpent     = teams.reduce((a, t) => a + (t.purse - t.remainingPurse), 0);
  const totalRemaining = teams.reduce((a, t) => a + t.remainingPurse, 0);

  useEffect(() => {
    fetch('http://localhost:8282/api/teams')
      .then(res => res.json())
      .then((data) => {
        if (Array.isArray(data)) setTeams(data);
        else if (data && typeof data === 'object') setTeams([data]);
        else setTeams([]);
      })
      .catch(() => setTeams([]));
  }, []);

  return (
    <AuroraBackground className="min-h-screen">
      <BackgroundBeams />

      <div className="relative z-10 px-5 py-5 max-w-[1600px] mx-auto">

        {/* ── Header ── */}
        <motion.div
          className="text-center mb-6"
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
<div className="flex items-center justify-center gap-5 mb-1">
            <img
              src="/epl-logo.png"
              alt="EPL Season 8"
              style={{
                height: 'clamp(46px, 5.5vw, 72px)',
                width: 'auto',
                objectFit: 'contain',
                filter: 'drop-shadow(0 0 18px rgba(245,158,11,0.6)) drop-shadow(0 4px 12px rgba(0,0,0,0.7))',
              }}
            />
            <h1
              className="font-display font-black uppercase tracking-[0.12em] leading-none"
              style={{ fontSize: 'clamp(2rem, 4vw, 4rem)' }}
            >
              <ShimmerText>Auction Dashboard</ShimmerText>
            </h1>
          </div>
          <p className="text-slate-500 text-xs tracking-[0.4em] uppercase font-mono mt-2">
            · All Teams Overview ·
          </p>
        </motion.div>

        {/* ── Summary stats ── */}
        <motion.div
          className="grid grid-cols-4 gap-3 mb-6 max-w-3xl mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          {[
            { label: 'Teams',       value: String(teams.length),                                               color: '#f59e0b' },
            { label: 'Total Purse', value: `₹${(teams.reduce((a, t) => a + t.purse, 0) / 100000).toFixed(1)}L`, color: '#38bdf8' },
            { label: 'Spent',       value: `₹${(totalSpent / 100000).toFixed(1)}L`,                           color: '#f87171' },
            { label: 'Remaining',   value: `₹${(totalRemaining / 100000).toFixed(1)}L`,                       color: '#34d399' },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i + 0.3 }}
              className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 text-center"
            >
              <div className="text-[0.6rem] text-slate-500 tracking-widest uppercase font-mono mb-1">{s.label}</div>
              <div className="font-display font-black text-xl tracking-wider" style={{ color: s.color }}>{s.value}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Team cards grid ── */}
        <div className="grid grid-cols-5 gap-5">
          {teams.map((team, i) => {
            const pct      = team.purse > 0 ? Math.round((team.remainingPurse / team.purse) * 100) : 0;
            const barColor = pct > 60 ? '#34d399' : pct > 30 ? '#f59e0b' : '#f87171';
            const glowCol  = pct > 60 ? 'rgba(52,211,153,0.2)' : pct > 30 ? 'rgba(245,158,11,0.2)' : 'rgba(248,113,113,0.2)';

            return (
              <GlowCard key={team.id} delay={i * 0.07} glowColor={glowCol} className="p-5">
                {/* Top bar */}
                <div className="h-0.5 rounded-full mb-5"
                  style={{ background: barColor, boxShadow: `0 0 12px ${barColor}` }} />

                {/* Logo */}
                <div className="flex justify-center mb-4">
                  <motion.div
                    whileHover={{ scale: 1.08, rotate: 2 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                    className="relative"
                  >
                    <div className="absolute inset-0 rounded-full blur-xl opacity-30"
                      style={{ background: barColor }} />
                    <img
                      src={team.logo}
                      alt={team.name}
                      className="relative object-contain"
                      style={{
                        width: 'clamp(80px, 8vw, 120px)',
                        height: 'clamp(70px, 7vw, 100px)',
                        filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))',
                      }}
                    />
                  </motion.div>
                </div>

                {/* Team name */}
                <div className="text-center mb-4">
                  <div className="font-display font-black tracking-widest uppercase text-slate-100 leading-tight"
                    style={{ fontSize: 'clamp(0.9rem, 1.4vw, 1.4rem)' }}>
                    {team.name}
                  </div>
                </div>

                {/* Purse */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[0.6rem] text-slate-500 tracking-widest uppercase font-mono">Remaining</span>
                    <span className="font-mono font-bold" style={{ color: barColor, fontSize: 'clamp(0.85rem, 1.1vw, 1.2rem)' }}>
                      ₹{team.remainingPurse.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: barColor, boxShadow: `0 0 8px ${barColor}` }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1, delay: i * 0.07 + 0.5, ease: 'easeOut' }}
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[0.58rem] text-slate-600 font-mono">{pct}%</span>
                    <span className="text-[0.58rem] text-slate-600 font-mono">₹{team.purse.toLocaleString()}</span>
                  </div>
                </div>

                {/* POC — dual player badge */}
                <div style={{ display: 'flex', gap: 6 }}>
                  {[
                    { label: 'POC 1', name: team.poc1, num: '1', color: barColor },
                    { label: 'POC 2', name: team.poc2, num: '2', color: barColor },
                  ].map((poc) => (
                    <div key={poc.label} style={{
                      flex: 1, minWidth: 0, position: 'relative', overflow: 'hidden',
                      borderRadius: 10,
                      background: `linear-gradient(135deg, ${poc.color}20 0%, ${poc.color}08 100%)`,
                      border: `1px solid ${poc.color}45`,
                      boxShadow: `0 0 12px ${poc.color}15, inset 0 1px 0 ${poc.color}20`,
                      padding: '7px 8px',
                    }}>
                      {/* Big watermark number */}
                      <div style={{
                        position: 'absolute', right: -2, bottom: -6,
                        fontFamily: "'Bebas Neue', 'Barlow Condensed', sans-serif",
                        fontSize: 48, fontWeight: 900, lineHeight: 1,
                        color: `${poc.color}18`,
                        userSelect: 'none', pointerEvents: 'none',
                      }}>{poc.num}</div>

                      {/* Label badge */}
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginBottom: 4 }}>
                        <div style={{
                          width: 4, height: 4, borderRadius: '50%',
                          background: poc.color,
                          boxShadow: `0 0 6px ${poc.color}`,
                          flexShrink: 0,
                        }} />
                        <span style={{
                          fontSize: 8, fontWeight: 800, letterSpacing: 2,
                          color: poc.color,
                          textTransform: 'uppercase', fontFamily: 'monospace',
                        }}>{poc.label}</span>
                      </div>

                      {/* Name — first name / surname split */}
                      {(() => {
                        const parts = (poc.name || '').trim().split(/\s+/);
                        const first   = parts[0] || '—';
                        const surname = parts.slice(1).join(' ');
                        return (
                          <div style={{ position: 'relative', lineHeight: 1.15 }}>
                            <div style={{
                              fontFamily: "'Barlow Condensed', sans-serif",
                              fontWeight: 900,
                              fontSize: 'clamp(0.72rem, 1vw, 0.95rem)',
                              color: '#f1f5f9',
                              textTransform: 'uppercase', letterSpacing: 1,
                            }}>{first}</div>
                            {surname && (
                              <div style={{
                                fontFamily: "'Barlow Condensed', sans-serif",
                                fontWeight: 700,
                                fontSize: 'clamp(0.65rem, 0.9vw, 0.85rem)',
                                color: `${poc.color}cc`,
                                textTransform: 'uppercase', letterSpacing: 1,
                              }}>{surname}</div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              </GlowCard>
            );
          })}
        </div>

        {teams.length === 0 && (
          <div className="text-center text-slate-500 font-mono text-sm mt-20">
            Loading teams…
          </div>
        )}
      </div>
    </AuroraBackground>
  );
};

export default DashboardPage;
