import React, { useEffect, useRef, useState } from 'react';
import { Player, Team } from '../types';
import FireworksCanvas from '../components/FireworksCanvas';

interface Bid {
  playerId: number;
  teamId: number;
  amount: number;
  time: string;
}

interface SessionSale {
  playerName: string;
  teamId: number;
  teamName: string;
  amount: number;
}

const BID_INCREMENT = 2000;
const BG = '#020617';

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
  const [sessionSales, setSessionSales] = useState<SessionSale[]>([]);
  const [showHotDemand, setShowHotDemand] = useState(false);
  const hotDemandShownForRef = useRef<number | null>(null); // player id that already saw the banner
  type AuctionEvent = { id: number; type: 'bid' | 'sold' | 'unsold'; playerName: string; teamName?: string; amount?: number; time: string; };
  const [auctionLog, setAuctionLog] = useState<AuctionEvent[]>([]);
  const eventIdRef = useRef(0);
  const [unsoldCount, setUnsoldCount] = useState(0);
  const [totalBidCount, setTotalBidCount] = useState(0);
  const [showLiveFeed, setShowLiveFeed] = useState(false);
  const [showNextUp, setShowNextUp] = useState(false);
  const [allSoldPlayers, setAllSoldPlayers] = useState<{ name: string; teamId: number; amount: number }[]>([]);

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
        const list: Player[] = Array.isArray(data) ? data : (data && typeof data === 'object' ? [data] : []);
        setPlayers(list);
      })
      .catch(err => { setPlayers([]); console.error('Failed to fetch players:', err); });

    fetch('http://localhost:8282/api/players/last-sold?count=1000')
      .then(res => res.json())
      .then((data: unknown) => {
        const list: Player[] = Array.isArray(data) ? data as Player[] : [];
        setAllSoldPlayers(
          list
            .filter((p: Player) => p.teamId != null)
            .map((p: Player) => ({ name: p.name, teamId: p.teamId as number, amount: p.soldPrice ?? 0 }))
        );
      })
      .catch(err => console.error('Failed to seed sold players:', err));

    fetch('http://localhost:8282/api/players/last-sold?count=5')
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

  const groupsWithPlayers = new Set(
    players
      .filter(p => p.status === 'NOT_ASSIGNED' && Number(p.skillId) === selectedSkill)
      .map(p => p.groupCode)
  );

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
      @keyframes card-glow{0%,100%{box-shadow:0 8px 40px rgba(0,0,0,0.5),0 0 0 1px rgba(0,150,220,0.20),inset 0 1px 0 rgba(255,255,255,0.06)}50%{box-shadow:0 8px 60px rgba(0,0,0,0.5),0 0 28px rgba(0,150,220,0.50),0 0 60px rgba(0,150,220,0.20),0 0 0 1px rgba(0,200,255,0.45),inset 0 1px 0 rgba(255,255,255,0.06)}}
      @keyframes live-blink{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.2;transform:scale(0.6)}}
      @keyframes stat-enter{0%{opacity:0;transform:translateY(9px) scale(0.91)}100%{opacity:1;transform:translateY(0) scale(1)}}
      @keyframes name-shimmer{0%{transform:translateX(-160%) skewX(-14deg);opacity:0}15%{opacity:0.65}100%{transform:translateX(320%) skewX(-14deg);opacity:0}}
      @keyframes corner-glow{0%,100%{opacity:0.45}50%{opacity:1}}
      .auction-player-card{animation:card-glow 3.5s ease-in-out infinite}
      @keyframes hot-demand-enter{0%{opacity:0;transform:translateY(-60px) scale(0.8)}18%{opacity:1;transform:translateY(0) scale(1.04)}28%{transform:scale(1)}78%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-30px) scale(0.88)}}
      @keyframes flame-flicker{0%,100%{text-shadow:0 0 28px rgba(255,140,0,0.9),0 0 55px rgba(255,80,0,0.5),0 2px 4px rgba(0,0,0,0.3)}50%{text-shadow:0 0 55px rgba(255,200,0,0.99),0 0 110px rgba(255,100,0,0.72),0 0 180px rgba(255,50,0,0.35)}}
      @keyframes summary-card-in{0%{opacity:0;transform:translateY(32px) scale(0.94)}100%{opacity:1;transform:translateY(0) scale(1)}}
      @keyframes team-leader-glow{0%,100%{box-shadow:0 0 0 1px rgba(255,215,0,0.45),0 0 20px rgba(255,215,0,0.18),0 4px 24px rgba(0,0,0,0.5)}50%{box-shadow:0 0 0 2px rgba(255,215,0,0.75),0 0 38px rgba(255,215,0,0.35),0 4px 24px rgba(0,0,0,0.5)}}
      :root{
        --sidebar:clamp(140px,15vw,248px);
        --grid-gap:clamp(5px,0.55vw,10px);
        --card-logo:clamp(52px,5.5vw,80px);
        --card-px:clamp(5px,0.6vw,10px);
        --card-py:clamp(4px,0.45vw,7px);
        --card-gap:clamp(3px,0.42vw,6px);
        --watermark:clamp(1.2rem,1.7vw,3rem);
        --team-nm:clamp(0.62rem,0.82vw,1.08rem);
        --purse-val:clamp(8px,0.8vw,12px);
        --poc-avatar:clamp(13px,1.3vw,20px);
        --poc-name:clamp(6px,0.7vw,10px);
        --bid-btn:clamp(11px,1.1vw,15px);
        --squad-nm:clamp(7px,0.85vw,11px);
        --squad-price:clamp(10px,1vw,13px);
      }
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

  // Trigger hot demand banner at 5× base price — fires once per player id.
  // Uses player id (not index) so the guard survives when the same index gets
  // a new player after a sale (currentPlayerIdx unchanged, auctionPlayers changed).
  useEffect(() => {
    const currentPlayer = auctionPlayers[currentPlayerIdx];
    if (!currentPlayer || hotDemandShownForRef.current === currentPlayer.id) return;
    // Also guard against stale currentBid from the previous player firing before
    // setCurrentBid(0) runs — a player with 0 bids in the log hasn't been bid on yet.
    const playerBidCount = bids.filter(b => b.playerId === currentPlayer.id).length;
    if (playerBidCount === 0 || currentBid < currentPlayer.basePrice * 5) return;
    hotDemandShownForRef.current = currentPlayer.id;
    setShowHotDemand(true);
    const t = setTimeout(() => setShowHotDemand(false), 2800);
    return () => clearTimeout(t);
  }, [currentBid, bids, auctionPlayers, currentPlayerIdx]);

  const introSkillName = introPlayer
    ? (skills.find(s => s.id === Number(introPlayer.skillId))?.skillName ?? introPlayer.skillName ?? '')
    : '';

  /* ── Setup screen ─────────────────────────────────────────────────── */
  if (!auctionStarted) {
    const canStart = !!(selectedSkill && selectedGroupCode && groupsWithPlayers.has(selectedGroupCode));
    const selectedSkillObj = skills.find(s => s.id === selectedSkill);

    // Skill color palette matching team card accents
    const skillAccent = (name: string) => {
      const k = name.toUpperCase();
      if (k.includes('BAT')) return { color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.3)' };
      if (k.includes('BOWL')) return { color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.3)' };
      if (k.includes('ALL')) return { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' };
      return { color: '#818cf8', bg: 'rgba(129,140,248,0.1)', border: 'rgba(129,140,248,0.3)' };
    };

    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(245,158,11,0.08) 0%, rgba(2,6,23,0.0) 60%), #020617',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '2rem', position: 'relative', overflow: 'hidden',
        }}
        onClick={() => openDropdown && setOpenDropdown(null)}
      >
        {/* Grid */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(148,163,184,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,0.04) 1px,transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        {/* Title */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          marginBottom: 10, position: 'relative', zIndex: 1,
          animation: 'setup-fade-up 0.5s ease-out 0.1s both',
        }}>
          <img
            src="/epl-logo.png"
            alt="EPL Season 8"
            style={{
              height: 'clamp(120px, 16vw, 200px)',
              width: 'auto', objectFit: 'contain',
              filter: 'drop-shadow(0 0 28px rgba(245,158,11,0.65)) drop-shadow(0 6px 18px rgba(0,0,0,0.75))',
            }}
          />
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 'clamp(2.8rem, 6vw, 5rem)',
            fontWeight: 900,
            background: 'linear-gradient(90deg, #f59e0b, #fcd34d, #f59e0b)',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: 8, textTransform: 'uppercase',
            lineHeight: 1,
            animation: 'shimmerText 3s linear infinite',
          }}>Auction</div>
        </div>

        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: 5.5,
          color: '#475569', textTransform: 'uppercase',
          marginBottom: 10, position: 'relative', zIndex: 1,
          animation: 'setup-fade-up 0.5s ease-out 0.18s both',
        }}>Select Skill &amp; Group to Begin</div>

        {/* Divider */}
        <div style={{
          width: 72, height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.5), transparent)',
          margin: '0 auto 36px',
          animation: 'setup-expand 0.55s ease-out 0.28s both',
          position: 'relative', zIndex: 1,
        }} />

        {/* Card */}
        <div style={{
          background: 'rgba(15,23,42,0.8)',
          border: '1px solid rgba(245,158,11,0.15)',
          borderRadius: 18,
          padding: '32px 32px 28px',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 40px rgba(245,158,11,0.04), inset 0 1px 0 rgba(245,158,11,0.08)',
          width: '100%', maxWidth: 460,
          animation: 'setup-scale-in 0.6s cubic-bezier(0.22,1,0.36,1) 0.3s both',
          position: 'relative', zIndex: 1,
        }}>

          {/* 01 · Skill */}
          <div style={{ marginBottom: 24 }}>
            <div style={{
              fontSize: 9, fontWeight: 800, letterSpacing: 3,
              color: '#475569', textTransform: 'uppercase',
              marginBottom: 12, display: 'flex', alignItems: 'center', gap: 7,
            }}>
              <span style={{ fontSize: 11, color: '#f59e0b', fontFamily: "'Space Mono', monospace" }}>01</span>
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
                      border: `1px solid ${isActive ? acc.border : 'rgba(148,163,184,0.1)'}`,
                      borderBottom: `3px solid ${isActive ? acc.color : 'rgba(148,163,184,0.1)'}`,
                      background: isActive ? acc.bg : 'rgba(30,41,59,0.6)',
                      color: isActive ? acc.color : '#475569',
                      cursor: 'pointer',
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: 14, fontWeight: 800, letterSpacing: 1.5,
                      textTransform: 'uppercase',
                      transition: 'all 0.18s',
                      boxShadow: isActive
                        ? `0 0 14px ${acc.color}40, 0 4px 12px rgba(0,0,0,0.3)`
                        : '0 2px 6px rgba(0,0,0,0.2)',
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
              color: '#475569', textTransform: 'uppercase',
              marginBottom: 12, display: 'flex', alignItems: 'center', gap: 7,
            }}>
              <span style={{ fontSize: 11, color: '#f59e0b', fontFamily: "'Space Mono', monospace" }}>02</span>
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
                    ? '1px solid rgba(245,158,11,0.40)'
                    : '1px solid rgba(148,163,184,0.1)',
                  borderBottom: `3px solid ${selectedGroupCode ? '#f59e0b' : 'rgba(148,163,184,0.1)'}`,
                  background: selectedGroupCode ? 'rgba(245,158,11,0.08)' : 'rgba(30,41,59,0.6)',
                  color: selectedGroupCode ? '#f59e0b' : '#475569',
                  cursor: selectedSkill && availableGroups.length > 0 ? 'pointer' : 'not-allowed',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 15, fontWeight: 800, letterSpacing: 2,
                  textTransform: 'uppercase',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'all 0.18s',
                  boxShadow: selectedGroupCode ? '0 0 12px rgba(245,158,11,0.2), 0 2px 8px rgba(0,0,0,0.3)' : '0 2px 6px rgba(0,0,0,0.2)',
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
                  background: 'rgba(15,23,42,0.98)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(245,158,11,0.2)',
                  borderRadius: 10, overflow: 'hidden', zIndex: 10,
                  boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 30px rgba(245,158,11,0.05)',
                  animation: 'dropdown-appear 0.18s ease-out both',
                }}>
                  {availableGroups.map((group, gi) => {
                    const isChosen = selectedGroupCode === group.groupCode;
                    const hasPlayers = groupsWithPlayers.has(group.groupCode);
                    return (
                      <button
                        key={group.groupCode}
                        onClick={() => { if (hasPlayers) { setSelectedGroupCode(group.groupCode); setOpenDropdown(null); } }}
                        disabled={!hasPlayers}
                        style={{
                          width: '100%', padding: '12px 18px',
                          background: isChosen ? 'rgba(245,158,11,0.1)' : 'transparent',
                          border: 'none',
                          borderBottom: gi < availableGroups.length - 1 ? '1px solid rgba(148,163,184,0.06)' : 'none',
                          color: !hasPlayers ? '#334155' : isChosen ? '#f59e0b' : '#94a3b8',
                          cursor: hasPlayers ? 'pointer' : 'not-allowed',
                          opacity: hasPlayers ? 1 : 0.4,
                          fontFamily: "'Barlow Condensed', sans-serif",
                          fontSize: 16, fontWeight: 800, letterSpacing: 2,
                          textTransform: 'uppercase', textAlign: 'left',
                          display: 'flex', alignItems: 'center', gap: 10,
                          transition: 'background 0.12s, color 0.12s',
                        }}
                        onMouseEnter={e => { if (hasPlayers && !isChosen) { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(245,158,11,0.06)'; (e.currentTarget as HTMLButtonElement).style.color = '#f59e0b'; } }}
                        onMouseLeave={e => { if (hasPlayers && !isChosen) { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8'; } }}
                      >
                        <span style={{ fontSize: 11, color: !hasPlayers ? '#334155' : isChosen ? '#f59e0b' : '#334155' }}>
                          {isChosen ? '●' : '○'}
                        </span>
                        Group {group.groupCode}
                        {!hasPlayers && (
                          <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 700, letterSpacing: 1, color: '#C0CCDB', textTransform: 'uppercase' }}>
                            No players
                          </span>
                        )}
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
              background: canStart ? 'linear-gradient(135deg, #f59e0b, #b45309)' : 'rgba(245,158,11,0.1)',
              color: canStart ? '#020617' : '#475569',
              cursor: canStart ? 'pointer' : 'not-allowed',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 20, fontWeight: 900, letterSpacing: 4,
              textTransform: 'uppercase',
              boxShadow: canStart ? '0 0 30px rgba(245,158,11,0.4), 0 6px 20px rgba(0,0,0,0.4)' : 'none',
              transition: 'all 0.22s',
              position: 'relative', overflow: 'hidden',
            }}
            onMouseEnter={e => { if (canStart) (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 50px rgba(245,158,11,0.6), 0 6px 24px rgba(0,0,0,0.5)'; }}
            onMouseLeave={e => { if (canStart) (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 30px rgba(245,158,11,0.4), 0 6px 20px rgba(0,0,0,0.4)'; }}
          >
            {canStart && (
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)', animation: 'pi-shimmer 3s ease-in-out 0.6s infinite' }} />
            )}
            Launch Auction
          </button>
        </div>

        {/* Bottom hint */}
        <div style={{
          marginTop: 20, fontSize: 10, color: '#475569',
          letterSpacing: 2.5, textTransform: 'uppercase',
          fontFamily: "'Barlow Condensed', sans-serif",
          animation: 'setup-fade-up 0.5s ease-out 0.6s both',
          position: 'relative', zIndex: 1,
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

  if (teams.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#f59e0b', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2rem', letterSpacing: 2 }}>Loading teams…</div>
      </div>
    );
  }

  if (auctionPlayers.length === 0) {
    if (sessionSales.length === 0) {
      return (
        <div style={{ minHeight: '100vh', background: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: '#94a3b8', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2rem', letterSpacing: 2 }}>
            All players auctioned or no players for selected skill!
          </div>
        </div>
      );
    }

    // ── Session summary ────────────────────────────────────────────────
    const summaryTotalSpend = sessionSales.reduce((s, x) => s + x.amount, 0);
    const summaryTopSale = sessionSales.reduce((a, b) => a.amount > b.amount ? a : b);
    const summaryAvgPrice = Math.round(summaryTotalSpend / sessionSales.length);
    const summaryTeamSpend: { [id: number]: number } = {};
    sessionSales.forEach(s => { summaryTeamSpend[s.teamId] = (summaryTeamSpend[s.teamId] ?? 0) + s.amount; });
    let biggestSpenderId = 0;
    let biggestSpend = 0;
    Object.entries(summaryTeamSpend).forEach(([id, amt]) => { if (amt > biggestSpend) { biggestSpenderId = Number(id); biggestSpend = amt; } });
    const biggestSpenderTeam = teams.find(t => t.id === biggestSpenderId);

    return (
      <div style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 50% 30%, rgba(0,25,55,0.99) 0%, rgba(2,6,18,0.99) 70%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', position: 'relative',
        padding: '40px 20px',
      }}>
        {/* Grid background */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(255,215,0,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,215,0,0.025) 1px,transparent 1px)',
          backgroundSize: '72px 72px',
        }} />
        <div style={{
          position: 'absolute', width: 800, height: 800, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,180,0,0.07) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 720, textAlign: 'center' }}>
          {/* Label */}
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 11, fontWeight: 800, color: '#FFD700',
            letterSpacing: 8, textTransform: 'uppercase', marginBottom: 12,
            textShadow: '0 0 18px rgba(255,215,0,0.5)',
            animation: 'pi-label 0.7s ease-out 0.1s both',
          }}>EPL 8 · Grand Auction</div>

          {/* Headline */}
          <div style={{
            fontFamily: "'Bebas Neue', 'Barlow Condensed', sans-serif",
            fontSize: 'clamp(3.5rem, 10vw, 7rem)',
            color: '#FFD700', letterSpacing: 8, lineHeight: 1,
            textShadow: '0 0 60px rgba(255,215,0,0.65), 0 0 120px rgba(255,215,0,0.30)',
            animation: 'ab-blast 0.8s cubic-bezier(0.22,1,0.36,1) 0.2s both, ab-glow 2.8s ease-in-out 1s infinite',
            marginBottom: 8,
          }}>Auction Complete</div>

          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: '1rem', fontWeight: 800,
            color: 'rgba(255,255,255,0.35)', letterSpacing: 5,
            textTransform: 'uppercase', marginBottom: 32,
            animation: 'pi-slide-up 0.5s ease-out 0.55s both',
          }}>
            {selectedGroupCode ? `Group ${selectedGroupCode} · ` : ''}Final Summary
          </div>

          {/* Gold rule */}
          <div style={{
            height: 2, marginBottom: 32,
            background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.65), transparent)',
            animation: 'ab-line 0.6s ease-out 0.7s both',
          }} />

          {/* Stat cards */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16,
            animation: 'summary-card-in 0.6s cubic-bezier(0.22,1,0.36,1) 0.85s both',
          }}>
            {[
              { label: 'Players Sold', value: String(sessionSales.length), color: '#00D97E', icon: '⚡', sub: undefined as string | undefined },
              { label: 'Total Spend', value: `₹${summaryTotalSpend.toLocaleString()}`, color: '#FFB547', icon: '💰', sub: undefined as string | undefined },
              { label: 'Highest Sale', value: `₹${summaryTopSale.amount.toLocaleString()}`, color: '#FF6B6B', icon: '🏆', sub: summaryTopSale.playerName },
              { label: 'Average Price', value: `₹${summaryAvgPrice.toLocaleString()}`, color: '#B983FF', icon: '📊', sub: undefined as string | undefined },
            ].map(stat => (
              <div key={stat.label} style={{
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${stat.color}28`,
                borderTop: `2px solid ${stat.color}65`,
                borderRadius: 14, padding: '18px 14px 16px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>{stat.icon}</div>
                <div style={{
                  fontSize: 8, fontWeight: 800, letterSpacing: 2.5,
                  color: 'rgba(255,255,255,0.32)', textTransform: 'uppercase',
                  marginBottom: 8, fontFamily: "'Barlow Condensed', sans-serif",
                }}>{stat.label}</div>
                <div style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: '1.3rem', fontWeight: 700,
                  color: stat.color, textShadow: `0 0 18px ${stat.color}55`,
                  lineHeight: 1,
                }}>{stat.value}</div>
                {stat.sub && (
                  <div style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 11, color: 'rgba(255,255,255,0.40)', marginTop: 5, letterSpacing: 1,
                  }}>{stat.sub}</div>
                )}
              </div>
            ))}
          </div>

          {/* Biggest spender */}
          {biggestSpenderTeam && (
            <div style={{
              background: 'rgba(0,120,194,0.08)',
              border: '1px solid rgba(0,200,255,0.22)',
              borderRadius: 14, padding: '16px 20px',
              display: 'flex', alignItems: 'center', gap: 18, marginBottom: 28,
              animation: 'summary-card-in 0.6s cubic-bezier(0.22,1,0.36,1) 1.0s both',
            }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <div style={{
                  position: 'absolute', inset: -8, borderRadius: '50%',
                  background: 'rgba(0,200,255,0.20)', filter: 'blur(12px)',
                  pointerEvents: 'none',
                }} />
                <div style={{
                  width: 90, height: 90, borderRadius: '50%', overflow: 'hidden', position: 'relative',
                  border: '2px solid rgba(0,200,255,0.70)',
                  boxShadow: '0 0 24px rgba(0,200,255,0.55), 0 0 50px rgba(0,200,255,0.20)',
                  background: 'rgba(2,6,23,0.92)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <img src={biggestSpenderTeam.logo} alt={biggestSpenderTeam.name} style={{
                    width: '86%', height: '86%', objectFit: 'contain',
                  }} />
                </div>
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{
                  fontSize: 7, fontWeight: 800, letterSpacing: 2.5,
                  color: 'rgba(0,200,255,0.50)', textTransform: 'uppercase',
                  fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 3,
                }}>Biggest Spender</div>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: '1.2rem', fontWeight: 900,
                  color: '#FFFFFF', letterSpacing: 2, textTransform: 'uppercase',
                }}>{biggestSpenderTeam.name}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: '1.1rem', fontWeight: 700,
                  color: '#00C8FF', textShadow: '0 0 18px rgba(0,200,255,0.5)',
                }}>₹{biggestSpend.toLocaleString()}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', letterSpacing: 1 }}>
                  {Math.round((biggestSpend / summaryTotalSpend) * 100)}% of total
                </div>
              </div>
            </div>
          )}

          {/* New auction button */}
          <button
            onClick={() => { setSessionSales([]); setAuctionStarted(false); setSelectedGroupCode(''); setBids([]); setUnsoldCount(0); setTotalBidCount(0); }}
            style={{
              padding: '14px 48px', borderRadius: 999, border: 'none',
              background: 'linear-gradient(135deg, #0088E0 0%, #0060A8 100%)',
              color: '#fff',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 18, fontWeight: 900, letterSpacing: 4,
              textTransform: 'uppercase', cursor: 'pointer',
              boxShadow: '0 0 30px rgba(0,136,224,0.5), 0 6px 24px rgba(0,0,0,0.4)',
              animation: 'summary-card-in 0.6s cubic-bezier(0.22,1,0.36,1) 1.2s both',
            }}
          >Start New Auction</button>
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
        setTotalBidCount(c => c + 1);
        setAuctionLog(prev => [{ id: ++eventIdRef.current, type: 'bid' as const, playerName: player.name, teamName: teams.find(t => t.id === teamId)?.name ?? '—', amount: player.basePrice, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 80));
        return;
      } else {
        const nextBid = currentBid + BID_INCREMENT;
        if (purse < nextBid) { setError('Insufficient funds to bid.'); return; }
        setCurrentBid(nextBid);
        setCurrentBidTeam(teamId);
        setBids([...bids, { playerId: player.id, teamId, amount: nextBid, time: new Date().toLocaleTimeString() }]);
        setTotalBidCount(c => c + 1);
        setAuctionLog(prev => [{ id: ++eventIdRef.current, type: 'bid' as const, playerName: player.name, teamName: teams.find(t => t.id === teamId)?.name ?? '—', amount: nextBid, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 80));
        return;
      }
    }
    if (currentBid === player.basePrice || currentBid === 0) { setError('Bid is already at base price.'); return; }
    const nextBid = currentBid - BID_INCREMENT;
    if (nextBid < player.basePrice) { setError('Bid cannot go below base price.'); return; }
    setCurrentBid(nextBid);
    setCurrentBidTeam(teamId);
    setBids([...bids, { playerId: player.id, teamId, amount: nextBid, time: new Date().toLocaleTimeString() }]);
    setTotalBidCount(c => c + 1);
    setAuctionLog(prev => [{ id: ++eventIdRef.current, type: 'bid' as const, playerName: player.name, teamName: teams.find(t => t.id === teamId)?.name ?? '—', amount: nextBid, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 80));
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
    setAuctionLog(prev => [{ id: ++eventIdRef.current, type: 'sold' as const, playerName: player.name, teamName: soldTeam?.name ?? '—', amount: soldAmount, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 80));

    setSessionSales(prev => [...prev, {
      playerName: player.name,
      teamId: currentBidTeam ?? 0,
      teamName: soldTeam?.name ?? '—',
      amount: soldAmount,
    }]);
    setAllSoldPlayers(prev => [...prev, { name: player.name, teamId: currentBidTeam ?? 0, amount: soldAmount }]);

    fetch('http://localhost:8282/api/players/last-sold?count=5')
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
      setAuctionLog([]);
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
    setUnsoldCount(c => c + 1);
    setPlayers(players.filter(p => p.id !== player.id));
    setAuctionPlayers(auctionPlayers.filter((_, idx) => idx !== currentPlayerIdx));
    setCurrentPlayerIdx(idx => idx >= auctionPlayers.length - 1 ? 0 : idx);
    setAuctionLog([]);
    setError('');
  };

  /* ── Main auction screen ──────────────────────────────────────────── */
  return (
    <div style={{ height: 'calc(100vh - 56px)', background: '#020617', padding: '0.35rem 0.6rem', width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* ── Title bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexShrink: 0, marginBottom: 2, position: 'relative' }}>
        {/* Auction progress — left side */}
        {auctionStarted && auctionPlayers.length > 0 && (
          <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, minWidth: 90 }}>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: 'rgba(245,158,11,0.5)', letterSpacing: 3, textTransform: 'uppercase' }}>Player</span>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.4rem', fontWeight: 900, color: '#f59e0b', lineHeight: 1 }}>
              {currentPlayerIdx + 1}
              <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.28)', marginLeft: 4 }}>/ {auctionPlayers.length}</span>
            </span>
            <div style={{ height: 3, width: '100%', background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(currentPlayerIdx / auctionPlayers.length) * 100}%`, background: 'linear-gradient(90deg, #f59e0b, #fcd34d)', borderRadius: 99, transition: 'width 0.6s ease' }} />
            </div>
          </div>
        )}
        {/* left rule */}
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.35))' }} />

        {/* badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img
            src="/epl-logo.png"
            alt="EPL Season 8"
            style={{
              height: 'clamp(42px, 5.5vw, 72px)',
              width: 'auto',
              objectFit: 'contain',
              filter: 'drop-shadow(0 0 14px rgba(245,158,11,0.55)) drop-shadow(0 2px 8px rgba(0,0,0,0.7))',
              flexShrink: 0,
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0 }}>
            <span style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 'clamp(7px, 0.7vw, 11px)', fontWeight: 700, letterSpacing: 4,
              color: 'rgba(245,158,11,0.55)', textTransform: 'uppercase', lineHeight: 1.4,
            }}>EPAM Premier League</span>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 'clamp(2rem, 3.8vw, 3rem)',
              fontWeight: 900, letterSpacing: 6,
              textTransform: 'uppercase', lineHeight: 1,
              background: 'linear-gradient(90deg, #f59e0b 0%, #fcd34d 40%, #f59e0b 70%, #fbbf24 100%)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              animation: 'shimmerText 3s linear infinite',
              textShadow: 'none',
              filter: 'drop-shadow(0 0 18px rgba(245,158,11,0.7))',
            }}>The Grand Auction</span>
          </div>
        </div>

        {/* right rule */}
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(245,158,11,0.35), transparent)' }} />

        {/* Panel toggles */}
        <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 6 }}>
          {([
            { key: 'liveFeed', label: 'Live Feed', active: showLiveFeed, toggle: () => setShowLiveFeed(v => !v), color: '#38bdf8' },
            { key: 'nextUp',   label: 'Next Up',   active: showNextUp,   toggle: () => setShowNextUp(v => !v),   color: '#818cf8' },
          ] as const).map(({ key, label, active, toggle, color }) => (
            <button key={key} onClick={toggle} style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 8, fontWeight: 700, letterSpacing: 2,
              textTransform: 'uppercase',
              padding: '3px 9px',
              borderRadius: 99,
              border: `1px solid ${active ? color : 'rgba(255,255,255,0.12)'}`,
              background: active ? `${color}22` : 'rgba(255,255,255,0.04)',
              color: active ? color : 'rgba(255,255,255,0.30)',
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              userSelect: 'none',
            }}>
              {active ? '▐ ' : '○ '}{label}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'var(--sidebar) 1fr var(--sidebar)',
        gridTemplateRows: '1fr',
        gap: 'var(--grid-gap)',
        width: '100%',
        flex: 1,
        minHeight: 0,
        alignItems: 'stretch',
        overflow: 'hidden',
      }}>

        {/* ── Player info card ── */}
        <div
          key={player.id}
          id="playerInfo"
          className="player-info-enter auction-player-card"
          style={{
            background: 'linear-gradient(175deg, #06111f 0%, #0c2040 55%, #081828 100%)',
            border: '1px solid rgba(0,150,220,0.22)',
            borderRadius: 16,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            position: 'relative',
          }}
        >
          {/* Role color band */}
          {(() => {
            const rc: Record<string, string> = { BATSMAN: '#f59e0b', BOWLER: '#38bdf8', ALLROUNDER: '#a78bfa', 'ALL ROUNDER': '#a78bfa', WK: '#f97316', 'WICKET KEEPER': '#f97316' };
            const roleColor = rc[(player.skillName ?? '').toUpperCase()] ?? '#64748b';
            return <div style={{ height: 3, flexShrink: 0, background: `linear-gradient(90deg, ${roleColor}, ${roleColor}55 60%, transparent)` }} />;
          })()}

          {/* Corner brackets */}
          {(['tl','tr','bl','br'] as const).map((c, i) => (
            <div key={c} style={{
              position: 'absolute', zIndex: 10, pointerEvents: 'none',
              top: c[0] === 't' ? 8 : undefined,
              bottom: c[0] === 'b' ? 8 : undefined,
              left: c[1] === 'l' ? 8 : undefined,
              right: c[1] === 'r' ? 8 : undefined,
              width: 14, height: 14,
              borderTop: c[0] === 't' ? '2px solid rgba(0,200,255,0.80)' : 'none',
              borderBottom: c[0] === 'b' ? '2px solid rgba(0,200,255,0.80)' : 'none',
              borderLeft: c[1] === 'l' ? '2px solid rgba(0,200,255,0.80)' : 'none',
              borderRight: c[1] === 'r' ? '2px solid rgba(0,200,255,0.80)' : 'none',
              animation: 'corner-glow 2.4s ease-in-out infinite',
              animationDelay: `${i * 0.6}s`,
            }} />
          ))}

          {/* Header bar */}
          <div style={{
            textAlign: 'center',
            background: 'linear-gradient(90deg, transparent, rgba(0,150,220,0.25), transparent)',
            borderBottom: '1px solid rgba(0,180,255,0.20)',
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
            {/* LIVE indicator */}
            <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: '#FF3D5A',
                boxShadow: '0 0 8px rgba(255,61,90,0.9), 0 0 16px rgba(255,61,90,0.4)',
                animation: 'live-blink 1.3s ease-in-out infinite',
              }} />
              <span style={{ fontSize: 7, fontWeight: 900, letterSpacing: 1.5, color: 'rgba(255,80,100,0.85)', textTransform: 'uppercase' }}>Live</span>
            </div>
          </div>

          {/* Photo — flex 2 = 40% of remaining card space; img absolutely fills the wrapper */}
          <div style={{ position: 'relative', width: '100%', flexGrow: 2, flexShrink: 1, flexBasis: 0, minHeight: 160, overflow: 'hidden' }}>
            <img
              src={player.photo}
              alt={player.name}
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center',
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
              boxShadow: '0 0 14px rgba(0,200,255,0.6)',
            }} />
            {/* Player name overlaid on photo — bold sports-card style */}
            <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, textAlign: 'center', padding: '0 12px' }}>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: '1.55rem', fontWeight: 900,
                color: '#FFFFFF',
                textTransform: 'uppercase', letterSpacing: 2.5,
                lineHeight: 1,
                textShadow: '0 0 28px rgba(0,200,255,0.6), 0 2px 10px rgba(0,0,0,0.95), 0 0 55px rgba(0,200,255,0.25)',
                position: 'relative', overflow: 'hidden', display: 'inline-block',
              }}>
                {player.name}
                {/* shimmer sweep */}
                <div style={{
                  position: 'absolute', inset: 0, pointerEvents: 'none',
                  background: 'linear-gradient(105deg, transparent 38%, rgba(255,255,255,0.38) 50%, transparent 62%)',
                  animation: 'name-shimmer 4s ease-in-out infinite',
                  animationDelay: '1.2s',
                }} />
              </div>
            </div>
          </div>

          {/* Body — flex 3 = 60% of remaining card space */}
          <div style={{ padding: '4px 8px 8px', display: 'flex', flexDirection: 'column', gap: 4, flexGrow: 3, flexShrink: 1, flexBasis: 0, minHeight: 0 }}>

            {/* Stats grid — KPI tiles */}
            {Object.keys(player.stats || {}).length > 0 && (() => {
              const statColors = ['#00C8FF', '#00D97E', '#F5A623', '#FF3D5A', '#A78BFA', '#FF8C42'];
              const entries = Object.entries(player.stats || {});
              return (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', flex: 1, minHeight: 0 }}>
                  {entries.map(([key, value], i) => {
                    const c = statColors[i % statColors.length];
                    const isWide = i === 0 && entries.length % 2 !== 0;
                    return (
                      <div key={key} style={{
                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                        alignItems: isWide ? 'center' : 'flex-start',
                        background: `linear-gradient(160deg, ${c}12 0%, rgba(4,12,28,0.6) 60%)`,
                        border: `1px solid ${c}22`,
                        borderTop: `2px solid ${c}`,
                        borderRadius: 8,
                        padding: '7px 10px 8px',
                        gridColumn: isWide ? 'span 2' : undefined,
                        position: 'relative', overflow: 'hidden',
                        animation: 'stat-enter 0.4s cubic-bezier(0.22,1,0.36,1) both',
                        animationDelay: `${i * 0.07}s`,
                      }}>
                        {/* Glow orb */}
                        <div style={{
                          position: 'absolute', right: -8, bottom: -8,
                          width: 44, height: 44, borderRadius: '50%',
                          background: `radial-gradient(circle, ${c}18 0%, transparent 70%)`,
                          pointerEvents: 'none',
                        }} />
                        <span style={{
                          fontSize: 7, fontWeight: 800, letterSpacing: 1.8,
                          color: `${c}70`, textTransform: 'uppercase',
                          fontFamily: "'Space Mono', monospace",
                        }}>{key}</span>
                        <span style={{
                          fontFamily: "'Barlow Condensed', sans-serif",
                          fontSize: isWide ? '1.6rem' : '1.45rem',
                          fontWeight: 900, color: '#fff',
                          textShadow: `0 0 18px ${c}60`,
                          lineHeight: 1, marginTop: 4,
                        }}>{value}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Bid panel */}
            {(() => {
              const playerBids = bids.filter(b => b.playerId === player.id);
              const totalBids = playerBids.length;
              const uniqueTeams = new Set(playerBids.map(b => b.teamId)).size;
              const premium = currentBid > 0 ? Math.round(((currentBid - player.basePrice) / player.basePrice) * 100) : 0;
              const nextBid = currentBid > 0 ? currentBid + BID_INCREMENT : player.basePrice;
              const bidColor = currentBid > 0 ? '#00D97E' : 'rgba(255,255,255,0.18)';
              const bidBorder = currentBid > 0 ? 'rgba(0,217,126,0.30)' : 'rgba(255,255,255,0.08)';
              return (
                <div style={{
                  background: 'rgba(4,12,28,0.75)',
                  border: `1px solid ${bidBorder}`,
                  borderRadius: 12,
                  overflow: 'hidden',
                  display: 'flex', flexDirection: 'column',
                  flex: 1, minHeight: 0,
                  boxShadow: currentBid > 0 ? '0 0 24px rgba(0,217,126,0.10)' : '0 4px 20px rgba(0,0,0,0.40)',
                }}>

                  {/* ── Row 1: Base Price ── */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px 12px',
                    background: 'linear-gradient(90deg, rgba(0,200,255,0.12) 0%, rgba(0,200,255,0.04) 100%)',
                    borderBottom: '1px solid rgba(0,200,255,0.15)',
                    flexShrink: 0,
                  }}>
                    <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: 2.5, color: 'rgba(0,200,255,0.60)', textTransform: 'uppercase' }}>Base Price</span>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 15, fontWeight: 700, color: '#00C8FF', letterSpacing: 0.5 }}>₹{player.basePrice.toLocaleString()}</span>
                  </div>

                  {/* ── Row 2: Stats — Bids · Teams · Premium ── */}
                  <div style={{
                    display: 'flex', alignItems: 'stretch',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    flexShrink: 0,
                  }}>
                    {[
                      { label: 'Bids', value: String(totalBids), color: '#00C8FF' },
                      { label: 'Teams', value: String(uniqueTeams), color: '#B983FF' },
                      { label: 'Premium', value: premium > 0 ? `+${premium}%` : '—', color: '#00D97E' },
                    ].map((item, idx, arr) => (
                      <div key={item.label} style={{
                        flex: 1,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        padding: '6px 4px',
                        borderRight: idx < arr.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                        gap: 2,
                      }}>
                        <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: 1.5, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>{item.label}</span>
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700, color: item.color, lineHeight: 1, textShadow: `0 0 10px ${item.color}55` }}>{item.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* ── Row 3: Current Bid (hero) ── */}
                  <div style={{
                    flex: 1, minHeight: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: '8px 12px 6px',
                    gap: 3,
                    background: currentBid > 0 ? 'rgba(0,217,126,0.05)' : 'transparent',
                  }}>
                    <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: 3, color: currentBid > 0 ? 'rgba(0,217,126,0.50)' : 'rgba(255,255,255,0.20)', textTransform: 'uppercase' }}>Current Bid</span>
                    <div
                      key={currentBid}
                      ref={currentBidRef}
                      style={{
                        fontFamily: "'Space Mono', monospace",
                        fontSize: currentBid > 0 ? 'clamp(1.8rem, 3.5vw, 2.5rem)' : '1.5rem',
                        fontWeight: 700, lineHeight: 1,
                        color: bidColor,
                        textShadow: currentBid > 0 ? '0 0 32px rgba(0,217,126,0.75), 0 0 65px rgba(0,217,126,0.30)' : 'none',
                        animation: currentBid > 0 ? 'bid-receive 0.45s cubic-bezier(0.22,1,0.36,1) both' : undefined,
                      }}>₹{currentBid.toLocaleString()}</div>
                  </div>

                  {/* ── Row 4: Next Bid + Leader ── */}
                  <div style={{
                    display: 'flex', alignItems: 'stretch',
                    borderTop: `1px solid ${bidBorder}`,
                    flexShrink: 0,
                  }}>
                    {/* Next bid */}
                    <div style={{
                      flex: 1,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      padding: '6px 8px',
                      borderRight: '1px solid rgba(255,255,255,0.06)',
                      gap: 2,
                    }}>
                      <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: 1.5, color: 'rgba(255,181,71,0.55)', textTransform: 'uppercase' }}>Next Bid</span>
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, color: '#FFB547', letterSpacing: 0.3 }}>₹{nextBid.toLocaleString()}</span>
                    </div>
                    {/* Leader */}
                    <div style={{
                      flex: 1,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      padding: '6px 8px',
                      gap: 2,
                      overflow: 'hidden',
                    }}>
                      <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: 1.5, color: currentBid > 0 ? 'rgba(0,217,126,0.50)' : 'rgba(255,255,255,0.20)', textTransform: 'uppercase' }}>Leader</span>
                      <span style={{
                        fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 13,
                        color: currentBid > 0 ? '#00D97E' : 'rgba(255,255,255,0.25)',
                        letterSpacing: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%',
                      }}>
                        {currentBidTeam ? (teams.find(t => t.id === currentBidTeam)?.name ?? '—') : '—'}
                      </span>
                    </div>
                  </div>

                </div>
              );
            })()}

            {/* SOLD / UNSOLD */}
            <div style={{ display: 'flex', gap: 7 }}>
              <button onClick={handleSold} style={{
                flex: 1,
                background: 'linear-gradient(135deg, #00F090 0%, #00D97E 45%, #00A85A 100%)',
                color: '#012A18', fontWeight: 900,
                border: 'none', borderRadius: 999, padding: '11px 0', fontSize: 15, cursor: 'pointer',
                fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 2.5, textTransform: 'uppercase',
                boxShadow: '0 0 26px rgba(0,217,126,0.55), 0 4px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.25)',
                transition: 'transform 0.12s, box-shadow 0.12s',
              }}>Sold</button>
              <button onClick={handleUnsold} style={{
                flex: 1,
                background: 'linear-gradient(135deg, #FF6070 0%, #FF3D5A 45%, #C4152E 100%)',
                color: '#fff', fontWeight: 900,
                border: 'none', borderRadius: 999, padding: '11px 0', fontSize: 15, cursor: 'pointer',
                fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 2.5, textTransform: 'uppercase',
                boxShadow: '0 0 26px rgba(255,61,90,0.55), 0 4px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.20)',
                transition: 'transform 0.12s, box-shadow 0.12s',
              }}>Unsold</button>
            </div>

            {error && <div style={{ color: '#FF3D5A', fontSize: 11, textAlign: 'center', fontWeight: 600 }}>{error}</div>}
          </div>
        </div>

        {/* ── Team bid grid ── */}
        <div style={{
          background: 'rgba(15,23,42,0.80)',
          border: '1px solid rgba(245,158,11,0.12)',
          borderRadius: 16,
          boxShadow: '0 4px 32px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.04)',
          padding: 'var(--grid-gap)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--card-gap)',
          minHeight: 0,
          overflow: 'hidden',
          backdropFilter: 'blur(12px)',
        }}>

          {/* Cards row */}
          {(() => {
          const teamRankByPurse = new Map(
            [...teams].sort((a, b) => (teamPurse[b.id] ?? 90000) - (teamPurse[a.id] ?? 90000))
              .map((t, i) => [t.id, i + 1])
          );
          return (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gridAutoRows: '1fr',
            gap: 'var(--card-gap)',
            flex: 1,
            minHeight: 0,
          }}>
          {teams.map(team => {
            const isLeader = currentBidTeam === team.id;
            const canDecrement = isLeader && !(currentBid === player.basePrice || currentBid === 0);
            const remaining = teamPurse[team.id] ?? 0;
            const pct = team.purse > 0 ? Math.round((remaining / team.purse) * 100) : 0;
            const barColor = pct > 60 ? '#34d399' : pct > 30 ? '#f59e0b' : '#f87171';
            const rank = teamRankByPurse.get(team.id) ?? 0;
            const rankColor = rank <= 3 ? '#34d399' : rank <= 7 ? '#f59e0b' : '#f87171';
            return (
              <div key={team.id} style={{
                border: isLeader ? `2px solid ${barColor}` : '1px solid rgba(255,255,255,0.07)',
                borderBottom: `3px solid ${barColor}`,
                borderRadius: 12,
                padding: 'var(--card-py) var(--card-px)',
                background: isLeader
                  ? `linear-gradient(150deg, ${barColor}18 0%, rgba(15,23,42,0.92) 100%)`
                  : 'rgba(30,41,59,0.70)',
                boxShadow: isLeader ? undefined : '0 2px 10px rgba(0,0,0,0.30)',
                animation: isLeader ? 'team-leader-glow 1.8s ease-in-out infinite' : undefined,
                transition: 'background 0.25s, border 0.25s',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--card-gap)',
                position: 'relative',
                overflow: 'hidden',
                height: '100%',
                boxSizing: 'border-box' as const,
              }}>
                {/* Rank badge */}
                <div style={{
                  position: 'absolute', top: 6, right: 7,
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 7, fontWeight: 700, letterSpacing: 1,
                  color: rankColor, opacity: 0.75,
                }}>#{rank}</div>

                {/* Watermark */}
                <div style={{
                  position: 'absolute', right: 3, bottom: 30,
                  fontSize: 'var(--watermark)', fontWeight: 900,
                  fontFamily: "'Space Mono', monospace",
                  color: `${barColor}18`, lineHeight: 1,
                  userSelect: 'none', pointerEvents: 'none', letterSpacing: -2,
                }}>{pct}%</div>

                {/* ── Logo + Name (vertical centered) ── */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  {/* Glow bloom behind ring */}
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{
                      position: 'absolute', inset: -6, borderRadius: '50%',
                      background: barColor, opacity: 0.20, filter: 'blur(12px)',
                      pointerEvents: 'none',
                    }} />
                    <div style={{
                      width: 'var(--card-logo)', height: 'var(--card-logo)', flexShrink: 0,
                      borderRadius: '50%', overflow: 'hidden', position: 'relative',
                      border: `2px solid ${barColor}80`,
                      boxShadow: `0 0 18px ${barColor}55, 0 0 6px ${barColor}30, inset 0 0 8px rgba(0,0,0,0.6)`,
                      background: 'rgba(2,6,23,0.90)',
                      boxSizing: 'border-box' as const,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <img src={team.logo} alt={team.name} style={{
                        width: '86%', height: '86%', objectFit: 'contain',
                      }} />
                    </div>
                  </div>
                  <div style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 800, fontSize: 'var(--team-nm)',
                    color: isLeader ? barColor : '#e2e8f0',
                    textTransform: 'uppercase', letterSpacing: 1.5,
                    lineHeight: 1.15, textAlign: 'center',
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    width: '100%',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical' as const,
                  }}>{team.name}</div>
                </div>

                {/* ── Purse bar ── */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                    <span style={{ fontSize: 8, fontWeight: 800, color: '#64748b', letterSpacing: 2, textTransform: 'uppercase' }}>Purse</span>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 'var(--purse-val)', fontWeight: 700, color: barColor }}>₹{remaining.toLocaleString()}</span>
                  </div>
                  <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 99 }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 99, transition: 'width 0.6s ease', boxShadow: `0 0 6px ${barColor}66` }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                    <span style={{ fontSize: 9, color: '#94a3b8', fontFamily: "'Space Mono', monospace" }}>₹{(team.purse - remaining).toLocaleString()} spent</span>
                    <span style={{ fontSize: 9, fontWeight: 800, color: barColor }}>{pct}% left</span>
                  </div>
                </div>

                {/* ── POC chips (compact) ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {[
                    { label: 'POC1', name: team.poc1, color: '#f59e0b', grad: 'linear-gradient(135deg, #f59e0b, #b45309)' },
                    { label: 'POC2', name: team.poc2, color: '#818cf8', grad: 'linear-gradient(135deg, #818cf8, #6366f1)' },
                  ].filter(p => p.name).map(poc => {
                    const inits = (poc.name || '').trim().split(/\s+/).map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
                    return (
                      <div key={poc.label} style={{
                        display: 'flex', alignItems: 'center', gap: 'var(--card-gap)',
                        background: `${poc.color}0D`, border: `1px solid ${poc.color}25`,
                        borderRadius: 6, padding: 'clamp(2px,0.3vw,4px) clamp(4px,0.5vw,7px)',
                      }}>
                        <div style={{
                          width: 'var(--poc-avatar)', height: 'var(--poc-avatar)', borderRadius: '50%', flexShrink: 0,
                          background: poc.grad,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 'clamp(6px,0.6vw,8px)', fontWeight: 900, color: '#fff',
                          fontFamily: "'Barlow Condensed', sans-serif",
                        }}>{inits}</div>
                        <span style={{ flex: 1, fontSize: 'var(--poc-name)', fontWeight: 700, color: 'rgba(255,255,255,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: 0.5 }}>{poc.name}</span>
                        <span style={{ fontSize: 7, fontWeight: 900, color: poc.color, opacity: 0.7, fontFamily: "'Space Mono', monospace", letterSpacing: 0.5, flexShrink: 0 }}>{poc.label}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Bid buttons */}
                <div style={{ display: 'flex', gap: 5, width: '100%' }}>
                  {(() => {
                    const nextAmount = currentBid === 0 ? player.basePrice : currentBid + BID_INCREMENT;
                    const canAffordBid = (teamPurse[team.id] ?? 0) >= nextAmount;
                    const disabledUp = isLeader || !canAffordBid;
                    return (
                      <button
                        onClick={(e) => { triggerFlyAnim(e.currentTarget, nextAmount); handleBid(team.id, true); }}
                        disabled={disabledUp}
                        title={!canAffordBid && !isLeader ? `Insufficient funds — ₹${nextAmount.toLocaleString()} required` : undefined}
                        style={{
                          flex: 1,
                          background: isLeader
                            ? 'rgba(0,217,126,0.15)'
                            : !canAffordBid
                              ? 'rgba(245,166,35,0.11)'
                              : 'linear-gradient(135deg, #00D97E 0%, #00B868 100%)',
                          color: isLeader
                            ? 'rgba(0,217,126,0.45)'
                            : !canAffordBid
                              ? 'rgba(245,166,35,0.48)'
                              : '#04080F',
                          border: !canAffordBid && !isLeader ? '1px solid rgba(245,166,35,0.26)' : 'none',
                          borderRadius: 7,
                          padding: '7px 0',
                          cursor: disabledUp ? 'not-allowed' : 'pointer',
                          fontSize: 'var(--bid-btn)',
                          fontWeight: 900,
                          lineHeight: 1,
                          boxShadow: disabledUp ? 'none' : '0 3px 12px rgba(0,217,126,0.45)',
                          transition: 'transform 0.1s, box-shadow 0.1s',
                        }}
                      >↑</button>
                    );
                  })()}
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
                      fontSize: 'var(--bid-btn)',
                      fontWeight: 900,
                      lineHeight: 1,
                      boxShadow: canDecrement ? '0 3px 12px rgba(255,61,90,0.45)' : 'none',
                      transition: 'transform 0.1s, box-shadow 0.1s',
                    }}
                  >↓</button>
                </div>

                {/* ── Squad ── */}
                {(() => {
                  const teamSales = allSoldPlayers.filter(s => s.teamId === team.id);
                  const AVATAR_PALETTE = ['#f59e0b','#38bdf8','#a78bfa','#34d399','#f97316','#f43f5e','#06b6d4','#e879f9'];
                  const SLOTS = Math.max(4, teamSales.length);
                  return (
                    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', gap: 4 }}>
                      {/* header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 7, letterSpacing: 2, color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase' }}>Squad</span>
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 7, color: barColor, opacity: 0.55 }}>
                          {teamSales.length}/{SLOTS}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateRows: `repeat(${SLOTS}, 1fr)`, gap: 3, flex: 1, minHeight: 0, overflow: 'hidden' }}>
                        {Array.from({ length: SLOTS }).map((_, idx) => {
                          const sale = teamSales[idx];
                          if (sale) {
                            const ac = AVATAR_PALETTE[sale.name.charCodeAt(0) % AVATAR_PALETTE.length];
                            const parts = sale.name.split(' ');
                            const first = parts[0];
                            const rest = parts.slice(1).join(' ');
                            return (
                              <div key={idx} style={{
                                display: 'flex', alignItems: 'center', gap: 5,
                                background: `${ac}08`,
                                borderLeft: `2px solid ${ac}60`,
                                borderRadius: '0 6px 6px 0',
                                padding: '0 8px 0 7px',
                                minHeight: 0, overflow: 'hidden', height: '100%',
                              }}>
                                <div style={{
                                  width: 'var(--poc-avatar)', height: 'var(--poc-avatar)', borderRadius: '50%', flexShrink: 0,
                                  background: `${ac}20`, border: `1px solid ${ac}55`,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 'clamp(6px,0.65vw,9px)', fontWeight: 900, color: ac,
                                  fontFamily: "'Barlow Condensed', sans-serif",
                                }}>{sale.name[0]}</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{
                                    fontFamily: "'Barlow Condensed', sans-serif",
                                    fontSize: 'var(--squad-nm)', fontWeight: 800, color: '#e2e8f0',
                                    textTransform: 'uppercase', letterSpacing: 0.5,
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.1,
                                  }}>{first}</div>
                                  {rest && (
                                    <div style={{
                                      fontFamily: "'Barlow Condensed', sans-serif",
                                      fontSize: 8, color: 'rgba(255,255,255,0.32)',
                                      textTransform: 'uppercase', letterSpacing: 0.3,
                                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.1,
                                    }}>{rest}</div>
                                  )}
                                </div>
                                <div style={{
                                  fontFamily: "'Barlow Condensed', sans-serif",
                                  fontSize: 'var(--squad-price)', fontWeight: 900, color: '#fff', flexShrink: 0,
                                  background: 'linear-gradient(135deg, #059669, #34d399)',
                                  borderRadius: 5, padding: '2px 6px',
                                  letterSpacing: 0.5,
                                }}>₹{(sale.amount / 1000).toFixed(0)}K</div>
                              </div>
                            );
                          }
                          return (
                            <div key={idx} style={{
                              display: 'flex', alignItems: 'center', gap: 5,
                              border: '1px dashed rgba(255,255,255,0.06)',
                              borderRadius: 6,
                              padding: '0 8px 0 7px',
                              minHeight: 0, overflow: 'hidden', height: '100%',
                            }}>
                              <div style={{
                                width: 'var(--poc-avatar)', height: 'var(--poc-avatar)', borderRadius: '50%', flexShrink: 0,
                                border: '1px dashed rgba(255,255,255,0.10)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
                              </div>
                              <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.04)' }} />
                              <div style={{ width: 22, height: 12, borderRadius: 3, background: 'rgba(255,255,255,0.04)' }} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

              </div>
            );
          })}
          </div>
          );
          })()}{/* end cards grid */}

          {/* ── Session stats ticker ── */}
          {auctionStarted && (
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {([
                { label: 'SOLD',       value: sessionSales.length,                                color: '#34d399' },
                { label: 'UNSOLD',     value: unsoldCount,                                        color: '#f87171' },
                { label: 'TOTAL BIDS', value: totalBidCount,                                      color: '#38bdf8' },
                { label: 'REMAINING',  value: Math.max(0, auctionPlayers.length - currentPlayerIdx - 1), color: '#818cf8' },
              ] as const).map(({ label, value, color }) => (
                <div key={label} style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                  background: `${color}0A`, border: `1px solid ${color}22`,
                  borderRadius: 8, padding: '4px 0',
                }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 7, letterSpacing: 2, color: `${color}80`, textTransform: 'uppercase' }}>{label}</span>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.25rem', fontWeight: 900, color, lineHeight: 1.1 }}>{value}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── AUCTION EVENTS PANEL ── */}
          {(showLiveFeed || showNextUp) && (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 10, overflow: 'hidden' }}>

            {/* ── Live Feed ── */}
            {showLiveFeed && (
            <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'rgba(2,6,23,0.55)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '8px 10px', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0, marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ width: 3, height: 13, background: '#38bdf8', borderRadius: 99, boxShadow: '0 0 6px #38bdf8' }} />
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, fontWeight: 700, letterSpacing: 3, color: 'rgba(56,189,248,0.85)', textTransform: 'uppercase' }}>Live Feed</span>
                <div style={{ flex: 1 }} />
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 7px #34d399', animation: 'pulse 2s infinite', flexShrink: 0 }} />
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 7, color: 'rgba(52,211,153,0.60)', letterSpacing: 1.5 }}>LIVE</span>
              </div>

              {/* Events */}
              {auctionLog.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: 0.4 }}>
                  <div style={{ fontSize: 22 }}>⚡</div>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, letterSpacing: 2, color: '#475569', textTransform: 'uppercase' }}>Awaiting first bid…</span>
                </div>
              ) : (
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {auctionLog.map((evt) => {
                    const isSold = evt.type === 'sold';
                    const isUnsold = evt.type === 'unsold';
                    const isBid = evt.type === 'bid';
                    const accentColor = isSold ? '#f59e0b' : isUnsold ? '#f87171' : '#38bdf8';
                    const shortName = (evt.teamName ?? '').replace(/^EPAM\s+/i, '');
                    return (
                      <div key={evt.id} style={{
                        display: 'flex', alignItems: 'center', gap: 7,
                        padding: '5px 8px',
                        background: isSold ? 'rgba(245,158,11,0.07)' : isUnsold ? 'rgba(248,113,113,0.05)' : 'rgba(255,255,255,0.03)',
                        borderRadius: 7,
                        borderLeft: `2px solid ${accentColor}`,
                        flexShrink: 0,
                      }}>
                        {/* Icon */}
                        <span style={{ fontSize: 11, flexShrink: 0 }}>
                          {isSold ? '🏆' : isUnsold ? '✗' : '↑'}
                        </span>
                        {/* Event text */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {isBid && (
                            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, color: '#e2e8f0', letterSpacing: 0.5 }}>
                              <span style={{ color: '#38bdf8' }}>{shortName}</span>
                              {' '}bid{' '}
                              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: '#fcd34d', fontWeight: 700 }}>₹{evt.amount?.toLocaleString()}</span>
                              {' '}<span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>on {evt.playerName}</span>
                            </span>
                          )}
                          {isSold && (
                            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700 }}>
                              <span style={{ color: '#fcd34d', letterSpacing: 1 }}>SOLD</span>
                              {' — '}
                              <span style={{ color: '#f59e0b' }}>{evt.playerName}</span>
                              {' → '}
                              <span style={{ color: '#34d399' }}>{shortName}</span>
                              {' '}
                              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: '#f59e0b' }}>₹{evt.amount?.toLocaleString()}</span>
                            </span>
                          )}
                          {isUnsold && (
                            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700 }}>
                              <span style={{ color: '#f87171', letterSpacing: 1 }}>UNSOLD</span>
                              {' — '}
                              <span style={{ color: 'rgba(255,255,255,0.45)' }}>{evt.playerName}</span>
                            </span>
                          )}
                        </div>
                        {/* Time */}
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 7, color: 'rgba(255,255,255,0.22)', flexShrink: 0, letterSpacing: 0.5 }}>{evt.time}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            )}{/* end Live Feed */}

            {/* ── Next Up ── */}
            {showNextUp && (
            <div style={{ width: 260, flexShrink: 0, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'rgba(2,6,23,0.55)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '8px 10px', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0, marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ width: 3, height: 13, background: '#818cf8', borderRadius: 99, boxShadow: '0 0 6px #818cf8' }} />
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, fontWeight: 700, letterSpacing: 3, color: 'rgba(129,140,248,0.85)', textTransform: 'uppercase' }}>Next Up</span>
                <div style={{ flex: 1 }} />
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 7, color: 'rgba(255,255,255,0.25)', letterSpacing: 1 }}>
                  {auctionPlayers.length - currentPlayerIdx - 1} remaining
                </span>
              </div>

              {/* Queue */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {auctionPlayers.slice(currentPlayerIdx + 1, currentPlayerIdx + 9).length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.35 }}>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: '#475569', letterSpacing: 2, textTransform: 'uppercase' }}>Queue empty</span>
                  </div>
                ) : auctionPlayers.slice(currentPlayerIdx + 1, currentPlayerIdx + 9).map((qp, qi) => {
                  const pos = qp.skillName ?? '';
                  const pColor = '#818cf8';
                  const basePriceK = qp.basePrice >= 1000 ? `₹${(qp.basePrice / 1000).toFixed(0)}K` : `₹${qp.basePrice}`;
                  return (
                    <div key={qp.id} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '5px 8px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: 7,
                      flexShrink: 0,
                    }}>
                      {/* Queue position */}
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: 'rgba(255,255,255,0.25)', width: 16, flexShrink: 0, textAlign: 'center' }}>+{qi + 1}</span>
                      {/* Player name */}
                      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, color: '#e2e8f0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: 0.5 }}>{qp.name}</span>
                      {/* Position badge */}
                      {pos && (
                        <span style={{ fontSize: 8, fontWeight: 900, color: pColor, background: `${pColor}18`, border: `1px solid ${pColor}35`, borderRadius: 4, padding: '1px 5px', letterSpacing: 0.5, flexShrink: 0, fontFamily: "'Space Mono', monospace" }}>{pos}</span>
                      )}
                      {/* Base price */}
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, fontWeight: 700, color: 'rgba(245,158,11,0.75)', flexShrink: 0 }}>{basePriceK}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            )}{/* end Next Up */}

          </div>
          )}{/* end auction events panel */}

        </div>{/* end outer team grid container */}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0, overflow: 'hidden' }}>
        {/* ── Recent auctioned players ── */}
        <div style={{
          background: 'rgba(15,23,42,0.85)',
          border: '1px solid rgba(52,211,153,0.15)',
          borderRadius: 16,
          boxShadow: '0 4px 24px rgba(0,0,0,0.40), 0 0 30px rgba(52,211,153,0.05)',
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
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}>
            <div style={{ width: 3, height: 18, background: '#34d399', borderRadius: 99, flexShrink: 0, boxShadow: '0 0 8px rgba(52,211,153,0.6)' }} />
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: '1rem',
              fontWeight: 700,
              color: '#34d399',
              letterSpacing: 3,
              textTransform: 'uppercase',
            }}>Recent Sold Players</span>
          </div>

          <ul style={{ overflowY: 'auto', padding: 0, listStyle: 'none', margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recentSoldPlayers.slice(0, 5).map((soldPlayer) => {
              const soldTeam = teams.find(team => team.id === Number(soldPlayer.teamId));
              return (
                <li key={soldPlayer.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 6px', background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.18)', borderRadius: 8 }}>
                  <img src={soldPlayer.photo} alt={soldPlayer.name} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(52,211,153,0.30)' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 10.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{soldPlayer.name}</div>
                    <div style={{ color: '#64748b', fontSize: 9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{soldTeam?.name ?? soldPlayer.teamName ?? '—'}</div>
                  </div>
                  <span style={{ fontFamily: "'Space Mono', monospace", color: '#34d399', fontWeight: 700, fontSize: 10, flexShrink: 0 }}>₹{(soldPlayer.soldPrice ?? 0).toLocaleString()}</span>
                </li>
              );
            })}
            {recentSoldPlayers.length === 0 && (
              <li style={{ color: '#475569', fontSize: 11, textAlign: 'center', padding: '18px 0', fontStyle: 'italic' }}>No players auctioned yet.</li>
            )}
          </ul>
        </div>

        {/* ── Bid activity ── */}
        <div style={{
          background: 'rgba(15,23,42,0.85)',
          border: '1px solid rgba(56,189,248,0.15)',
          borderRadius: 16,
          boxShadow: '0 4px 24px rgba(0,0,0,0.40), 0 0 30px rgba(56,189,248,0.05)',
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
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            flexShrink: 0,
          }}>
            <div style={{ width: 3, height: 18, background: '#38bdf8', borderRadius: 99, flexShrink: 0, boxShadow: '0 0 8px rgba(56,189,248,0.6)' }} />
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: '1rem',
              fontWeight: 700,
              color: '#38bdf8',
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
                        border: '1.5px solid rgba(56,189,248,0.30)',
                        animation: `bid-radar 2s ease-out ${delay}s infinite`,
                      }} />
                    ))}
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{
                        width: 10, height: 10, borderRadius: '50%',
                        background: 'rgba(56,189,248,0.55)',
                        animation: 'bid-dot-pulse 1.4s ease-in-out infinite',
                      }} />
                    </div>
                  </div>
                  <span style={{ fontSize: 10, letterSpacing: 2, color: '#475569', textTransform: 'uppercase', fontStyle: 'italic' }}>
                    Waiting for bids…
                  </span>
                  {/* Team readiness grid */}
                  {teams.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 5, width: '100%', padding: '0 4px' }}>
                      {teams.map(team => (
                        <div key={team.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, opacity: 0.40 }}>
                          <div style={{ width: 30, height: 30, borderRadius: '50%', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.18)', boxShadow: '0 0 8px rgba(255,255,255,0.08)', background: 'rgba(2,6,23,0.92)', boxSizing: 'border-box' as const }}>
                            <img src={team.logo} alt={team.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 2 }} />
                          </div>
                          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 5.5, color: '#475569', letterSpacing: 0.5, textAlign: 'center', lineHeight: 1.2, textTransform: 'uppercase' }}>
                            {team.name.replace(/^EPAM\s+/i, '')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
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
                        ? 'linear-gradient(135deg, rgba(56,189,248,0.12) 0%, rgba(56,189,248,0.05) 100%)'
                        : 'rgba(255,255,255,0.02)',
                      border: isLatest
                        ? '1.5px solid rgba(56,189,248,0.40)'
                        : '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 8,
                      padding: isLatest ? '9px 10px' : '7px 8px',
                      boxShadow: isLatest ? '0 2px 14px rgba(56,189,248,0.10)' : 'none',
                      animation: idx === 0 ? 'bid-row-in 0.3s ease-out both' : undefined,
                      transition: 'all 0.25s',
                      flexShrink: 0,
                    }}>
                      <div style={{
                        width: isLatest ? 9 : 6, height: isLatest ? 9 : 6,
                        borderRadius: '50%', flexShrink: 0,
                        background: isLatest ? '#38bdf8' : '#334155',
                        boxShadow: isLatest ? '0 0 8px rgba(56,189,248,0.70), 0 0 18px rgba(56,189,248,0.30)' : 'none',
                        animation: isLatest ? 'bid-dot-pulse 1.4s ease-in-out infinite' : undefined,
                      }} />
                      {bidTeam?.logo && (
                        <div style={{
                          width: isLatest ? 26 : 20, height: isLatest ? 26 : 20, flexShrink: 0,
                          borderRadius: '50%', overflow: 'hidden',
                          border: isLatest ? '2px solid rgba(56,189,248,0.55)' : '1px solid rgba(255,255,255,0.15)',
                          boxShadow: isLatest ? '0 0 10px rgba(56,189,248,0.40)' : 'none',
                          background: 'rgba(2,6,23,0.92)',
                        }}>
                          <img src={bidTeam.logo} alt={bidTeam.name} style={{
                            width: '100%', height: '100%', objectFit: 'contain', padding: 2,
                          }} />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontWeight: isLatest ? 800 : 600,
                          color: isLatest ? '#e2e8f0' : '#64748b',
                          fontSize: isLatest ? 12 : 11,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          letterSpacing: isLatest ? 0.2 : 0,
                        }}>{bidTeam?.name ?? '—'}</div>
                        <div style={{ color: isLatest ? '#38bdf8' : '#334155', fontSize: 9, marginTop: 1 }}>{bid.time}</div>
                      </div>
                      <span style={{
                        fontFamily: "'Space Mono', monospace",
                        color: isLatest ? '#38bdf8' : '#475569',
                        fontWeight: isLatest ? 800 : 600,
                        fontSize: isLatest ? 13 : 11,
                        flexShrink: 0,
                        textShadow: isLatest ? '0 0 14px rgba(56,189,248,0.50)' : 'none',
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

            {/* Team logo + name — vertical centered */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
              animation: 'sold-fade-up 0.5s ease-out 0.65s both',
            }}>
              {soldAnim.teamLogo && (
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {/* Outer bloom */}
                  <div style={{
                    position: 'absolute', inset: -18, borderRadius: '50%',
                    background: 'rgba(255,215,0,0.22)', filter: 'blur(24px)',
                    pointerEvents: 'none',
                  }} />
                  <div style={{
                    width: 'clamp(110px, 14vw, 160px)', height: 'clamp(110px, 14vw, 160px)',
                    borderRadius: '50%', overflow: 'hidden', position: 'relative',
                    border: '3px solid rgba(255,215,0,0.75)',
                    boxShadow: '0 0 40px rgba(255,215,0,0.65), 0 0 90px rgba(255,215,0,0.25), inset 0 0 20px rgba(0,0,0,0.5)',
                    background: 'rgba(2,6,23,0.90)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <img src={soldAnim.teamLogo} alt={soldAnim.teamName} style={{
                      width: '86%', height: '86%', objectFit: 'contain',
                    }} />
                  </div>
                </div>
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

      {/* ── Hot demand banner ── */}
      {showHotDemand && (
        <div style={{
          position: 'fixed', top: '9%', left: '50%', transform: 'translateX(-50%)',
          zIndex: 2500, pointerEvents: 'none',
          animation: 'hot-demand-enter 2.8s ease-in-out forwards',
          textAlign: 'center',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(28,10,0,0.96) 0%, rgba(18,7,0,0.96) 100%)',
            border: '2px solid rgba(255,140,0,0.62)',
            borderRadius: 18, padding: '16px 52px 18px',
            boxShadow: '0 0 60px rgba(255,100,0,0.45), 0 0 120px rgba(255,60,0,0.22), 0 12px 40px rgba(0,0,0,0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          }}>
            <div style={{ fontSize: 32, lineHeight: 1, marginBottom: 2 }}>🔥</div>
            <div style={{
              fontFamily: "'Bebas Neue', 'Barlow Condensed', sans-serif",
              fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
              color: '#FF8C00', letterSpacing: 5, textTransform: 'uppercase', lineHeight: 1,
              animation: 'flame-flicker 0.55s ease-in-out infinite',
            }}>Player in Hot Demand!</div>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 11, fontWeight: 800,
              color: 'rgba(255,180,50,0.68)',
              letterSpacing: 3.5, textTransform: 'uppercase', marginTop: 2,
            }}>Bid Hits 5× Base Price</div>
          </div>
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
