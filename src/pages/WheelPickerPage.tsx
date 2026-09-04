import React, { useEffect, useState } from 'react';
import { Team, Player } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { AuroraBackground } from '../components/ui/AuroraBackground';
import { GlowCard } from '../components/ui/GlowCard';
import { ShimmerText } from '../components/ui/ShimmerText';
import { BackgroundBeams } from '../components/ui/BackgroundBeams';
import { MovingBorderButton } from '../components/ui/MovingBorderButton';

interface Skill { id: number; skillName: string; }

const TEAM_COLORS = [
  '#f59e0b', '#38bdf8', '#818cf8', '#34d399', '#f87171',
  '#fb923c', '#a78bfa', '#2dd4bf', '#f472b6', '#60a5fa',
];

const WheelPickerPage: React.FC = () => {
  const [teams, setTeams]               = useState<Team[]>([]);
  const [players, setPlayers]           = useState<Player[]>([]);
  const [assignments, setAssignments]   = useState<{ [teamId: number]: Player[] }>({});
  const [skills, setSkills]             = useState<Skill[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<number | null>(null);
  const [loading, setLoading]           = useState(false);
  const [generating, setGenerating]     = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('http://localhost:8282/api/skills').then(r => r.json()),
      fetch('http://localhost:8282/api/teams/non-auction').then(r => r.json()),
    ]).then(([skillsData, teamsData]) => {
      setSkills(Array.isArray(skillsData) ? skillsData : []);
      setTeams(Array.isArray(teamsData) ? teamsData : []);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedSkill) { setPlayers([]); setAssignments({}); return; }
    setLoading(true);
    fetch(`http://localhost:8282/api/players/non-auctioned?skillId=${selectedSkill}`)
      .then(r => r.json())
      .then(data => {
        setPlayers(Array.isArray(data) ? data.filter((p: Player) => !p.teamId) : []);
        setAssignments({});
      })
      .finally(() => setLoading(false));
  }, [selectedSkill]);

  const shuffle = <T,>(arr: T[]): T[] => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const generateTeams = async () => {
    if (!teams.length || !players.length) return;
    setGenerating(true);
    await new Promise(r => setTimeout(r, 600));
    const shuffled = shuffle(players);
    const next: { [id: number]: Player[] } = {};
    teams.forEach(t => { next[t.id] = []; });
    shuffled.forEach((p, i) => next[teams[i % teams.length].id].push(p));
    setAssignments(next);
    setGenerating(false);
  };

  const canGenerate = !loading && !generating && teams.length > 0 && players.length > 0;
  const hasAssignments = Object.keys(assignments).length > 0;

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
            style={{ fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', color: '#f59e0b' }}
          >
            Team Generator
          </h1>
          <p className="text-slate-500 text-xs tracking-[0.4em] uppercase font-mono mt-3">
            Randomly assign players to teams
          </p>
        </motion.div>

        {/* ── Controls ── */}
        <motion.div
          className="flex justify-center items-center gap-4 mb-10 flex-wrap"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
        >
          {/* Skill selector */}
          <div className="relative">
            <select
              value={selectedSkill ?? ''}
              onChange={e => setSelectedSkill(Number(e.target.value) || null)}
              className="appearance-none rounded-xl px-5 py-2.5 pr-10 text-sm font-body font-semibold text-slate-100 outline-none transition-all cursor-pointer"
              style={{
                background: 'rgba(30,41,59,0.8)',
                border: '1px solid rgba(245,158,11,0.25)',
                boxShadow: '0 0 20px rgba(245,158,11,0.05)',
              }}
            >
              <option value="">Select Skill</option>
              {skills.map((s, idx) => (
                <option key={s.id ?? `skill-${idx}`} value={s.id?.toString() ?? ''}>{s.skillName}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-amber-400 text-xs">▼</div>
          </div>

          {/* Generate button */}
          <MovingBorderButton
            onClick={generateTeams}
            disabled={!canGenerate}
            className="px-8 py-2.5 text-base text-[#020617] bg-amber-400 hover:bg-amber-300"
            containerClassName="rounded-xl"
            borderColor="#f59e0b"
          >
            {generating ? (
              <span className="flex items-center gap-2">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                  className="inline-block"
                >
                  ◎
                </motion.span>
                Shuffling…
              </span>
            ) : (
              loading ? 'Loading…' : '⚡ Generate'
            )}
          </MovingBorderButton>

          {players.length > 0 && (
            <div className="text-slate-500 text-xs font-mono">
              {players.length} players · {teams.length} teams
            </div>
          )}
        </motion.div>

        {/* ── Team cards ── */}
        <AnimatePresence mode="popLayout">
          {hasAssignments && (
            <motion.div
              className="grid gap-5"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {teams.map((team, ti) => {
                const color      = TEAM_COLORS[ti % TEAM_COLORS.length];
                const teamBuyers = assignments[team.id] || [];

                return (
                  <motion.div
                    key={team.id}
                    initial={{ opacity: 0, y: 30, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: ti * 0.06, type: 'spring', stiffness: 200, damping: 25 }}
                  >
                    <GlowCard glowColor={`${color}30`} hover={false} className="p-4 h-full" delay={0}>
                      {/* Header stripe */}
                      <div className="h-0.5 rounded-full mb-4" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />

                      {/* Team name */}
                      <div className="font-display font-black text-lg text-center tracking-widest uppercase mb-3 leading-tight" style={{ color }}>
                        {team.name}
                      </div>

                      {/* Player count badge */}
                      <div
                        className="text-center mb-3 mx-auto w-fit px-3 py-0.5 rounded-full text-[0.6rem] font-mono font-bold tracking-widest uppercase"
                        style={{ background: `${color}15`, border: `1px solid ${color}30`, color }}
                      >
                        {teamBuyers.length} player{teamBuyers.length !== 1 ? 's' : ''}
                      </div>

                      {/* Players list */}
                      <ul className="space-y-1.5">
                        {teamBuyers.length === 0 ? (
                          <li className="text-slate-600 text-xs font-mono text-center py-4 italic">No players assigned</li>
                        ) : teamBuyers.map((p, pi) => (
                          <motion.li
                            key={p.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: pi * 0.03 + ti * 0.06 }}
                            className="text-slate-300 text-xs font-semibold text-center rounded-lg px-3 py-2"
                            style={{ background: `${color}08`, border: `1px solid ${color}15` }}
                          >
                            {p.name}
                          </motion.li>
                        ))}
                      </ul>
                    </GlowCard>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty states */}
        {teams.length === 0 && !loading && (
          <div className="text-center text-slate-500 font-mono text-sm mt-16">No teams found.</div>
        )}
        {selectedSkill && players.length === 0 && !loading && (
          <div className="text-center text-slate-500 font-mono text-sm mt-10">No unassigned players for this skill.</div>
        )}
        {!selectedSkill && !hasAssignments && (
          <motion.div
            className="text-center mt-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="text-6xl mb-4">⚡</div>
            <div className="text-slate-500 font-mono text-sm">Select a skill and hit Generate</div>
          </motion.div>
        )}
      </div>
    </AuroraBackground>
  );
};

export default WheelPickerPage;
