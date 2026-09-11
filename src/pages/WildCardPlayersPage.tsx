import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Player } from '../types';
import { AuroraBackground } from '../components/ui/AuroraBackground';
import { BackgroundBeams } from '../components/ui/BackgroundBeams';
import { GlowCard } from '../components/ui/GlowCard';
import { ShimmerText } from '../components/ui/ShimmerText';

const STAT_COLORS = ['#f59e0b', '#34d399', '#38bdf8', '#f87171', '#818cf8', '#fb923c'];

const formatStatLabel = (key: string) => key.replace(/[_-]/g, ' ');

const WildCardPlayersPage: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('http://localhost:8282/api/players/all-players')
      .then(response => {
        if (!response.ok) throw new Error('Failed to load wildcard players');
        return response.json();
      })
      .then((allPlayers: Player[]) => {
        setPlayers(allPlayers.filter(player => /wild/i.test(player.skillName ?? '')));
      })
      .catch(() => setError('Unable to load wildcard player stats.'))
      .finally(() => setLoading(false));
  }, []);

  const statKeys = useMemo(() => {
    const keys = new Set<string>();
    players.forEach(player => Object.keys(player.stats ?? {}).forEach(key => keys.add(key)));
    return Array.from(keys);
  }, [players]);

  return (
    <AuroraBackground className="min-h-screen">
      <BackgroundBeams />
      <div className="relative z-10 px-6 py-10 max-w-[1400px] mx-auto">
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="font-display font-black uppercase tracking-[0.1em] leading-none mb-5" style={{ fontSize: 'clamp(2.4rem, 5vw, 4rem)' }}>
            <ShimmerText>Wildcard Players</ShimmerText>
          </h1>
          <div className="flex gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}>
              <span className="font-mono font-black text-xl leading-none text-amber-400">{players.length}</span>
              <span className="text-[0.6rem] font-bold tracking-widest uppercase text-slate-500">Players</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)' }}>
              <span className="font-mono font-black text-xl leading-none text-sky-400">{statKeys.length}</span>
              <span className="text-[0.6rem] font-bold tracking-widest uppercase text-slate-500">Stats</span>
            </div>
          </div>
        </motion.div>

        {loading ? (
          <div className="py-20 text-center text-slate-500 font-mono text-sm uppercase tracking-widest">Loading wildcard stats...</div>
        ) : error ? (
          <div className="py-20 text-center text-rose-400 font-mono text-sm uppercase tracking-widest">{error}</div>
        ) : players.length === 0 ? (
          <div className="py-20 text-center text-slate-500 font-mono text-sm uppercase tracking-widest">No wildcard players found.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
            {players.map((player, index) => {
              const glowColor = `${STAT_COLORS[index % STAT_COLORS.length]}33`;
              return (
                <GlowCard key={player.id} delay={index * 0.07} glowColor={glowColor} className="p-5">
                  <div className="h-0.5 rounded-full mb-5" style={{ background: STAT_COLORS[index % STAT_COLORS.length], boxShadow: `0 0 12px ${STAT_COLORS[index % STAT_COLORS.length]}` }} />

                  <div className="flex items-start justify-between gap-3 mb-5">
                    {/* To hide names later, wrap this player-name block in {\/* ... *\/}. */}
                    <div>
                      <div className="text-[0.6rem] text-slate-500 tracking-widest uppercase font-mono mb-1">Wildcard Player</div>
                      {/*<div className="font-display font-black tracking-widest uppercase text-slate-100 leading-tight" style={{ fontSize: 'clamp(1.1rem, 1.6vw, 1.5rem)' }}>
                        {player.name}
                      </div>*/}
                    </div>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-mono font-black flex-shrink-0" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
                      {index + 1}
                    </div>
                  </div>

                  <div className="relative z-10 grid grid-cols-2 gap-2 mb-5">
                    {statKeys.map((key, statIndex) => {
                      const color = STAT_COLORS[statIndex % STAT_COLORS.length];
                      const value = player.stats?.[key];
                      return (
                        <div key={key} className="rounded-lg px-3 py-2" style={{ background: `${color}22`, border: `1px solid ${color}55`, borderTop: `2px solid ${color}`, boxShadow: `0 0 14px ${color}18`, backdropFilter: 'none' }}>
                          <div className="text-[0.55rem] font-bold tracking-widest uppercase font-mono truncate" style={{ color: `${color}cc` }}>{formatStatLabel(key)}</div>
                          <div className="font-display font-black text-lg" style={{ color, textShadow: `0 0 10px ${color}55` }}>{value === undefined || value === null ? '—' : value}</div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-white/5 pt-4">
                    <div className="text-[0.55rem] text-slate-500 tracking-widest uppercase font-mono mb-2">Description</div>
                    <p className="text-sm leading-relaxed text-slate-400 m-0">{player.description || '—'}</p>
                  </div>
                </GlowCard>
              );
            })}
          </div>
        )}
      </div>
    </AuroraBackground>
  );
};

export default WildCardPlayersPage;
