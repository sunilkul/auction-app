import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { Team, Player } from '../types';
import { AuroraBackground } from '../components/ui/AuroraBackground';
import { BackgroundBeams } from '../components/ui/BackgroundBeams';
import { ShimmerText } from '../components/ui/ShimmerText';

const SESSION_KEY = 'epl_randomizer_allocation';
const ASSIGNMENTS_KEY = 'epl_squad_forge_assignments';

interface PooledPlayer {
  playerId: number;
  playerName: string;
  aiRank: number;
  pscore: number;
}

interface SkillGroup {
  groupNumber: number;
  groupLabel: string;
  players: PooledPlayer[];
}

interface SkillCategory {
  skill: string;
  totalPlayers: number;
  groups: SkillGroup[];
}

interface DistributionResponse {
  skillGroups: SkillCategory[];
  summary: string;
}

const SKILL_COLORS: Record<string, string> = {
  BATSMAN: '#f59e0b',
  BOWLER: '#34d399',
  'ALL ROUNDER': '#818cf8',
  ALL_ROUNDER: '#818cf8',
  ALLROUNDER: '#818cf8',
  'ALL-ROUNDER': '#818cf8',
  'WICKET KEEPER': '#f87171',
  WK_BATSMAN: '#f87171',
  'WK-BATSMAN': '#f87171',
};

function skillColor(name: string): string {
  return SKILL_COLORS[(name || '').toUpperCase()] ?? '#94a3b8';
}

