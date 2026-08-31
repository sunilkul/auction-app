import React, { useEffect, useRef, useState } from 'react';
import { Player, Team } from '../types';
import FireworksCanvas from '../components/FireworksCanvas';

interface Bid {
  playerId: number;
  teamId: number;
  amount: number;
  time: string;
}

const BID_INCREMENT = 2000;
const BG = 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(235,242,252,0.92) 100%), url(/iStock-2163573192_web.jpg) center/cover no-repeat fixed';

const AuctionPage: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [recentSoldPlayers, setRecentSoldPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [currentBid, setCurrentBid] = useState<number>(0);
  const [currentBidTeam, setCurrentBidTeam] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [auctionPlayers, setAuctionPlayers] = useState<Player[]>([]);
  const [teamPurse, setTeamPurse] = useState<{ [teamId: number]: number }>({});
  const [selectedSkill, setSelectedSkill] = useState<number>(0);
  const [selectedGroupCode, setSelectedGroupCode] = useState('');
  interface Skill { id: number; skillName: string; }
  interface SkillGroup { skillId: number; groupCode: string; }
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillGroups, setSkillGroups] = useState<SkillGroup[]>([]);
  const [auctionStarted, setAuctionStarted] = useState(false);
  const [soldAnim, setSoldAnim] = useState<{ playerName: string; teamName: string; teamLogo: string; amount: number } | null>(null);
  const [bidDownPending, setBidDownPending] = useState<number | null>(null);
  const [bidDownPassword, setBidDownPassword] = useState('');
  const [bidDownPwError, setBidDownPwError] = useState('');
  const [flyAnim, setFlyAnim] = useState<{ x: number; y: number; tx: number; ty: number; amount: number; id: number } | null>(null);
  const currentBidRef = useRef<HTMLDivElement>(null);
  const flyIdRef = useRef(0);

  const [showPlayerIntro, setShowPlayerIntro] = useState(false);
  const [introExiting, setIntroExiting] = useState(false);
  const [introPlayer, setIntroPlayer] = useState<Player | null>(null);
  const introShownForRef = useRef<number | null>(null);
  const [openDropdown, setOpenDropdown] = useState<'group' | null>(null);
  const [showAuctionIntro, setShowAuctionIntro] = useState(false);
  const [auctionIntroExiting, setAuctionIntroExiting] = useState(false);
  const auctionIntroTimers = useRef<number[]>([]);

function shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  useEffect(() => {
    fetch('http://localhost:8282/api/players')
      .then(res => res.json())
      .then((data: any) => {
        if (Array.isArray(data)) setPlayers(data);
        else if (data && typeof data === 'object') setPlayers([data]);
        else setPlayers([]);
      })
      .catch(err => { setPlayers([]); console.error('Failed to fetch players:', err); });

    fetch('http://localhost:8282/api/players/last-sold')
      .then(res => res.json())
      .then((data: unknown) => {
        if (Array.isArray(data)) setRecentSoldPlayers(data as Player[]);
        else if (data && typeof data === 'object' && Array.isArray((data as { data?: unknown[] }).data)) {
          setRecentSoldPlayers((data as { data: Player[] }).data);
        } else setRecentSoldPlayers([]);
      })
      .catch(err => { setRecentSoldPlayers([]); console.error('Failed to fetch recently sold players:', err); });

    fetch('http://localhost:8282/api/teams')
      .then(res => res.json())
      .then((data: Team[]) => {
        setTeams(data);
        setTeamPurse(Object.fromEntries(data.map(t => [t.id, t.remainingPurse])));
      })
      .catch(err => console.error('Failed to fetch teams:', err));

    fetch('http://localhost:8282/api/skills')
      .then(res => res.json())
      .then((data: Skill[]) => {
        setSkills(data);
        if (data.length > 0) setSelectedSkill(data[0].id);
      })
      .catch(err => console.error('Failed to fetch skills:', err));

    fetch('http://localhost:8282/api/groups')
      .then(res => res.json())
      .then((data: SkillGroup[]) => setSkillGroups(data))
      .catch(err => console.error('Failed to fetch groups:', err));
  }, []);

  const availableGroups = selectedSkill > 0
    ? skillGroups.filter(group => Number(group.skillId) === selectedSkill)
    : [];

  useEffect(() => { setSelectedGroupCode(''); }, [selectedSkill]);

  useEffect(() => {
    if (selectedSkill <= 0 || !selectedGroupCode || !auctionStarted) {
      setAuctionPlayers([]);
      return;
    }
    const filtered = players.filter(p =>
      p.status === 'NOT_ASSIGNED' &&
      Number(p.skillId) === selectedSkill &&
      p.groupCode === selectedGroupCode
    );
    setAuctionPlayers(shuffle(filtered));
    setCurrentPlayerIdx(0);
  }, [players, selectedSkill, selectedGroupCode, auctionStarted]);

  useEffect(() => {
    if (auctionPlayers.length > 0) {
      setCurrentBid(0);
      setCurrentBidTeam(null);
      setError('');
    }
  }, [currentPlayerIdx, auctionPlayers]);

  // Inject player-intro keyframes once
  useEffect(() => {
    if (document.getElementById('pi-styles')) return;
    const s = document.createElement('style');
    s.id = 'pi-styles';
    s.textContent = `
      @keyframes pi-photo{0%{opacity:0;transform:scale(0.35) translateY(80px);filter:blur(22px)}65%{opacity:1;transform:scale(1.05) translateY(-4px);filter:blur(0)}100%{opacity:1;transform:scale(1) translateY(0)}}
      @keyframes pi-name{0%{opacity:0;transform:translateY(50px) scaleX(0.82)}100%{opacity:1;transform:translateY(0) scaleX(1)}}
      @keyframes pi-slide-up{0%{opacity:0;transform:translateY(26px)}100%{opacity:1;transform:translateY(0)}}
      @keyframes pi-scale-in{0%{opacity:0;transform:scale(0.5)}80%{transform:scale(1.07)}100%{opacity:1;transform:scale(1)}}
      @keyframes pi-label{0%{opacity:0;letter-spacing:18px}100%{opacity:1;letter-spacing:6px}}
      @keyframes pi-stat{0%{opacity:0;transform:translateY(16px) scale(0.88)}100%{opacity:1;transform:translateY(0) scale(1)}}
      @keyframes pi-glow-pulse{0%,100%{box-shadow:0 0 28px #00C8FF80,0 0 60px #00C8FF20}50%{box-shadow:0 0 65px #00C8FFcc,0 0 130px #00C8FF55}}
      @keyframes pi-countdown{from{width:100%}to{width:0%}}
      @keyframes pi-shimmer{0%{transform:translateX(-220%) skewX(-20deg);opacity:0}15%{opacity:0.9}100%{transform:translateX(380%) skewX(-20deg);opacity:0}}
      @keyframes pi-beam{from{opacity:0;transform:scaleY(0)}to{opacity:1;transform:scaleY(1)}}
      @keyframes setup-fade-up{0%{opacity:0;transform:translateY(28px)}100%{opacity:1;transform:translateY(0)}}
      @keyframes setup-scale-in{0%{opacity:0;transform:scale(0.93) translateY(18px)}100%{opacity:1;transform:scale(1) translateY(0)}}
      @keyframes setup-expand{0%{opacity:0;transform:scaleX(0)}100%{opacity:1;transform:scaleX(1)}}
      @keyframes orb-float{0%,100%{transform:translate(0,0) scale(1)}38%{transform:translate(22px,-32px) scale(1.06)}68%{transform:translate(-16px,20px) scale(0.94)}}
      @keyframes launch-pulse{0%,100%{box-shadow:0 0 28px rgba(0,120,194,0.55),0 8px 32px rgba(0,0,0,0.4)}50%{box-shadow:0 0 55px rgba(0,150,220,0.85),0 8px 50px rgba(0,0,0,0.5)}}
      @keyframes dropdown-appear{0%{opacity:0;transform:translateY(-6px) scale(0.97)}100%{opacity:1;transform:translateY(0) scale(1)}}
      @keyframes skill-select{0%{transform:scale(1)}50%{transform:scale(0.95)}100%{transform:scale(1)}}
      @keyframes title-glow{0%,100%{text-shadow:0 0 40px rgba(0,200,255,0.15)}50%{text-shadow:0 0 80px rgba(0,200,255,0.35),0 0 120px rgba(0,200,255,0.15)}}
      @keyframes ab-blast{0%{opacity:0;transform:scale(3.2) translateY(-24px);filter:blur(32px)}58%{opacity:1;transform:scale(0.96);filter:blur(0)}78%{transform:scale(1.03)}100%{opacity:1;transform:scale(1)}}
      @keyframes ab-glow{0%,100%{text-shadow:0 0 60px rgba(255,215,0,0.55),0 0 120px rgba(255,215,0,0.22)}50%{text-shadow:0 0 130px rgba(255,215,0,0.95),0 0 220px rgba(255,215,0,0.50),0 0 300px rgba(255,110,0,0.28)}}
      @keyframes ab-badge{0%{opacity:0;transform:scale(0.4) translateY(18px)}68%{transform:scale(1.07)}100%{opacity:1;transform:scale(1)}}
      @keyframes ab-sub{0%{opacity:0;letter-spacing:26px}100%{opacity:1;letter-spacing:10px}}
      @keyframes ab-line{0%{width:0%;opacity:0}100%{width:65%;opacity:1}}
      @keyframes bid-fly{0%{opacity:0;transform:translate(-50%,-50%) scale(0.4)}18%{opacity:1;transform:translate(-50%,-50%) scale(1.8)}80%{opacity:1}100%{opacity:0;transform:translate(calc(-50% + var(--bid-dx)),calc(-50% + var(--bid-dy))) scale(0.7)}}
      @keyframes bid-receive{0%{transform:scale(1)}35%{transform:scale(1.18)}65%{transform:scale(0.96)}100%{transform:scale(1)}}
      @keyframes bid-radar{0%{transform:scale(0.6);opacity:0.8}100%{transform:scale(2.2);opacity:0}}
      @keyframes bid-dot-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.7)}}
      @keyframes bid-row-in{0%{opacity:0;transform:translateX(-10px)}100%{opacity:1;transform:translateX(0)}}
    `;
    document.head.appendChild(s);
  }, []);

  // Lock body scroll for the entire auction page lifetime
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Trigger intro when active player changes
  const currentPlayerForIntro = auctionPlayers[currentPlayerIdx] ?? null;
  useEffect(() => {
    if (!auctionStarted || !currentPlayerForIntro) return;
    if (currentPlayerForIntro.id === introShownForRef.current) return;
    introShownForRef.current = currentPlayerForIntro.id;
    setIntroPlayer({ ...currentPlayerForIntro });
    setIntroExiting(false);
    setShowPlayerIntro(true);
  }, [currentPlayerForIntro?.id, auctionStarted]);

  // Auto-dismiss intro after 5s
  useEffect(() => {
    if (!showPlayerIntro) return;
    const exitT = setTimeout(() => setIntroExiting(true), 4500);
    const hideT = setTimeout(() => setShowPlayerIntro(false), 5000);
    return () => { clearTimeout(exitT); clearTimeout(hideT); };
  }, [showPlayerIntro]);

  const dismissIntro = () => {
    setIntroExiting(true);
    setTimeout(() => setShowPlayerIntro(false), 380);
  };

  const introSkillName = introPlayer
    ? (skills.find(s => s.id === Number(introPlayer.skillId))?.skillName ?? introPlayer.skillName ?? '')
    : '';

  /* ── Setup screen ─────────────────────────────────────────────────── */
  if (!auctionStarted) {
    const canStart = !!(selectedSkill && selectedGroupCode);
    const selectedSkillObj = skills.find(s => s.id === selectedSkill);

    // Skill color palette matching team card accents
    const skillAccent = (name: string) => {
      const k = name.toUpperCase();
      if (k.includes('BAT')) return { color: '#00A85A', bg: 'rgba(0,168,90,0.09)', border: 'rgba(0,168,90,0.30)' };
      if (k.includes('BOWL')) return { color: '#E5283F', bg: 'rgba(229,40,63,0.09)', border: 'rgba(229,40,63,0.28)' };
      if (k.includes('ALL')) return { color: '#F5A623', bg: 'rgba(245,166,35,0.09)', border: 'rgba(245,166,35,0.30)' };
      return { color: '#0078C2', bg: 'rgba(0,120,194,0.09)', border: 'rgba(0,120,194,0.28)' };
    };

    return (
      <div
        style={{
          minHeight: '100vh',
          background: BG,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '2rem', position: 'relative',
        }}
        onClick={() => openDropdown && setOpenDropdown(null)}
      >

        {/* Title */}
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 'clamp(2.8rem, 6vw, 5rem)',
          fontWeight: 900, color: '#005A8E',
          letterSpacing: 5, textTransform: 'uppercase',
          lineHeight: 1, textAlign: 'center',
          textShadow: '0 0 24px rgba(0,90,142,0.14), 0 2px 4px rgba(0,0,0,0.08)',
          marginBottom: 10,
          animation: 'setup-fade-up 0.5s ease-out 0.1s both',
        }}>EPL Auction</div>

        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: 5.5,
          color: '#8A9AB8', textTransform: 'uppercase',
          marginBottom: 10,
          animation: 'setup-fade-up 0.5s ease-out 0.18s both',
        }}>Select Skill &amp; Group to Begin</div>

        {/* Divider */}
        <div style={{
          width: 72, height: 2,
          background: 'linear-gradient(90deg, transparent, rgba(0,90,142,0.35), transparent)',
          margin: '0 auto 36px',
          animation: 'setup-expand 0.55s ease-out 0.28s both',
        }} />

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.93)',
          border: '1px solid rgba(43,114,212,0.11)',
          borderRadius: 18,
          padding: '32px 32px 28px',
          backdropFilter: 'blur(14px)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.09), inset 0 1px 0 rgba(255,255,255,0.9)',
          width: '100%', maxWidth: 460,
          animation: 'setup-scale-in 0.6s cubic-bezier(0.22,1,0.36,1) 0.3s both',
        }}>

          {/* 01 · Skill */}
          <div style={{ marginBottom: 24 }}>
            <div style={{
              fontSize: 9, fontWeight: 800, letterSpacing: 3,
              color: '#8A9AB8', textTransform: 'uppercase',
              marginBottom: 12, display: 'flex', alignItems: 'center', gap: 7,
            }}>
              <span style={{ fontSize: 11, color: '#0078C2', fontFamily: "'Space Mono', monospace" }}>01</span>
              <span style={{ opacity: 0.4 }}>·</span>
              Select Skill
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {skills.map(skill => {
                const isActive = selectedSkill === skill.id;
                const acc = skillAccent(skill.skillName);
                return (
                  <button
                    key={skill.id}
                    onClick={() => { setSelectedSkill(skill.id); setSelectedGroupCode(''); setOpenDropdown(null); }}
                    style={{
                      flex: 1, minWidth: 90, padding: '12px 8px',
                      borderRadius: 10,
                      border: `1px solid ${isActive ? acc.border : 'rgba(43,114,212,0.12)'}`,
                      borderBottom: `3px solid ${isActive ? acc.color : 'rgba(43,114,212,0.12)'}`,
                      background: isActive ? acc.bg : 'rgba(255,255,255,0.85)',
                      color: isActive ? acc.color : '#6B7FA0',
                      cursor: 'pointer',
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: 14, fontWeight: 800, letterSpacing: 1.5,
                      textTransform: 'uppercase',
                      transition: 'all 0.18s',
                      boxShadow: isActive
                        ? `0 0 14px ${acc.color}22, 0 4px 12px rgba(0,0,0,0.06)`
                        : '0 2px 6px rgba(0,0,0,0.04)',
                    }}
                  >
                    {skill.skillName.replace(/_/g, ' ')}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 02 · Group */}
          <div style={{ marginBottom: 26, opacity: selectedSkill ? 1 : 0.45, transition: 'opacity 0.3s' }}>
            <div style={{
              fontSize: 9, fontWeight: 800, letterSpacing: 3,
              color: '#8A9AB8', textTransform: 'uppercase',
              marginBottom: 12, display: 'flex', alignItems: 'center', gap: 7,
            }}>
              <span style={{ fontSize: 11, color: '#0078C2', fontFamily: "'Space Mono', monospace" }}>02</span>
              <span style={{ opacity: 0.4 }}>·</span>
              Select Group
            </div>

            <div style={{ position: 'relative', zIndex: 10 }} onClick={e => e.stopPropagation()}>
              {/* Trigger */}
              <button
                onClick={() => selectedSkill && setOpenDropdown(openDropdown === 'group' ? null : 'group')}
                disabled={!selectedSkill || availableGroups.length === 0}
                style={{
                  width: '100%', padding: '12px 16px',
                  borderRadius: 10,
                  border: selectedGroupCode
                    ? '1px solid rgba(0,120,194,0.40)'
                    : '1px solid rgba(43,114,212,0.14)',
                  borderBottom: `3px solid ${selectedGroupCode ? '#0078C2' : 'rgba(43,114,212,0.14)'}`,
                  background: selectedGroupCode ? 'rgba(0,120,194,0.07)' : 'rgba(255,255,255,0.85)',
                  color: selectedGroupCode ? '#005A8E' : '#8A9AB8',
                  cursor: selectedSkill && availableGroups.length > 0 ? 'pointer' : 'not-allowed',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 15, fontWeight: 800, letterSpacing: 2,
                  textTransform: 'uppercase',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'all 0.18s',
                  boxShadow: selectedGroupCode ? '0 0 12px rgba(0,120,194,0.14), 0 2px 8px rgba(0,0,0,0.05)' : '0 2px 6px rgba(0,0,0,0.04)',
                }}
              >
                <span>{selectedGroupCode
                  ? `Group ${selectedGroupCode}`
                  : availableGroups.length === 0 ? 'Select skill first' : 'Choose a group…'
                }</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  style={{ transform: openDropdown === 'group' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', opacity: 0.45, flexShrink: 0 }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {/* Panel */}
              {openDropdown === 'group' && availableGroups.length > 0 && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                  background: 'rgba(255,255,255,0.98)',
                  backdropFilter: 'blur(14px)',
                  border: '1px solid rgba(43,114,212,0.14)',
                  borderRadius: 10, overflow: 'hidden', zIndex: 10,
                  boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
                  animation: 'dropdown-appear 0.18s ease-out both',
                }}>
                  {availableGroups.map((group, gi) => {
                    const isChosen = selectedGroupCode === group.groupCode;
                    return (
                      <button
                        key={group.groupCode}
                        onClick={() => { setSelectedGroupCode(group.groupCode); setOpenDropdown(null); }}
                        style={{
                          width: '100%', padding: '12px 18px',
                          background: isChosen ? 'rgba(0,120,194,0.08)' : 'transparent',
                          border: 'none',
                          borderBottom: gi < availableGroups.length - 1 ? '1px solid rgba(43,114,212,0.07)' : 'none',
                          color: isChosen ? '#005A8E' : '#4A6080',
                          cursor: 'pointer',
                          fontFamily: "'Barlow Condensed', sans-serif",
                          fontSize: 16, fontWeight: 800, letterSpacing: 2,
                          textTransform: 'uppercase', textAlign: 'left',
                          display: 'flex', alignItems: 'center', gap: 10,
                          transition: 'background 0.12s, color 0.12s',
                        }}
                        onMouseEnter={e => { if (!isChosen) { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,120,194,0.05)'; (e.currentTarget as HTMLButtonElement).style.color = '#005A8E'; } }}
                        onMouseLeave={e => { if (!isChosen) { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#4A6080'; } }}
                      >
                        <span style={{ fontSize: 11, color: isChosen ? '#0078C2' : '#C0CCDB' }}>
                          {isChosen ? '●' : '○'}
                        </span>
                        Group {group.groupCode}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Launch */}
          <button
            disabled={!canStart}
            onClick={() => {
              setOpenDropdown(null);
              setShowAuctionIntro(true);
              setAuctionIntroExiting(false);
              const t1 = window.setTimeout(() => setAuctionIntroExiting(true), 4400);
              const t2 = window.setTimeout(() => {
                setShowAuctionIntro(false);
                setAuctionIntroExiting(false);
                setAuctionStarted(true);
              }, 4800);
              auctionIntroTimers.current = [t1, t2];
            }}
            style={{
              width: '100%', padding: '16px 0',
              borderRadius: 10,
              border: 'none',
              background: canStart ? '#0078C2' : 'rgba(0,120,194,0.18)',
              color: canStart ? '#FFFFFF' : '#7A9AB8',
              cursor: canStart ? 'pointer' : 'not-allowed',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 20, fontWeight: 900, letterSpacing: 4,
              textTransform: 'uppercase',
              boxShadow: canStart ? '0 0 28px rgba(0,120,194,0.35), 0 6px 20px rgba(0,0,0,0.12)' : 'none',
              transition: 'all 0.22s',
              position: 'relative', overflow: 'hidden',
            }}
            onMouseEnter={e => { if (canStart) (e.currentTarget as HTMLButtonElement).style.background = '#005A8E'; }}
            onMouseLeave={e => { if (canStart) (e.currentTarget as HTMLButtonElement).style.background = '#0078C2'; }}
          >
            {canStart && (
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)', animation: 'pi-shimmer 3s ease-in-out 0.6s infinite' }} />
            )}
            Launch Auction
          </button>
        </div>

        {/* Bottom hint */}
        <div style={{
          marginTop: 20, fontSize: 10, color: '#A0AFC8',
          letterSpacing: 2.5, textTransform: 'uppercase',
          fontFamily: "'Barlow Condensed', sans-serif",
          animation: 'setup-fade-up 0.5s ease-out 0.6s both',
        }}>
          {selectedSkill && selectedGroupCode
            ? `${selectedSkillObj?.skillName?.replace(/_/g, ' ') ?? ''} · Group ${selectedGroupCode} · Ready`
            : 'Select skill & group to begin'}
        </div>

        {/* ── Auction start cinematic overlay ── */}
        {showAuctionIntro && (
          <div
            onClick={() => {
              auctionIntroTimers.current.forEach(clearTimeout);
              setAuctionIntroExiting(true);
              window.setTimeout(() => {
                setShowAuctionIntro(false);
                setAuctionIntroExiting(false);
                setAuctionStarted(true);
              }, 420);
            }}
            style={{
              position: 'fixed', inset: 0, zIndex: 2000,
              background: 'rgba(2,6,18,0.99)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', overflow: 'hidden',
              opacity: auctionIntroExiting ? 0 : 1,
              transition: auctionIntroExiting ? 'opacity 0.42s ease-out' : 'opacity 0.18s ease-in',
            }}
          >
            {/* Grid */}
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              backgroundImage: 'linear-gradient(rgba(255,215,0,0.028) 1px,transparent 1px),linear-gradient(90deg,rgba(255,215,0,0.028) 1px,transparent 1px)',
              backgroundSize: '64px 64px',
            }} />

            {/* Radial glow */}
            <div style={{
              position: 'absolute', width: 900, height: 900, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,180,0,0.09) 0%, rgba(255,80,0,0.04) 42%, transparent 65%)',
              pointerEvents: 'none',
            }} />

            {/* Light beams */}
            {[-60, -35, -10, 10, 35, 60].map((deg, i) => (
              <div key={i} style={{
                position: 'absolute',
                width: 1.5, height: '190%',
                background: `linear-gradient(to bottom, transparent 0%, rgba(255,200,50,${0.025 + i * 0.007}) 50%, transparent 100%)`,
                transform: `rotate(${deg}deg)`,
                transformOrigin: 'center center',
                pointerEvents: 'none',
                animation: `pi-beam 1s cubic-bezier(0.22,1,0.36,1) ${0.04 + i * 0.06}s both`,
              }} />
            ))}

            {/* Letterbox bars */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 52, background: '#000', zIndex: 4 }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 52, background: '#000', zIndex: 4 }} />

            {/* Main content */}
            <div style={{
              position: 'relative', zIndex: 2, textAlign: 'center',
              padding: '0 40px', maxWidth: 780, width: '100%',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}>

              {/* EPL label */}
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 11, fontWeight: 800, color: '#FFD700',
                textTransform: 'uppercase', letterSpacing: 8, marginBottom: 18,
                textShadow: '0 0 22px rgba(255,215,0,0.55)',
                animation: 'pi-label 0.7s cubic-bezier(0.22,1,0.36,1) 0.08s both',
              }}>EPL 8 · Grand Auction</div>

              {/* "THE GRAND" */}
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 'clamp(1.4rem, 3vw, 2.2rem)',
                fontWeight: 900, color: 'rgba(255,255,255,0.42)',
                letterSpacing: 14, textTransform: 'uppercase', lineHeight: 1,
                marginBottom: 2,
                animation: 'pi-slide-up 0.5s cubic-bezier(0.22,1,0.36,1) 0.3s both',
              }}>The Grand</div>

              {/* "AUCTION" — the money shot */}
              <div style={{
                fontFamily: "'Bebas Neue', 'Barlow Condensed', sans-serif",
                fontSize: 'clamp(5.5rem, 16vw, 11rem)',
                color: '#FFD700',
                letterSpacing: 12, lineHeight: 0.88,
                textTransform: 'uppercase',
                animation: 'ab-blast 0.78s cubic-bezier(0.22,1,0.36,1) 0.38s both, ab-glow 2.8s ease-in-out 1.2s infinite',
                marginBottom: 10,
              }}>Auction</div>

              {/* Gold shimmer rule */}
              <div style={{
                height: 2, marginBottom: 26, position: 'relative', overflow: 'hidden',
                background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.7), transparent)',
                animation: 'ab-line 0.7s cubic-bezier(0.22,1,0.36,1) 1.05s both',
                alignSelf: 'stretch',
              }}>
                <div style={{
                  position: 'absolute', top: 0, width: '35%', height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.95), transparent)',
                  animation: 'pi-shimmer 2.4s ease-in-out 1.4s infinite',
                }} />
              </div>

              {/* Skill + Group badges */}
              <div style={{
                display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 26,
                animation: 'ab-badge 0.55s cubic-bezier(0.22,1,0.36,1) 1.15s both',
              }}>
                {selectedSkillObj && (
                  <span style={{
                    padding: '6px 20px', borderRadius: 999,
                    background: 'rgba(255,215,0,0.12)', border: '1px solid rgba(255,215,0,0.50)',
                    color: '#FFD700', fontSize: 12, fontWeight: 800, letterSpacing: 2.5,
                    textTransform: 'uppercase',
                    textShadow: '0 0 12px rgba(255,215,0,0.4)',
                  }}>{selectedSkillObj.skillName.replace(/_/g, ' ')}</span>
                )}
                {selectedGroupCode && (
                  <span style={{
                    padding: '6px 20px', borderRadius: 999,
                    background: 'rgba(0,200,255,0.10)', border: '1px solid rgba(0,200,255,0.40)',
                    color: '#00C8FF', fontSize: 12, fontWeight: 800, letterSpacing: 2.5,
                    textTransform: 'uppercase',
                  }}>Group {selectedGroupCode}</span>
                )}
              </div>

              {/* "LET THE BIDDING BEGIN" */}
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 'clamp(1rem, 2.2vw, 1.45rem)',
                fontWeight: 800, color: 'rgba(255,255,255,0.50)',
                textTransform: 'uppercase',
                animation: 'ab-sub 0.75s cubic-bezier(0.22,1,0.36,1) 1.4s both',
              }}>Let The Bidding Begin</div>
            </div>

            {/* Countdown bar */}
            <div style={{
              position: 'absolute', bottom: 52, left: 0, right: 0, height: 2,
              background: 'rgba(255,255,255,0.06)', zIndex: 5,
            }}>
              <div style={{
                height: '100%',
                background: 'linear-gradient(90deg, #FFD700, #FF8C00)',
                boxShadow: '0 0 10px rgba(255,200,0,0.9)',
                animation: 'pi-countdown 4.8s linear forwards',
                animationPlayState: auctionIntroExiting ? 'paused' : 'running',
              }} />
            </div>

            {/* Skip hint */}
            <div style={{
              position: 'absolute', bottom: 16, left: 0, right: 0, zIndex: 5,
              textAlign: 'center',
              fontSize: 10, color: 'rgba(255,255,255,0.16)',
              letterSpacing: 2.5, fontWeight: 700, textTransform: 'uppercase',
              fontFamily: "'Barlow Condensed', sans-serif",
            }}>Click anywhere to skip</div>
          </div>
        )}
      </div>
    );
  }

  if (auctionPlayers.length === 0 || teams.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#1A3362', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2rem', letterSpacing: 2 }}>
          All players auctioned or no players for selected skill!
        </div>
      </div>
    );
  }

  const player = auctionPlayers[currentPlayerIdx];

  const triggerFlyAnim = (buttonEl: HTMLElement, amount: number) => {
    const src = buttonEl.getBoundingClientRect();
    const tgt = currentBidRef.current?.getBoundingClientRect();
    if (!tgt) return;
    flyIdRef.current += 1;
    setFlyAnim({ x: src.left + src.width / 2, y: src.top + src.height / 2, tx: tgt.left + tgt.width / 2, ty: tgt.top + tgt.height / 2, amount, id: flyIdRef.current });
  };

  const handleBid = (teamId: number, up: boolean) => {
    setError('');
    const purse = teamPurse[teamId];
    if (up) {
      if (currentBid === 0) {
        if (purse < player.basePrice) { setError('Insufficient funds to bid.'); return; }
        setCurrentBid(player.basePrice);
        setCurrentBidTeam(teamId);
        setBids([...bids, { playerId: player.id, teamId, amount: player.basePrice, time: new Date().toLocaleTimeString() }]);
        return;
      } else {
        const nextBid = currentBid + BID_INCREMENT;
        if (purse < nextBid) { setError('Insufficient funds to bid.'); return; }
        setCurrentBid(nextBid);
        setCurrentBidTeam(teamId);
        setBids([...bids, { playerId: player.id, teamId, amount: nextBid, time: new Date().toLocaleTimeString() }]);
        return;
      }
    }
    if (currentBid === player.basePrice || currentBid === 0) { setError('Bid is already at base price.'); return; }
    const nextBid = currentBid - BID_INCREMENT;
    if (nextBid < player.basePrice) { setError('Bid cannot go below base price.'); return; }
    setCurrentBid(nextBid);
    setCurrentBidTeam(teamId);
    setBids([...bids, { playerId: player.id, teamId, amount: nextBid, time: new Date().toLocaleTimeString() }]);
  };

  const handleSold = async () => {
    if (currentBidTeam == null) { setError('Select a team to sell the player.'); return; }
    const soldAmount = currentBid > 0 ? currentBid : player.basePrice;
    const nextRemainingPurse = (teamPurse[currentBidTeam] ?? 0) - soldAmount;
    const soldTeam = teams.find(t => t.id === currentBidTeam);

    try {
      await fetch('http://localhost:8282/api/players/auction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: player.id, teamId: currentBidTeam, soldPrice: soldAmount, status: 'SOLD' }),
      });
    } catch (e) { setError('Failed to update auction result.'); return; }

    setSoldAnim({
      playerName: player.name,
      teamName: soldTeam?.name ?? '—',
      teamLogo: soldTeam?.logo ?? '',
      amount: soldAmount,
    });

    fetch('http://localhost:8282/api/players/last-sold')
      .then(res => res.json())
      .then((data: unknown) => {
        const recent = Array.isArray(data)
          ? data
          : data && typeof data === 'object' && Array.isArray((data as { data?: unknown[] }).data)
            ? (data as { data: Player[] }).data
            : [];
        setRecentSoldPlayers(recent as Player[]);
      })
      .catch(err => console.error('Failed to refresh recently sold players:', err));

    const nextAuctionPlayers = auctionPlayers.filter((_, idx) => idx !== currentPlayerIdx);
    setTimeout(() => {
      setSoldAnim(null);
      setPlayers(prevPlayers => prevPlayers.filter(p => p.id !== player.id));
      setAuctionPlayers(nextAuctionPlayers);
      setTeamPurse(prevPurse => ({ ...prevPurse, [currentBidTeam]: nextRemainingPurse }));
      setCurrentPlayerIdx(idx => (idx >= nextAuctionPlayers.length - 1 ? 0 : idx));
      setError('');
    }, 3200);
  };

  const handleUnsold = async () => {
    try {
      await fetch('http://localhost:8282/api/players/auction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: player.id, teamId: null, soldPrice: 0, status: 'UNSOLD' }),
      });
    } catch (e) { setError('Failed to update auction result.'); return; }
    setPlayers(players.filter(p => p.id !== player.id));
    setAuctionPlayers(auctionPlayers.filter((_, idx) => idx !== currentPlayerIdx));
    setCurrentPlayerIdx(idx => idx >= auctionPlayers.length - 1 ? 0 : idx);
    setError('');
  };

  /* ── Main auction screen ──────────────────────────────────────────── */
  return (
    <div style={{ height: 'calc(100vh - 56px)', background: BG, padding: '0.35rem 0.6rem', width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <h1 className="auction-title">EPL 8 - The Grand Auction</h1>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '248px 1fr 248px',
        gap: 10,
        width: '100%',
        flex: 1,
        minHeight: 0,
        alignItems: 'stretch',
      }}>

        {/* ── Player info card ── */}
        <div
          key={player.id}
          id="playerInfo"
          className="player-info-enter"
          style={{
            background: 'linear-gradient(175deg, #06111f 0%, #0a1e38 55%, #081828 100%)',
            border: '1px solid rgba(0,150,220,0.18)',
            borderRadius: 16,
            boxShadow: '0 8px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
          }}
        >
          {/* Header bar */}
          <div style={{
            textAlign: 'center',
            background: 'linear-gradient(90deg, transparent, rgba(0,150,220,0.18), transparent)',
            borderBottom: '1px solid rgba(0,180,255,0.15)',
            padding: '7px 14px',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 10, fontWeight: 900, letterSpacing: 5,
            textTransform: 'uppercase', color: '#00C8FF',
            flexShrink: 0,
            position: 'relative',
          }}>
            <span style={{ opacity: 0.5, marginRight: 8 }}>◆</span>
            Auction Player
            <span style={{ opacity: 0.5, marginLeft: 8 }}>◆</span>
          </div>

          {/* Photo — flex: 1 so it expands to fill whatever space the compact body doesn't need */}
          <div style={{ position: 'relative', width: '100%', flex: 1, minHeight: 180, overflow: 'hidden' }}>
            <img
              src={player.photo}
              alt={player.name}
              style={{
                width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block',
                filter: 'brightness(0.95) contrast(1.04) saturate(1.05)',
              }}
            />
            {/* Soft radial vignette — only darkens edges, face stays clear */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(ellipse 70% 80% at 50% 35%, transparent 40%, rgba(4,12,26,0.55) 80%, rgba(4,12,26,0.88) 100%)',
            }} />
            {/* Bottom fade into card */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to bottom, rgba(6,17,31,0.15) 0%, transparent 30%, transparent 60%, rgba(6,17,31,0.80) 85%, rgba(6,17,31,1) 100%)',
            }} />
            {/* Scanline overlay */}
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.04,
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,1) 2px, rgba(0,0,0,1) 4px)',
            }} />
            {/* Bottom cyan glow line */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
              background: 'linear-gradient(90deg, transparent 0%, rgba(0,200,255,0.6) 40%, rgba(0,200,255,0.6) 60%, transparent 100%)',
              boxShadow: '0 0 12px rgba(0,200,255,0.5)',
            }} />
          </div>

          {/* Body — no flex: 1; compact natural height so photo above takes the rest */}
          <div style={{ padding: '4px 8px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>

            {/* Player name */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: '1.15rem', fontWeight: 900,
                color: '#FFFFFF',
                textTransform: 'uppercase', letterSpacing: 1.5,
                lineHeight: 1.1,
                textShadow: '0 0 24px rgba(0,200,255,0.22)',
              }}>{player.name}</div>
            </div>

            {/* Stats grid — colorful tiles */}
            {Object.keys(player.stats || {}).length > 0 && (() => {
              const statColors = ['#00C8FF', '#00D97E', '#F5A623', '#FF3D5A', '#A78BFA', '#FF8C42'];
              const entries = Object.entries(player.stats || {});
              const isOdd = entries.length % 2 !== 0;
              return (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                  {entries.map(([key, value], i) => {
                    const c = statColors[i % statColors.length];
                    return (
                      <div key={key} style={{
                        background: `linear-gradient(135deg, ${c}15 0%, ${c}07 100%)`,
                        border: `1px solid ${c}25`,
                        borderTop: `2px solid ${c}70`,
                        borderRadius: 7,
                        padding: '4px 6px 3px',
                        textAlign: 'center',
                        position: 'relative', overflow: 'hidden',
                        gridColumn: isOdd && i === 0 ? '1 / -1' : undefined,
                      }}>
                        <div style={{
                          position: 'absolute', top: -8, right: -8,
                          width: 30, height: 30, borderRadius: '50%',
                          background: `radial-gradient(circle, ${c}22 0%, transparent 70%)`,
                          pointerEvents: 'none',
                        }} />
                        <div style={{
                          fontFamily: "'Space Mono', monospace",
                          fontSize: 13, fontWeight: 700, color: c,
                          lineHeight: 1,
                          textShadow: `0 0 10px ${c}55`,
                        }}>{value}</div>
                        <div style={{
                          fontSize: 7, fontWeight: 800, color: 'rgba(255,255,255,0.35)',
                          textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 2,
                        }}>{key}</div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Bid panel — auto height, no stretching */}
            <div style={{
              background: 'rgba(0,0,0,0.30)',
              border: '1px solid rgba(0,150,220,0.18)',
              borderRadius: 10,
              padding: '6px 8px',
              textAlign: 'center',
              display: 'flex', flexDirection: 'column',
              gap: 6,
            }}>
              {/* Auction intel + base price */}
              {(() => {
                const playerBids = bids.filter(b => b.playerId === player.id);
                const totalBids = playerBids.length;
                const uniqueTeams = new Set(playerBids.map(b => b.teamId)).size;
                const premium = currentBid > 0 ? Math.round(((currentBid - player.basePrice) / player.basePrice) * 100) : 0;
                const nextBid = currentBid > 0 ? currentBid + BID_INCREMENT : player.basePrice;
                const intelTiles = [
                  { label: 'Total Bids', value: String(totalBids), color: '#00C8FF', glow: 'rgba(0,200,255,0.35)' },
                  { label: 'Teams Active', value: String(uniqueTeams), color: '#B983FF', glow: 'rgba(185,131,255,0.35)' },
                  { label: 'Premium', value: premium > 0 ? `+${premium}%` : '—', color: '#00D97E', glow: 'rgba(0,217,126,0.35)' },
                  { label: 'Next Bid', value: `₹${nextBid.toLocaleString()}`, color: '#FFB547', glow: 'rgba(255,181,71,0.35)' },
                ];
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, padding: '1px 0' }}>
                    {/* Base price — full width */}
                    <div style={{
                      gridColumn: '1 / -1',
                      display: 'flex', justifyContent: 'center',
                    }}>
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        background: 'rgba(0,120,194,0.14)',
                        border: '1px solid rgba(0,180,255,0.28)',
                        borderRadius: 20, padding: '3px 14px',
                      }}>
                        <span style={{ fontSize: 7, fontWeight: 900, letterSpacing: 2.5, color: 'rgba(0,200,255,0.55)', textTransform: 'uppercase' }}>Base Price</span>
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, color: '#00C8FF', letterSpacing: 0.5 }}>
                          ₹{player.basePrice.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    {intelTiles.map(tile => (
                      <div key={tile.label} style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderTop: `2px solid ${tile.color}55`,
                        borderRadius: 7, padding: '5px 6px',
                        textAlign: 'center',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                      }}>
                        <div style={{
                          fontFamily: "'Space Mono', monospace", fontWeight: 700,
                          fontSize: 14, color: tile.color,
                          textShadow: `0 0 10px ${tile.glow}`,
                          lineHeight: 1,
                        }}>{tile.value}</div>
                        <div style={{ fontSize: 6.5, letterSpacing: 1.5, color: 'rgba(255,255,255,0.32)', textTransform: 'uppercase', fontWeight: 800 }}>{tile.label}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Current bid + leader */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 4 }} />

                <div style={{ fontSize: 7, letterSpacing: 3, color: 'rgba(255,255,255,0.30)', textTransform: 'uppercase', fontWeight: 800 }}>Current Bid</div>
                <div
                  key={currentBid}
                  ref={currentBidRef}
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: currentBid > 0 ? '1.55rem' : '1.25rem',
                    fontWeight: 700,
                    color: currentBid > 0 ? '#00D97E' : 'rgba(255,255,255,0.20)',
                    lineHeight: 1,
                    marginBottom: 2,
                    textShadow: currentBid > 0 ? '0 0 22px rgba(0,217,126,0.55)' : 'none',
                    animation: currentBid > 0 ? 'bid-receive 0.45s cubic-bezier(0.22,1,0.36,1) both' : undefined,
                  }}>₹{currentBid.toLocaleString()}</div>

                <div style={{ fontSize: 7, letterSpacing: 3, color: 'rgba(255,255,255,0.30)', textTransform: 'uppercase', fontWeight: 800, marginBottom: 1 }}>Leader</div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.9rem', color: '#00D97E', letterSpacing: 0.5 }}>
                  {currentBidTeam ? teams.find(t => t.id === currentBidTeam)?.name : '—'}
                </div>
              </div>
            </div>

            {/* SOLD / UNSOLD */}
            <div style={{ display: 'flex', gap: 7 }}>
              <button onClick={handleSold} style={{
                flex: 1,
                background: 'linear-gradient(135deg, #00D97E 0%, #00B868 100%)',
                color: '#03100A', fontWeight: 900,
                border: 'none', borderRadius: 8, padding: '11px 0', fontSize: 15, cursor: 'pointer',
                fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 2, textTransform: 'uppercase',
                boxShadow: '0 0 22px rgba(0,217,126,0.45), 0 4px 14px rgba(0,0,0,0.3)',
              }}>Sold</button>
              <button onClick={handleUnsold} style={{
                flex: 1,
                background: 'linear-gradient(135deg, #FF3D5A 0%, #D42040 100%)',
                color: '#fff', fontWeight: 900,
                border: 'none', borderRadius: 8, padding: '11px 0', fontSize: 15, cursor: 'pointer',
                fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 2, textTransform: 'uppercase',
                boxShadow: '0 0 22px rgba(255,61,90,0.45), 0 4px 14px rgba(0,0,0,0.3)',
              }}>Unsold</button>
            </div>

            {error && <div style={{ color: '#FF3D5A', fontSize: 11, textAlign: 'center', fontWeight: 600 }}>{error}</div>}
          </div>
        </div>

        {/* ── Team bid grid ── */}
        <div style={{
          background: 'radial-gradient(ellipse at 50% 20%, rgba(255,255,255,0.98) 0%, rgba(228,238,252,0.96) 100%)',
          border: '1px solid rgba(43,114,212,0.10)',
          borderRadius: 16,
          boxShadow: '0 4px 32px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.8)',
          padding: 10,
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gridAutoRows: '1fr',
          gap: 8,
          height: '100%',
          backdropFilter: 'blur(12px)',
        }}>
          {teams.map(team => {
            const isLeader = currentBidTeam === team.id;
            const canDecrement = isLeader && !(currentBid === player.basePrice || currentBid === 0);
            const remaining = teamPurse[team.id] ?? 0;
            const pct = team.purse > 0 ? Math.round((remaining / team.purse) * 100) : 0;
            const barColor = pct > 60 ? '#00A85A' : pct > 30 ? '#F5A623' : '#E5283F';
            return (
              <div key={team.id} style={{
                border: isLeader ? '2px solid #0078C2' : '1px solid rgba(0,0,0,0.09)',
                borderBottom: `3px solid ${barColor}`,
                borderRadius: 12,
                padding: '8px 10px 8px',
                background: isLeader
                  ? 'linear-gradient(150deg, rgba(0,120,194,0.11) 0%, rgba(0,120,194,0.03) 100%)'
                  : 'linear-gradient(150deg, #FFFFFF 0%, rgba(238,245,255,0.97) 100%)',
                boxShadow: isLeader
                  ? '0 6px 24px rgba(0,90,142,0.22)'
                  : '0 2px 10px rgba(0,0,0,0.06)',
                transition: 'all 0.25s',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {/* Watermark purse % */}
                <div style={{
                  position: 'absolute',
                  right: 4,
                  bottom: 36,
                  fontSize: '2.8rem',
                  fontWeight: 900,
                  fontFamily: "'Space Mono', monospace",
                  color: `${barColor}1E`,
                  lineHeight: 1,
                  userSelect: 'none',
                  pointerEvents: 'none',
                  letterSpacing: -2,
                }}>{pct}%</div>

                {/* Logo - centered, larger */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <img src={team.logo} alt={team.name} style={{
                    width: 72, height: 72,
                    objectFit: 'contain',
                    borderRadius: '50%',
                    border: `2px solid ${barColor}55`,
                    background: 'rgba(255,255,255,0.98)',
                    padding: 3,
                    boxShadow: `0 0 14px ${barColor}50, 0 2px 8px rgba(0,0,0,0.12)`,
                  }} />
                </div>

                {/* Name - highlighted badge below logo */}
                <div style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontWeight: 400,
                  fontSize: '1.05rem',
                  color: isLeader ? '#006BA0' : '#0D1E3E',
                  textTransform: 'uppercase',
                  letterSpacing: 2,
                  textAlign: 'center',
                  background: isLeader ? 'rgba(0,120,194,0.14)' : `${barColor}14`,
                  border: `1px solid ${isLeader ? 'rgba(0,120,194,0.35)' : `${barColor}35`}`,
                  borderRadius: 7,
                  padding: '3px 6px',
                  lineHeight: 1.2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>{team.name}</div>

                {/* Purse + bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#6B7FA0', letterSpacing: 1, textTransform: 'uppercase' }}>Purse</span>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.78rem', fontWeight: 700, color: barColor }}>
                      ₹{remaining.toLocaleString()}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: 5, background: 'rgba(0,0,0,0.07)', borderRadius: 99 }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 99, transition: 'width 0.6s ease', boxShadow: `0 0 6px ${barColor}66` }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                    <span style={{ fontSize: 9, color: '#8A9AB8' }}>
                      Spent <span style={{ fontFamily: "'Space Mono', monospace", color: '#4A6080', fontWeight: 600 }}>₹{(team.purse - remaining).toLocaleString()}</span>
                    </span>
                    <span style={{ fontSize: 9, color: '#8A9AB8' }}>{100 - pct}% used</span>
                  </div>
                </div>

                {/* POC chips */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {[
                    { label: 'POC1', name: team.poc1, bg: 'rgba(43,114,212,0.08)', border: '1px solid rgba(43,114,212,0.22)', color: '#1A5BB5', grad: 'linear-gradient(135deg, #2B72D4, #1455A8)' },
                    { label: 'POC2', name: team.poc2, bg: 'rgba(120,80,200,0.08)', border: '1px solid rgba(120,80,200,0.22)', color: '#5E38A8', grad: 'linear-gradient(135deg, #7850C8, #5032A0)' },
                  ].filter(p => p.name).map(poc => {
                    const nm = poc.name || '';
                    const inits = nm.trim().split(/\s+/).map(w => w.charAt(0)).join('').toUpperCase().slice(0, 2);
                    return (
                      <div key={poc.label} style={{ display: 'flex', alignItems: 'center', gap: 8, background: poc.bg, border: poc.border, borderRadius: 8, padding: '6px 9px' }}>
                        <div style={{
                          width: 26, height: 26,
                          borderRadius: '50%',
                          background: poc.grad,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, fontWeight: 900, color: '#fff',
                          flexShrink: 0,
                          fontFamily: "'Barlow Condensed', sans-serif",
                          boxShadow: '0 2px 6px rgba(0,0,0,0.20)',
                        }}>{inits}</div>
                        <span style={{ flex: 1, fontSize: 10.5, fontWeight: 600, color: poc.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {poc.name}
                        </span>
                        <span style={{ fontSize: 8, fontWeight: 900, color: poc.color, letterSpacing: 1, fontFamily: "'Barlow Condensed', sans-serif", opacity: 0.75 }}>
                          {poc.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Bid buttons */}
                <div style={{ display: 'flex', gap: 5, width: '100%' }}>
                  <button
                    onClick={(e) => { const amount = currentBid === 0 ? player.basePrice : currentBid + BID_INCREMENT; triggerFlyAnim(e.currentTarget, amount); handleBid(team.id, true); }}
                    disabled={isLeader}
                    style={{
                      flex: 1,
                      background: isLeader
                        ? 'rgba(0,217,126,0.15)'
                        : 'linear-gradient(135deg, #00D97E 0%, #00B868 100%)',
                      color: isLeader ? 'rgba(0,217,126,0.45)' : '#04080F',
                      border: 'none',
                      borderRadius: 7,
                      padding: '7px 0',
                      cursor: isLeader ? 'not-allowed' : 'pointer',
                      fontSize: 15,
                      fontWeight: 900,
                      lineHeight: 1,
                      boxShadow: isLeader ? 'none' : '0 3px 12px rgba(0,217,126,0.45)',
                      transition: 'transform 0.1s, box-shadow 0.1s',
                    }}
                  >↑</button>
                  <button
                    onClick={() => { if (canDecrement) { setBidDownPending(team.id); setBidDownPassword(''); setBidDownPwError(''); } }}
                    disabled={!canDecrement}
                    style={{
                      flex: 1,
                      background: canDecrement
                        ? 'linear-gradient(135deg, #FF3D5A 0%, #D42040 100%)'
                        : 'rgba(255,61,90,0.15)',
                      color: canDecrement ? '#fff' : 'rgba(255,61,90,0.5)',
                      border: 'none',
                      borderRadius: 7,
                      padding: '7px 0',
                      cursor: canDecrement ? 'pointer' : 'not-allowed',
                      fontSize: 15,
                      fontWeight: 900,
                      lineHeight: 1,
                      boxShadow: canDecrement ? '0 3px 12px rgba(255,61,90,0.45)' : 'none',
                      transition: 'transform 0.1s, box-shadow 0.1s',
                    }}
                  >↓</button>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0, height: '100%' }}>
        {/* ── Recent auctioned players ── */}
        <div style={{
          background: 'rgba(255,255,255,0.92)',
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: 16,
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          padding: '10px 10px 8px',
          backdropFilter: 'blur(12px)',
          flex: '0 0 42%',
          order: 2,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 10,
            paddingBottom: 8,
            borderBottom: '1px solid rgba(0,0,0,0.07)',
          }}>
            <div style={{ width: 3, height: 18, background: '#0078C2', borderRadius: 99, flexShrink: 0 }} />
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: '1rem',
              fontWeight: 700,
              color: '#1A3362',
              letterSpacing: 3,
              textTransform: 'uppercase',
            }}>Recent Sold Players</span>
          </div>

          <ul style={{ overflowY: 'auto', padding: 0, listStyle: 'none', margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recentSoldPlayers.slice(0, 5).map((soldPlayer) => {
              const soldTeam = teams.find(team => team.id === Number(soldPlayer.teamId));
              return (
                <li key={soldPlayer.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 6px', background: 'rgba(0,168,90,0.06)', border: '1px solid rgba(0,168,90,0.16)', borderRadius: 8 }}>
                  <img src={soldPlayer.photo} alt={soldPlayer.name} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(0,168,90,0.28)' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: '#0D1E3E', fontSize: 10.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{soldPlayer.name}</div>
                    <div style={{ color: '#6B7FA0', fontSize: 9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{soldTeam?.name ?? soldPlayer.teamName ?? '—'}</div>
                  </div>
                  <span style={{ fontFamily: "'Space Mono', monospace", color: '#007A45', fontWeight: 700, fontSize: 10, flexShrink: 0 }}>₹{(soldPlayer.soldPrice ?? 0).toLocaleString()}</span>
                </li>
              );
            })}
            {recentSoldPlayers.length === 0 && (
              <li style={{ color: '#8A9AB8', fontSize: 11, textAlign: 'center', padding: '18px 0', fontStyle: 'italic' }}>No players auctioned yet.</li>
            )}
          </ul>
        </div>

        {/* ── Bid activity ── */}
        <div style={{
          background: 'rgba(255,255,255,0.92)',
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: 16,
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          padding: '10px 10px 8px',
          backdropFilter: 'blur(12px)',
          flex: '1 1 0',
          minHeight: 0,
          order: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 10,
            paddingBottom: 8,
            borderBottom: '1px solid rgba(0,0,0,0.07)',
          }}>
            <div style={{ width: 3, height: 18, background: '#0078C2', borderRadius: 99, flexShrink: 0 }} />
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: '1rem',
              fontWeight: 700,
              color: '#1A3362',
              letterSpacing: 3,
              textTransform: 'uppercase',
            }}>Bid Activity</span>
          </div>

          {(() => {
            const playerBids = bids.filter(b => b.playerId === player.id).slice().reverse();
            if (playerBids.length === 0) {
              return (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                  <div style={{ position: 'relative', width: 52, height: 52 }}>
                    {[0, 0.6, 1.2].map(delay => (
                      <div key={delay} style={{
                        position: 'absolute', inset: 0,
                        borderRadius: '50%',
                        border: '1.5px solid rgba(0,120,194,0.30)',
                        animation: `bid-radar 2s ease-out ${delay}s infinite`,
                      }} />
                    ))}
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{
                        width: 10, height: 10, borderRadius: '50%',
                        background: 'rgba(0,120,194,0.55)',
                        animation: 'bid-dot-pulse 1.4s ease-in-out infinite',
                      }} />
                    </div>
                  </div>
                  <span style={{ fontSize: 10, letterSpacing: 2, color: '#8A9AB8', textTransform: 'uppercase', fontStyle: 'italic' }}>
                    Waiting for bids…
                  </span>
                </div>
              );
            }
            return (
              <ul style={{ overflowY: 'auto', padding: 0, listStyle: 'none', margin: 0, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {playerBids.map((bid, idx) => {
                  const bidTeam = teams.find(t => t.id === bid.teamId);
                  const isLatest = idx === 0;
                  return (
                    <li key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: isLatest
                        ? 'linear-gradient(135deg, rgba(0,120,194,0.13) 0%, rgba(0,90,142,0.07) 100%)'
                        : 'rgba(0,0,0,0.018)',
                      border: isLatest
                        ? '1.5px solid rgba(0,120,194,0.45)'
                        : '1px solid rgba(0,0,0,0.08)',
                      borderRadius: 8,
                      padding: isLatest ? '9px 10px' : '7px 8px',
                      boxShadow: isLatest ? '0 2px 14px rgba(0,120,194,0.13)' : 'none',
                      animation: idx === 0 ? 'bid-row-in 0.3s ease-out both' : undefined,
                      transition: 'all 0.25s',
                    }}>
                      {/* Timeline dot */}
                      <div style={{
                        width: isLatest ? 9 : 6, height: isLatest ? 9 : 6,
                        borderRadius: '50%', flexShrink: 0,
                        background: isLatest ? '#0078C2' : '#C0CDE0',
                        boxShadow: isLatest ? '0 0 8px rgba(0,120,194,0.70), 0 0 18px rgba(0,120,194,0.30)' : 'none',
                        animation: isLatest ? 'bid-dot-pulse 1.4s ease-in-out infinite' : undefined,
                      }} />
                      {/* Team logo */}
                      {bidTeam?.logo && (
                        <img src={bidTeam.logo} alt={bidTeam.name} style={{
                          width: isLatest ? 26 : 20, height: isLatest ? 26 : 20,
                          objectFit: 'contain', flexShrink: 0,
                          borderRadius: '50%',
                          border: isLatest ? '2px solid rgba(0,120,194,0.35)' : '1px solid rgba(0,0,0,0.08)',
                          boxShadow: isLatest ? '0 0 8px rgba(0,120,194,0.20)' : 'none',
                        }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontWeight: isLatest ? 800 : 600,
                          color: isLatest ? '#003D6B' : '#5A7090',
                          fontSize: isLatest ? 12 : 11,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          letterSpacing: isLatest ? 0.2 : 0,
                        }}>
                          {bidTeam?.name ?? '—'}
                        </div>
                        <div style={{ color: isLatest ? '#5B9AC8' : '#A0B0C8', fontSize: 9, marginTop: 1 }}>{bid.time}</div>
                      </div>
                      <span style={{
                        fontFamily: "'Space Mono', monospace",
                        color: isLatest ? '#0060A0' : '#9AAABF',
                        fontWeight: isLatest ? 800 : 600,
                        fontSize: isLatest ? 13 : 11,
                        flexShrink: 0,
                        textShadow: isLatest ? '0 0 14px rgba(0,120,194,0.35)' : 'none',
                        letterSpacing: isLatest ? -0.3 : 0,
                      }}>₹{bid.amount.toLocaleString()}</span>
                    </li>
                  );
                })}
              </ul>
            );
          })()}
        </div>
        </div>

      </div>

      {/* ── Player intro overlay ── */}
      {showPlayerIntro && introPlayer && (
        <div
          onClick={dismissIntro}
          style={{
            position: 'fixed', inset: 0, zIndex: 1500,
            background: 'rgba(2,8,20,0.97)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            overflow: 'hidden',
            opacity: introExiting ? 0 : 1,
            transition: introExiting ? 'opacity 0.38s ease-out' : 'opacity 0.2s ease-in',
          }}
        >
          {/* Grid background */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: 'linear-gradient(rgba(0,200,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,200,255,0.04) 1px,transparent 1px)',
            backgroundSize: '56px 56px',
          }} />

          {/* Radial spotlight */}
          <div style={{
            position: 'absolute', width: 720, height: 720, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,140,255,0.13) 0%, rgba(0,80,180,0.07) 45%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          {/* Diagonal light beams */}
          {[-35, -15, 15, 35].map((deg, i) => (
            <div key={i} style={{
              position: 'absolute',
              width: 2, height: '160%',
              background: `linear-gradient(to bottom, transparent 0%, rgba(0,200,255,${0.04 + i * 0.012}) 50%, transparent 100%)`,
              transform: `rotate(${deg}deg)`,
              transformOrigin: 'center center',
              pointerEvents: 'none',
              animation: `pi-beam 0.8s cubic-bezier(0.22,1,0.36,1) ${0.1 + i * 0.08}s both`,
            }} />
          ))}

          {/* Letterbox bars */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 46, background: '#000', zIndex: 4 }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 46, background: '#000', zIndex: 4 }} />

          {/* Main content */}
          <div style={{
            position: 'relative', zIndex: 2,
            textAlign: 'center', padding: '0 40px',
            maxWidth: 580, width: '100%',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>

            {/* "PLAYER UP FOR AUCTION" label */}
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 11, fontWeight: 800, color: '#00C8FF',
              textTransform: 'uppercase', letterSpacing: 6,
              marginBottom: 22,
              animation: 'pi-label 0.7s cubic-bezier(0.22,1,0.36,1) 0.05s both',
            }}>
              Player Up For Auction
            </div>

            {/* Photo */}
            <div style={{
              position: 'relative', marginBottom: 20,
              animation: 'pi-photo 0.75s cubic-bezier(0.22,1,0.36,1) 0.15s both',
            }}>
              {/* Outer glow ring */}
              <div style={{
                position: 'absolute', inset: -10, borderRadius: '50%',
                animation: 'pi-glow-pulse 2.2s ease-in-out infinite',
                pointerEvents: 'none',
              }} />
              {/* Border ring */}
              <div style={{
                position: 'absolute', inset: -5, borderRadius: '50%',
                border: '2px solid rgba(0,200,255,0.55)',
                pointerEvents: 'none',
              }} />
              <img
                src={introPlayer.photo}
                alt={introPlayer.name}
                style={{
                  width: 172, height: 172, borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid rgba(0,200,255,0.35)',
                  display: 'block', position: 'relative', zIndex: 1,
                }}
              />
              {introPlayer.isNewPlayer === 1 && (
                <div style={{
                  position: 'absolute', bottom: 6, right: -2, zIndex: 2,
                  background: '#FFB800', color: '#000',
                  fontSize: 9, fontWeight: 900, borderRadius: 999,
                  padding: '2px 8px', letterSpacing: 1, textTransform: 'uppercase',
                  border: '2px solid #000',
                }}>NEW</div>
              )}
            </div>

            {/* Shimmer rule */}
            <div style={{
              width: '55%', height: 1, marginBottom: 18, position: 'relative', overflow: 'hidden',
              background: 'linear-gradient(90deg, transparent, rgba(0,200,255,0.45), transparent)',
            }}>
              <div style={{
                position: 'absolute', top: 0, width: '38%', height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.95), transparent)',
                animation: 'pi-shimmer 2.4s ease-in-out 0.6s infinite',
              }} />
            </div>

            {/* Name */}
            <div style={{
              fontFamily: "'Bebas Neue', 'Barlow Condensed', sans-serif",
              fontSize: 'clamp(2.6rem, 6vw, 4.4rem)',
              color: '#FFFFFF', letterSpacing: 4, lineHeight: 1,
              textTransform: 'uppercase', marginBottom: 16,
              textShadow: '0 0 40px rgba(255,255,255,0.22)',
              animation: 'pi-name 0.6s cubic-bezier(0.22,1,0.36,1) 0.38s both',
            }}>
              {introPlayer.name}
            </div>

            {/* Badges */}
            <div style={{
              display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap',
              marginBottom: 22,
              animation: 'pi-slide-up 0.5s cubic-bezier(0.22,1,0.36,1) 0.58s both',
            }}>
              {introSkillName && (
                <span style={{
                  padding: '4px 14px', borderRadius: 999,
                  background: 'rgba(0,217,126,0.13)', border: '1px solid rgba(0,217,126,0.45)',
                  color: '#00D97E', fontSize: 11, fontWeight: 800, letterSpacing: 1.5,
                  textTransform: 'uppercase',
                }}>{introSkillName}</span>
              )}
              {introPlayer.groupCode && (
                <span style={{
                  padding: '4px 14px', borderRadius: 999,
                  background: 'rgba(0,200,255,0.10)', border: '1px solid rgba(0,200,255,0.38)',
                  color: '#00C8FF', fontSize: 11, fontWeight: 800, letterSpacing: 1.5,
                  textTransform: 'uppercase',
                }}>GRP: {introPlayer.groupCode}</span>
              )}
            </div>

            {/* Stats grid */}
            {Object.keys(introPlayer.stats || {}).length > 0 && (() => {
              const introEntries = Object.entries(introPlayer.stats || {});
              const cols = Math.min(introEntries.length <= 4 ? introEntries.length : 4, 4);
              const introOdd = introEntries.length % 2 !== 0 && introEntries.length > 1;
              return (
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gap: 10, width: '100%', marginBottom: 22,
              }}>
                {introEntries.map(([k, v], i) => {
                  return (
                  <div key={k} style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    borderTop: '1px solid rgba(0,200,255,0.2)',
                    borderRadius: 10, padding: '10px 8px',
                    animation: `pi-stat 0.45s cubic-bezier(0.22,1,0.36,1) ${0.68 + i * 0.07}s both`,
                    gridColumn: introOdd && i === 0 ? '1 / -1' : undefined,
                  }}>
                    <div style={{
                      fontSize: 8, color: 'rgba(255,255,255,0.38)',
                      letterSpacing: 1.5, textTransform: 'uppercase',
                      marginBottom: 5, fontWeight: 700,
                    }}>{k}</div>
                    <div style={{
                      fontSize: 20, fontWeight: 700, color: '#FFFFFF',
                      fontFamily: "'Space Mono', monospace", lineHeight: 1,
                    }}>{v}</div>
                  </div>
                  );
                })}
              </div>
              );
            })()}

            {/* Divider */}
            <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 18 }} />

            {/* Base price */}
            <div style={{ animation: 'pi-scale-in 0.6s cubic-bezier(0.22,1,0.36,1) 0.95s both' }}>
              <div style={{
                fontSize: 9, fontWeight: 800, letterSpacing: 3.5,
                color: 'rgba(255,255,255,0.32)', textTransform: 'uppercase', marginBottom: 6,
              }}>Base Price</div>
              <div style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 'clamp(2rem, 4.5vw, 3.2rem)',
                fontWeight: 700, color: '#FFD700',
                textShadow: '0 0 40px rgba(255,215,0,0.75), 0 0 80px rgba(255,215,0,0.35)',
                letterSpacing: 2, lineHeight: 1,
              }}>₹{introPlayer.basePrice.toLocaleString()}</div>
            </div>
          </div>

          {/* Countdown bar */}
          <div style={{
            position: 'absolute', bottom: 46, left: 0, right: 0, height: 2,
            background: 'rgba(255,255,255,0.07)', zIndex: 5,
          }}>
            <div style={{
              height: '100%',
              background: 'linear-gradient(90deg, #00C8FF, #0057A8)',
              boxShadow: '0 0 7px rgba(0,200,255,0.8)',
              animation: `pi-countdown 5s linear forwards`,
              animationPlayState: introExiting ? 'paused' : 'running',
            }} />
          </div>

          {/* Skip hint */}
          <div style={{
            position: 'absolute', bottom: 15, left: 0, right: 0, zIndex: 5,
            textAlign: 'center',
            fontSize: 10, color: 'rgba(255,255,255,0.18)',
            letterSpacing: 2.5, fontWeight: 700, textTransform: 'uppercase',
            fontFamily: "'Barlow Condensed', sans-serif",
          }}>Click anywhere to skip</div>
        </div>
      )}

      {/* ── SOLD animation overlay ── */}
      {soldAnim && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(4,8,15,0.82)',
          animation: 'sold-backdrop 3.2s ease-in-out forwards',
          backdropFilter: 'blur(6px)',
        }}>
          <FireworksCanvas />
          <div style={{
            textAlign: 'center',
            animation: 'sold-card 3.2s ease-in-out forwards',
          }}>
            {/* SOLD! badge */}
            <div style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 'clamp(5rem, 12vw, 9rem)',
              letterSpacing: 12,
              lineHeight: 1,
              color: '#00D97E',
              textShadow: '0 0 40px rgba(0,217,126,0.8), 0 0 80px rgba(0,217,126,0.4)',
              animation: 'sold-badge 0.6s cubic-bezier(0.22,1,0.36,1) 0.1s both',
            }}>SOLD!</div>

            {/* Divider */}
            <div style={{ width: 80, height: 2, background: 'rgba(0,217,126,0.4)', borderRadius: 99, margin: '10px auto 18px' }} />

            {/* Player name */}
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 'clamp(1.4rem, 3vw, 2rem)',
              fontWeight: 900, letterSpacing: 4,
              textTransform: 'uppercase', color: '#FFFFFF',
              marginBottom: 6,
              animation: 'sold-fade-up 0.5s ease-out 0.4s both',
            }}>
              {soldAnim.playerName}
            </div>

            {/* "sold to" label */}
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: 3,
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)',
              marginBottom: 14,
              animation: 'sold-fade-up 0.5s ease-out 0.55s both',
            }}>sold to</div>

            {/* Team logo + name */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
              animation: 'sold-fade-up 0.5s ease-out 0.65s both',
            }}>
              {soldAnim.teamLogo && (
                <img src={soldAnim.teamLogo} alt={soldAnim.teamName} style={{
                  width: 64, height: 64, objectFit: 'contain', borderRadius: '50%',
                  border: '2px solid rgba(0,120,194,0.6)',
                  boxShadow: '0 0 24px rgba(0,120,194,0.5)',
                  background: 'rgba(255,255,255,0.08)',
                  padding: 4,
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

            {/* Price */}
            <div style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 'clamp(1.2rem, 2.5vw, 1.8rem)',
              fontWeight: 700, color: '#00D97E',
              marginTop: 18,
              animation: 'sold-fade-up 0.5s ease-out 0.8s both',
            }}>₹{soldAnim.amount.toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* ── Flying bid amount ── */}
      {flyAnim && (
        <div
          key={flyAnim.id}
          onAnimationEnd={() => setFlyAnim(null)}
          style={{
            position: 'fixed',
            left: flyAnim.x,
            top: flyAnim.y,
            zIndex: 3000,
            pointerEvents: 'none',
            fontFamily: "'Space Mono', monospace",
            fontWeight: 800,
            fontSize: 20,
            color: '#00D97E',
            textShadow: '0 0 20px rgba(0,217,126,0.9), 0 0 40px rgba(0,217,126,0.5)',
            whiteSpace: 'nowrap',
            animation: 'bid-fly 0.72s cubic-bezier(0.4,0,0.2,1) forwards',
            ['--bid-dx' as string]: `${flyAnim.tx - flyAnim.x}px`,
            ['--bid-dy' as string]: `${flyAnim.ty - flyAnim.y}px`,
          } as React.CSSProperties}
        >
          ₹{flyAnim.amount.toLocaleString()}
        </div>
      )}

      {/* ── Bid-down password modal ── */}
      {bidDownPending !== null && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setBidDownPending(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'linear-gradient(145deg, #0d1f38 0%, #081828 100%)',
              border: '1px solid rgba(255,61,90,0.35)',
              borderRadius: 16,
              padding: '28px 28px 24px',
              width: 300,
              boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(255,61,90,0.12)',
              display: 'flex', flexDirection: 'column', gap: 16,
            }}
          >
            {/* Header */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>🔒</div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '1.15rem', letterSpacing: 3, color: '#FF3D5A', textTransform: 'uppercase' }}>
                Bid Down
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.40)', letterSpacing: 1.5, marginTop: 4 }}>
                Administrator authorisation required
              </div>
            </div>

            {/* Password input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 8, letterSpacing: 2.5, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', fontWeight: 800 }}>Password</label>
              <input
                type="password"
                autoFocus
                value={bidDownPassword}
                onChange={e => { setBidDownPassword(e.target.value); setBidDownPwError(''); }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    if (bidDownPassword === 'password') {
                      handleBid(bidDownPending!, false);
                      setBidDownPending(null);
                    } else {
                      setBidDownPwError('Incorrect password.');
                    }
                  }
                  if (e.key === 'Escape') setBidDownPending(null);
                }}
                placeholder="Enter password"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: `1px solid ${bidDownPwError ? 'rgba(255,61,90,0.6)' : 'rgba(255,255,255,0.15)'}`,
                  borderRadius: 8, padding: '9px 12px',
                  color: '#fff', fontSize: 13, fontFamily: "'Space Mono', monospace",
                  outline: 'none', letterSpacing: 2,
                  transition: 'border 0.2s',
                }}
              />
              {bidDownPwError && (
                <div style={{ fontSize: 10, color: '#FF3D5A', fontWeight: 600, letterSpacing: 0.5 }}>{bidDownPwError}</div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setBidDownPending(null)}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
                  background: 'transparent', color: 'rgba(255,255,255,0.55)', fontSize: 12,
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: 1.5,
                  textTransform: 'uppercase', cursor: 'pointer',
                }}
              >Cancel</button>
              <button
                onClick={() => {
                  if (bidDownPassword === 'password') {
                    handleBid(bidDownPending!, false);
                    setBidDownPending(null);
                  } else {
                    setBidDownPwError('Incorrect password.');
                  }
                }}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 8, border: 'none',
                  background: 'linear-gradient(135deg, #FF3D5A 0%, #D42040 100%)',
                  color: '#fff', fontSize: 12,
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, letterSpacing: 1.5,
                  textTransform: 'uppercase', cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(255,61,90,0.45)',
                }}
              >Confirm ↓</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuctionPage;
