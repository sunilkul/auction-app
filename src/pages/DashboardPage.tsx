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

                {/* POC */}
                <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3 flex justify-between gap-3">
                  <div>
                    <div className="text-[0.55rem] text-slate-600 tracking-widest uppercase font-mono mb-1">POC 1</div>
                    <div className="text-[0.78rem] font-semibold text-slate-300 uppercase truncate max-w-[90px]">
                      {team.poc1 || '—'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[0.55rem] text-slate-600 tracking-widest uppercase font-mono mb-1">POC 2</div>
                    <div className="text-[0.78rem] font-semibold text-slate-300 uppercase truncate max-w-[90px]">
                      {team.poc2 || '—'}
                    </div>
                  </div>
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