function normalizeSkill(s: string): string {
  return (s || '').toUpperCase().replace(/[-\s_]/g, '');
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function RandomizerPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [skillFilter, setSkillFilter] = useState('ALL');
  const [distribution, setDistribution] = useState<DistributionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [randomizing, setRandomizing] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<{ skill: string; groupNumber: number } | null>(null);
  const [distributionResult, setDistributionResult] = useState<{ playerName: string; teamName: string; teamLogo: string; playerId: number; teamId: number }[] | null>(null);
  const [distributeKey, setDistributeKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [savedAssignments, setSavedAssignments] = useState<Map<number, { teamName: string; teamLogo: string }>>(new Map());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDistributionResult(prev => { if (prev) { setSaveStatus('idle'); return null; } setExpandedGroup(null); return null; });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.skillGroups) setDistribution(parsed);
        else sessionStorage.removeItem(SESSION_KEY);
      } catch { sessionStorage.removeItem(SESSION_KEY); }
    }
    const savedA = sessionStorage.getItem(ASSIGNMENTS_KEY);
    if (savedA) {
      try {
        const entries: [number, { teamName: string; teamLogo: string }][] = JSON.parse(savedA);
        setSavedAssignments(new Map(entries));
      } catch { sessionStorage.removeItem(ASSIGNMENTS_KEY); }
    }
    Promise.all([
      fetch('http://localhost:8282/api/teams').then(r => r.json()),
      fetch('http://localhost:8282/api/players/pooled').then(r => r.json()),
    ]).then(([t, p]: [Team[], Player[]]) => {
      setTeams(t);
      setPlayers(p);
    }).finally(() => setLoading(false));
  }, []);

  const distribute = async () => {
    setRandomizing(true);
    setRetryCount(0);
    setError(null);

    let cancelled = false;
    let currentController: AbortController | null = null;
    cancelRef.current = () => { cancelled = true; currentController?.abort(); };

    let attempt = 0;
    while (!cancelled) {
      currentController = new AbortController();
      const timeout = setTimeout(() => currentController!.abort(), 5 * 60 * 1000);
      try {
        const res = await fetch('http://localhost:8282/api/auction/distribute-pooled-players', { signal: currentController.signal });
        clearTimeout(timeout);
        if (res.status === 500) {
          setRetryCount(++attempt);
          await new Promise<void>(resolve => setTimeout(resolve, 2000));
          continue;
        }
        if (!res.ok) { setError(`Server returned ${res.status}`); break; }
        const data: DistributionResponse = await res.json();
        setDistribution(data);
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
        break;
      } catch (e) {
        clearTimeout(timeout);
        if (cancelled) break;
        if (e instanceof Error && e.name === 'AbortError') {
          setError('Request timed out after 5 minutes');
        } else {
          setError(e instanceof Error ? e.message : 'Failed to distribute players');
        }
        break;
      }
    }

    cancelRef.current = null;
    setRandomizing(false);
    setRetryCount(0);
  };

  const cancelDistribute = () => cancelRef.current?.();

  const clear = () => {
    setDistribution(null);
    setError(null);
    setSavedAssignments(new Map());
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(ASSIGNMENTS_KEY);
  };

  const handleDistribute = () => {
    if (!expandedGroup || !distribution || teams.length === 0) return;
    const skillCat = distribution.skillGroups.find(s => s.skill === expandedGroup.skill);
    const group = skillCat?.groups.find(g => g.groupNumber === expandedGroup.groupNumber);
    if (!group) return;
    const shuffledTeams = shuffleArray(teams);
    const count = Math.min(group.players.length, shuffledTeams.length);
    setDistributeKey(k => k + 1);
    setSaveStatus('idle');
    setDistributionResult(
      Array.from({ length: count }, (_, i) => ({
        playerName: group.players[i].playerName,
        teamName: shuffledTeams[i].name,
        teamLogo: shuffledTeams[i].logo,
        playerId: group.players[i].playerId,
        teamId: shuffledTeams[i].id,
      }))
    );
  };

  const handleSave = async () => {
    if (!distributionResult || saving) return;
    setSaving(true);
    setSaveStatus('idle');
    try {
      const res = await fetch('http://localhost:8282/api/players/bulk-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(distributionResult.map(r => ({ playerId: r.playerId, teamId: r.teamId }))),
      });
      if (!res.ok) throw new Error('Save failed');
      setSaveStatus('success');
      setSavedAssignments(prev => {
        const next = new Map(prev);
        distributionResult.forEach(r => next.set(r.playerId, { teamName: r.teamName, teamLogo: r.teamLogo }));
        sessionStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify([...next.entries()]));
        return next;
      });
      setDistributionResult(null);
      setExpandedGroup(null);
    } catch {
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const exportToExcel = () => {
    if (!distribution) return;
    const wb = XLSX.utils.book_new();

    const summaryRows: (string | number)[][] = [
      ['Skill', 'Total Players', 'Groups'],
      ...distribution.skillGroups.map(sc => [sc.skill, sc.totalPlayers, sc.groups.length]),
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
    summarySheet['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 8 }];
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

    for (const skillCat of distribution.skillGroups) {
      const rows: (string | number)[][] = [];
      for (const group of skillCat.groups) {
        rows.push([group.groupLabel]);
        rows.push(['Rank', 'Player Name']);
        for (const p of group.players) {
          rows.push([p.aiRank, p.playerName]);
        }
        rows.push([]);
      }
      const sheet = XLSX.utils.aoa_to_sheet(rows);
      sheet['!cols'] = [{ wch: 6 }, { wch: 28 }];
      const sheetName = skillCat.skill.replace(/[\\/:*?[\]]/g, '').slice(0, 31);
      XLSX.utils.book_append_sheet(wb, sheet, sheetName);
    }

    XLSX.writeFile(wb, 'EPL_Skill_Groups.xlsx');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={{ width: 40, height: 40, border: '3px solid #f59e0b33', borderTopColor: '#f59e0b', borderRadius: '50%' }}
        />
      </div>
    );
  }

  const hasDistrib = distribution !== null;
  const skills = hasDistrib
    ? distribution!.skillGroups.map(sc => sc.skill)
    : [...new Set(players.map(p => p.skillName))].filter(Boolean);

  const poolBySkill: Record<string, Player[]> = {};
  if (!hasDistrib) {
    for (const p of players) {
      const s = p.skillName || 'OTHER';
      if (!poolBySkill[s]) poolBySkill[s] = [];
      poolBySkill[s].push(p);
    }
  }

  const totalGrouped = hasDistrib
    ? distribution!.skillGroups.reduce((sum, sc) => sum + sc.totalPlayers, 0)
    : 0;
  const filteredSkillGroups = hasDistrib
    ? (skillFilter === 'ALL'
      ? distribution!.skillGroups
      : distribution!.skillGroups.filter(sc => normalizeSkill(sc.skill) === normalizeSkill(skillFilter)))
    : [];

  return (
    <AuroraBackground>
      <BackgroundBeams />
      <div className="relative z-10 min-h-screen flex flex-col">

        {/* Page header */}
        <div style={{ padding: '26px clamp(12px, 3vw, 36px) 18px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <ShimmerText as="h1" className="font-display text-[clamp(2rem,3vw,2.8rem)] font-black tracking-[3px] uppercase leading-none">
                  Squad Forge
                </ShimmerText>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '4px 10px', borderRadius: 20,
                  background: 'linear-gradient(135deg, rgba(129,140,248,0.18), rgba(167,139,250,0.12))',
                  border: '1px solid rgba(129,140,248,0.35)',
                  boxShadow: '0 0 12px rgba(129,140,248,0.2)',
                }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#818cf8', boxShadow: '0 0 6px #818cf8', animation: 'pulse 2s infinite' }} />
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, fontWeight: 700, color: '#a5b4fc', letterSpacing: 1.5 }}>
                    STATS BASED
                  </span>
                </div>
              </div>
              <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: '#475569', letterSpacing: 2, marginTop: 8 }}>
                STATS-BASED RANKING · DRAFT-READY PLAYER POOLS
              </p>
            </div>
            <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
              {[
                { label: 'TEAMS', value: teams.length, color: '#f1f5f9' },
                ...(!hasDistrib ? [{ label: 'POOLED', value: players.length, color: '#94a3b8' }] : []),
                ...(hasDistrib ? [
                  { label: 'SKILLS', value: distribution!.skillGroups.length, color: '#818cf8' },
                  { label: 'GROUPED', value: totalGrouped, color: '#34d399' },
                ] : []),
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Bebas Neue', 'Barlow Condensed', sans-serif", fontSize: 30, fontWeight: 900, color: s.color, lineHeight: 1 }}>
                    {s.value}
                  </div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: '#475569', letterSpacing: 1.5, marginTop: 2 }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Controls bar */}
        <div style={{ padding: '12px clamp(12px, 3vw, 36px)', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 3, background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 3, border: '1px solid rgba(255,255,255,0.07)' }}>
            {['ALL', ...skills].map(s => {
              const active = skillFilter === s;
              const c = s === 'ALL' ? '#94a3b8' : skillColor(s);
              return (
                <button key={s} onClick={() => setSkillFilter(s)} style={{
                  padding: '5px 12px', borderRadius: 6,
                  background: active ? `${c}20` : 'transparent',
                  border: active ? `1px solid ${c}50` : '1px solid transparent',
                  color: active ? c : '#475569',
                  fontFamily: "'Space Mono', monospace", fontSize: 9, fontWeight: 700,
                  letterSpacing: 1.5, textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.15s',
                }}>
                  {s === 'ALL ROUNDER' ? 'ALLROUNDER' : s}
                </button>
              );
            })}
          </div>

          <div style={{ flex: 1 }} />

          {error && (
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#f87171', letterSpacing: 1 }}>
              ✕ {error}
            </span>
          )}

          {hasDistrib && (
            <>
              <button onClick={exportToExcel} style={{
                padding: '6px 14px', borderRadius: 7,
                background: '#34d39915', border: '1px solid #34d39940',
                color: '#34d399', fontFamily: "'Space Mono', monospace", fontSize: 9,
                fontWeight: 700, letterSpacing: 1, cursor: 'pointer', transition: 'all 0.15s',
              }}>
                EXPORT XLSX
              </button>
              <button onClick={clear} style={{
                padding: '6px 14px', borderRadius: 7,
                background: '#f8717115', border: '1px solid #f8717140',
                color: '#f87171', fontFamily: "'Space Mono', monospace", fontSize: 9,
                fontWeight: 700, letterSpacing: 1, cursor: 'pointer', transition: 'all 0.15s',
              }}>
                CLEAR
              </button>
            </>
          )}

          <motion.button
            onClick={distribute}
            disabled={randomizing}
            whileHover={{ scale: !randomizing ? 1.03 : 1 }}
            whileTap={{ scale: !randomizing ? 0.97 : 1 }}
            style={{
              padding: '8px 26px', borderRadius: 9, border: 'none',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#020617',
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 16, fontWeight: 900,
              letterSpacing: 2, textTransform: 'uppercase',
              cursor: randomizing ? 'not-allowed' : 'pointer',
              opacity: randomizing ? 0.65 : 1, transition: 'opacity 0.15s',
            }}
          >
            {randomizing
              ? retryCount > 0 ? `RETRYING (${retryCount})...` : 'CREATING...'
              : 'CREATE GROUPS'}
          </motion.button>
          {randomizing && (
            <motion.button
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={cancelDistribute}
              style={{
                padding: '8px 18px', borderRadius: 9,
                border: '1px solid #f8717150',
                background: '#f8717112',
                color: '#f87171',
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 16, fontWeight: 900,
                letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer',
              }}
            >
              CANCEL
            </motion.button>
          )}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, padding: '20px 36px' }}>

          {/* Distribution results */}
          <AnimatePresence>
            {hasDistrib && (
              <motion.div
                key="distribution"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.3 }}
              >
                {/* Summary bar */}
                {distribution!.summary && (
                  <div style={{
                    marginBottom: 16, padding: '12px 16px', borderRadius: 10,
                    background: 'rgba(129,140,248,0.07)', border: '1px solid rgba(129,140,248,0.2)',
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                  }}>
                    <div style={{ marginTop: 1, flexShrink: 0, width: 6, height: 6, borderRadius: '50%', background: '#818cf8', boxShadow: '0 0 8px #818cf8' }} />
                    <div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, fontWeight: 700, color: '#a5b4fc', letterSpacing: 2, marginBottom: 5 }}>
                        STATS SUMMARY
                      </div>
                      <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#94a3b8', letterSpacing: 0.5, lineHeight: 1.7, margin: 0 }}>
                        {distribution!.summary}
                      </p>
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, fontWeight: 700, color: '#94a3b8', letterSpacing: 2 }}>
                    SKILL GROUPS
                  </span>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: '#34d399', letterSpacing: 1 }}>
                    ● SAVED TO SESSION
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {filteredSkillGroups.map((skillCat, si) => {
                    const sc = skillColor(skillCat.skill);
                    return (
                      <motion.div
                        key={skillCat.skill}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: si * 0.06 }}
                      >
                        {/* Skill section header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: sc, boxShadow: `0 0 8px ${sc}` }} />
                          <span style={{
                            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900,
                            fontSize: 20, color: '#f1f5f9', textTransform: 'uppercase', letterSpacing: 2,
                          }}>
                            {skillCat.skill}
                          </span>
                          <span style={{
                            fontFamily: "'Space Mono', monospace", fontSize: 8, color: sc,
                            background: `${sc}15`, border: `1px solid ${sc}35`,
                            borderRadius: 4, padding: '2px 7px', letterSpacing: 1,
                          }}>
                            {skillCat.totalPlayers} PLAYERS
                          </span>
                          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: '#475569', letterSpacing: 1 }}>
                            {skillCat.groups.length} {skillCat.groups.length === 1 ? 'GROUP' : 'GROUPS'}
                          </span>
                          <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${sc}30 0%, transparent 100%)`, marginLeft: 4 }} />
                        </div>

                        {/* Group cards — deck style */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16 }}>
                          {skillCat.groups.map((group, gi) => {
                            const isExpanded = expandedGroup?.skill === skillCat.skill && expandedGroup?.groupNumber === group.groupNumber;
                            const assignedCount = group.players.filter(p => savedAssignments.has(p.playerId)).length;
                            const allAssigned = assignedCount === group.players.length && assignedCount > 0;
                            return (
                              <motion.div
                                key={group.groupNumber}
                                layoutId={`group-${skillCat.skill}-${group.groupNumber}`}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: si * 0.06 + gi * 0.04, layout: { type: 'spring', damping: 28, stiffness: 320 } }}
                                whileHover={!isExpanded ? { y: -7, boxShadow: `0 22px 48px rgba(0,0,0,0.65), 0 0 0 1px ${sc}55` } : {}}
                                onClick={() => !isExpanded && setExpandedGroup({ skill: skillCat.skill, groupNumber: group.groupNumber })}
                                style={{
                                  background: 'rgba(13,22,39,0.96)', borderRadius: 10,
                                  border: `1px solid ${sc}30`, overflow: 'hidden',
                                  cursor: 'pointer',
                                  boxShadow: `4px 4px 0 ${sc}14, 8px 8px 0 ${sc}08, 0 4px 20px rgba(0,0,0,0.45)`,
                                  visibility: isExpanded ? 'hidden' : 'visible',
                                }}
                              >
                                {/* Group header */}
                                <div style={{
                                  padding: '9px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                  background: `${sc}12`, borderBottom: `1px solid ${sc}28`,
                                }}>
                                  <span style={{
                                    fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700,
                                    color: sc, letterSpacing: 1.5, textTransform: 'uppercase',
                                  }}>
                                    GROUP {group.groupNumber}
                                  </span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                    {assignedCount > 0 && (
                                      <span style={{
                                        fontFamily: "'Space Mono', monospace", fontSize: 9,
                                        color: allAssigned ? '#34d399' : '#f59e0b',
                                        background: allAssigned ? '#34d39918' : '#f59e0b18',
                                        border: `1px solid ${allAssigned ? '#34d39940' : '#f59e0b40'}`,
                                        borderRadius: 4, padding: '2px 7px',
                                      }}>
                                        {allAssigned ? '✓ ASSIGNED' : `${assignedCount}/${group.players.length}`}
                                      </span>
                                    )}
                                    <span style={{
                                      fontFamily: "'Space Mono', monospace", fontSize: 9, color: sc,
                                      background: `${sc}18`, border: `1px solid ${sc}35`,
                                      borderRadius: 4, padding: '2px 7px',
                                    }}>
                                      {group.players.length}
                                    </span>
                                    <span style={{ fontSize: 10, color: `${sc}60` }}>↗</span>
                                  </div>
                                </div>

                                {/* Players */}
                                <div style={{ padding: '3px 0' }}>
                                  {group.players.map((player, rowIdx) => {
                                    //const isZero = !player.pscore;
                                    return (
                                      <div key={player.playerId} style={{
                                        display: 'flex', alignItems: 'center', gap: 10,
                                        padding: '7px 14px',
                                        background: rowIdx % 2 !== 0 ? 'rgba(255,255,255,0.018)' : 'transparent',                                        
                                      }}>
                                        <span style={{
                                          fontFamily: "'Bebas Neue', 'Barlow Condensed', sans-serif",
                                          fontSize: 13, color: `${sc}90`, width: 24,
                                          textAlign: 'right', flexShrink: 0, lineHeight: 1,                                          
                                        }}>
                                          {player.aiRank}
                                        </span>
                                        <span style={{
                                          flex: 1, minWidth: 0,
                                          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
                                          fontSize: 16, color: '#f1f5f9', textTransform: 'uppercase',
                                          letterSpacing: 0.5, lineHeight: 1,
                                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                        }}>
                                          {player.playerName}
                                        </span>
                                        {/*<span style={{
                                          fontFamily: "'Space Mono', monospace", fontSize: 9,
                                          color: sc, background: `${sc}15`, border: `1px solid ${sc}35`,
                                          borderRadius: 4, padding: '2px 6px', letterSpacing: 0.8,
                                          whiteSpace: 'nowrap', flexShrink: 0,
                                        }}>
                                         {Number(player.pscore || 0).toFixed(0)}
                                        </span>*/}
                                        {savedAssignments.has(player.playerId) && (() => {
                                          const a = savedAssignments.get(player.playerId)!;
                                          return (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                                              {a.teamLogo && <img src={a.teamLogo} alt="" style={{ width: 16, height: 16, objectFit: 'contain' }} />}
                                              <span style={{
                                                fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
                                                fontSize: 11, color: '#34d399', textTransform: 'uppercase',
                                                letterSpacing: 0.5, whiteSpace: 'nowrap',
                                              }}>{a.teamName}</span>
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pooled players landing (before group creation) */}
          {!hasDistrib && players.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              {(skillFilter === 'ALL' ? Object.keys(poolBySkill) : Object.keys(poolBySkill).filter(s => normalizeSkill(s) === normalizeSkill(skillFilter))).map((skill, si) => {
                const sc = skillColor(skill);
                const skillPlayers = poolBySkill[skill];
                return (
                  <div key={skill} style={{ marginBottom: 32 }}>
                    {/* Skill section header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                      <div style={{ width: 3, height: 20, borderRadius: 2, background: sc, boxShadow: `0 0 10px ${sc}` }} />
                      <span style={{
                        fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800,
                        fontSize: 'clamp(0.85rem, 1.2vw, 1.05rem)', letterSpacing: 3,
                        color: sc, textTransform: 'uppercase',
                      }}>{skill}</span>
                      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${sc}40, transparent)` }} />
                      <span style={{
                        fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: 2,
                        color: '#475569',
                      }}>{skillPlayers.length} PLAYERS</span>
                    </div>
                    {/* Player grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                      gap: 4,
                    }}>
                      {skillPlayers.map((player, idx) => (
                        <motion.div
                          key={player.id}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: si * 0.03 + idx * 0.008 }}
                          style={{
                            background: idx % 2 === 0 ? 'rgba(255,255,255,0.018)' : 'transparent',
                            borderLeft: `2px solid ${sc}50`,
                            borderRadius: '0 5px 5px 0',
                            padding: '7px 12px 7px 10px',
                            display: 'flex', alignItems: 'center', gap: 10,
                          }}
                        >
                          <span style={{
                            fontFamily: "'Bebas Neue', sans-serif", fontSize: 12,
                            color: `${sc}50`, width: 22, textAlign: 'right',
                            flexShrink: 0, lineHeight: 1,
                          }}>{idx + 1}</span>
                          <span style={{
                            flex: 1, minWidth: 0,
                            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
                            fontSize: 15, color: '#e2e8f0',
                            textTransform: 'uppercase', letterSpacing: 0.5, lineHeight: 1,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>{player.name}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                            {player.isNewPlayer === 1 && (
                              <span style={{
                                fontFamily: "'Space Mono', monospace", fontSize: 7,
                                color: '#f59e0b', background: '#f59e0b18',
                                border: '1px solid #f59e0b35', borderRadius: 3,
                                padding: '1px 4px', letterSpacing: 1,
                              }}>NEW</span>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>

      {/* Expanded group modal */}
      <AnimatePresence>
        {expandedGroup && distribution && (() => {
          const skillCat = distribution.skillGroups.find(s => s.skill === expandedGroup.skill);
          const group = skillCat?.groups.find(g => g.groupNumber === expandedGroup.groupNumber);
          if (!skillCat || !group) return null;
          const sc = skillColor(skillCat.skill);
          return (
            <>
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                onClick={() => setExpandedGroup(null)}
                style={{
                  position: 'fixed', inset: 0, zIndex: 100,
                  background: 'rgba(2,6,23,0.82)',
                  backdropFilter: 'blur(18px)',
                  WebkitBackdropFilter: 'blur(18px)',
                }}
              />
              <div style={{
                position: 'fixed', inset: 0, zIndex: 101,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none',
              }}>
                <motion.div
                  layoutId={`group-${expandedGroup.skill}-${expandedGroup.groupNumber}`}
                  transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                  style={{
                    pointerEvents: 'all',
                    background: '#0a1628',
                    borderRadius: 16,
                    border: `1px solid ${sc}45`,
                    boxShadow: `0 40px 100px rgba(0,0,0,0.9), 0 0 0 1px ${sc}20, 0 0 80px ${sc}12`,
                    width: 'min(500px, calc(100vw - 24px))',
                    maxHeight: '82vh',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                  }}
                >
                  {/* Modal header */}
                  <div style={{
                    padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: `${sc}10`, borderBottom: `1px solid ${sc}30`, flexShrink: 0,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 9, height: 9, borderRadius: '50%', background: sc, boxShadow: `0 0 12px ${sc}` }} />
                      <span style={{
                        fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900,
                        fontSize: 22, color: '#f1f5f9', textTransform: 'uppercase', letterSpacing: 2,
                      }}>
                        {skillCat.skill}
                      </span>
                      <span style={{
                        fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700,
                        color: sc, letterSpacing: 1.5, textTransform: 'uppercase',
                        background: `${sc}18`, border: `1px solid ${sc}40`,
                        borderRadius: 5, padding: '3px 10px',
                      }}>
                        GROUP {group.groupNumber}
                      </span>
                    </div>
                    <button
                      onClick={() => setExpandedGroup(null)}
                      style={{
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)',
                        borderRadius: 6, padding: '4px 11px', cursor: 'pointer',
                        color: '#94a3b8', fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: 1,
                      }}
                    >
                      ESC
                    </button>
                  </div>

                  {/* Sub-header */}
                  <div style={{
                    padding: '8px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)',
                    flexShrink: 0,
                  }}>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#475569', letterSpacing: 1.5 }}>
                      {group.players.length} PLAYERS · RANKED BY STATS
                    </span>
                  </div>

                  {/* Player list */}
                  <div style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
                    {group.players.map((player, rowIdx) => {
                      return (
                        <div key={player.playerId} style={{
                          display: 'flex', alignItems: 'center', gap: 14,
                          padding: '10px 20px',
                          background: rowIdx % 2 !== 0 ? 'rgba(255,255,255,0.022)' : 'transparent',
                        }}>
                          <span style={{
                            fontFamily: "'Bebas Neue', 'Barlow Condensed', sans-serif",
                            fontSize: 20, color: `${sc}70`, width: 30,
                            textAlign: 'right', flexShrink: 0, lineHeight: 1,
                          }}>
                            {player.aiRank}
                          </span>
                          <div style={{ width: 1, height: 18, background: `${sc}28`, flexShrink: 0 }} />
                          <span style={{
                            flex: 1, minWidth: 0,
                            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
                            fontSize: 19, color: '#f1f5f9', textTransform: 'uppercase',
                            letterSpacing: 0.5, lineHeight: 1,
                          }}>
                            {player.playerName}
                          </span>
                          {savedAssignments.has(player.playerId) && (() => {
                            const a = savedAssignments.get(player.playerId)!;
                            return (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                {a.teamLogo && <img src={a.teamLogo} alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} />}
                                <span style={{
                                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800,
                                  fontSize: 15, color: '#34d399', textTransform: 'uppercase',
                                  letterSpacing: 0.5, whiteSpace: 'nowrap',
                                }}>{a.teamName}</span>
                              </div>
                            );
                          })()}
                          </div>
                      );
                    })}
                  </div>

                  {/* Distribute footer */}
                  <div style={{
                    padding: '12px 20px', borderTop: `1px solid ${sc}20`,
                    flexShrink: 0, display: 'flex', justifyContent: 'flex-end',
                    background: 'rgba(255,255,255,0.01)',
                  }}>
                    <motion.button
                      onClick={handleDistribute}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      style={{
                        padding: '9px 28px', borderRadius: 8, border: 'none',
                        background: `linear-gradient(135deg, ${sc}, ${sc}bb)`,
                        color: '#020617',
                        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 16, fontWeight: 900,
                        letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer',
                      }}
                    >
                      DISTRIBUTE
                    </motion.button>
                  </div>
                </motion.div>
              </div>
            </>
          );
        })()}
      </AnimatePresence>

      {/* Distribution result overlay */}
      <AnimatePresence>
        {distributionResult && expandedGroup && (() => {
          const sc = skillColor(expandedGroup.skill);
          return (
            <>
              <motion.div
                key="dist-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                onClick={() => { setDistributionResult(null); setSaveStatus('idle'); }}
                style={{
                  position: 'fixed', inset: 0, zIndex: 110,
                  background: 'rgba(2,6,23,0.78)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                }}
              />
              <div style={{
                position: 'fixed', inset: 0, zIndex: 111,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none',
              }}>
                <motion.div
                  key="dist-results"
                  initial={{ opacity: 0, scale: 0.93, y: 18 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.93, y: 18 }}
                  transition={{ type: 'spring', damping: 26, stiffness: 300 }}
                  style={{
                    pointerEvents: 'all',
                    background: '#0a1628', borderRadius: 16,
                    border: `1px solid ${sc}45`,
                    boxShadow: `0 40px 100px rgba(0,0,0,0.9), 0 0 80px ${sc}12`,
                    width: 'min(560px, calc(100vw - 24px))', maxHeight: '80vh',
                    display: 'flex', flexDirection: 'column', overflow: 'hidden',
                  }}
                >
                  {/* Header */}
                  <div style={{
                    padding: '16px 22px', background: `${sc}10`,
                    borderBottom: `1px solid ${sc}28`, flexShrink: 0,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: sc, boxShadow: `0 0 10px ${sc}` }} />
                      <span style={{
                        fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900,
                        fontSize: 21, color: '#f1f5f9', textTransform: 'uppercase', letterSpacing: 2,
                      }}>
                        TEAM ASSIGNMENT
                      </span>
                    </div>
                    <div style={{ marginTop: 5, fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#475569', letterSpacing: 1.5 }}>
                      {expandedGroup.skill.toUpperCase()} · GROUP {expandedGroup.groupNumber} · {distributionResult.length} PLAYERS ASSIGNED
                    </div>
                  </div>

                  {/* Player → Team rows */}
                  <div style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
                    {distributionResult.map((pair, idx) => (
                      <motion.div
                        key={`${distributeKey}-${idx}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.035 }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 14,
                          padding: '11px 22px',
                          background: idx % 2 !== 0 ? 'rgba(255,255,255,0.022)' : 'transparent',
                          borderBottom: '1px solid rgba(255,255,255,0.03)',
                        }}
                      >
                        <span style={{
                          fontFamily: "'Bebas Neue', 'Barlow Condensed', sans-serif",
                          fontSize: 15, color: `${sc}55`, width: 22, textAlign: 'right', flexShrink: 0,
                        }}>
                          {idx + 1}
                        </span>
                        <span style={{
                          flex: 1, minWidth: 0,
                          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
                          fontSize: 18, color: '#f1f5f9', textTransform: 'uppercase',
                          letterSpacing: 0.5, lineHeight: 1,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {pair.playerName}
                        </span>
                        <span style={{ color: `${sc}60`, fontSize: 16, flexShrink: 0 }}>→</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0, minWidth: 170 }}>
                          {pair.teamLogo && (
                            <img src={pair.teamLogo} alt="" style={{ width: 24, height: 24, objectFit: 'contain', flexShrink: 0 }} />
                          )}
                          <span style={{
                            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800,
                            fontSize: 16, color: sc, textTransform: 'uppercase',
                            letterSpacing: 1, lineHeight: 1,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {pair.teamName}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div style={{
                    padding: '14px 22px', borderTop: '1px solid rgba(255,255,255,0.06)',
                    flexShrink: 0, display: 'flex', justifyContent: 'flex-end', gap: 10,
                    background: 'rgba(255,255,255,0.01)',
                  }}>
                    <motion.button
                      onClick={handleDistribute}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      style={{
                        padding: '9px 28px', borderRadius: 8,
                        border: `1px solid ${sc}40`,
                        background: `${sc}15`,
                        color: sc,
                        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 16, fontWeight: 900,
                        letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer',
                      }}
                    >
                      REDISTRIBUTE
                    </motion.button>
                    <motion.button
                      onClick={handleSave}
                      disabled={saving || saveStatus === 'success'}
                      whileHover={saving || saveStatus === 'success' ? {} : { scale: 1.03 }}
                      whileTap={saving || saveStatus === 'success' ? {} : { scale: 0.97 }}
                      style={{
                        padding: '9px 28px', borderRadius: 8,
                        border: `1px solid ${saveStatus === 'success' ? '#34d39940' : saveStatus === 'error' ? '#f8717140' : '#f59e0b40'}`,
                        background: saveStatus === 'success' ? '#34d39915' : saveStatus === 'error' ? '#f8717115' : '#f59e0b15',
                        color: saveStatus === 'success' ? '#34d399' : saveStatus === 'error' ? '#f87171' : '#f59e0b',
                        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 16, fontWeight: 900,
                        letterSpacing: 2, textTransform: 'uppercase',
                        cursor: saving || saveStatus === 'success' ? 'default' : 'pointer',
                        opacity: saving ? 0.7 : 1, transition: 'all 0.2s',
                      }}
                    >
                      {saving ? 'SAVING...' : saveStatus === 'success' ? 'SAVED ✓' : saveStatus === 'error' ? 'RETRY' : 'SAVE'}
                    </motion.button>
                    <motion.button
                      onClick={() => { setDistributionResult(null); setSaveStatus('idle'); }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      style={{
                        padding: '9px 32px', borderRadius: 8,
                        border: '1px solid rgba(255,255,255,0.15)',
                        background: 'rgba(255,255,255,0.06)',
                        color: '#f1f5f9',
                        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 16, fontWeight: 900,
                        letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer',
                      }}
                    >
                      CLOSE
                    </motion.button>
                  </div>
                </motion.div>
              </div>
            </>
          );
        })()}
      </AnimatePresence>
    </AuroraBackground>
  );
}
