import React, { useEffect, useState } from 'react';
import { Player, Team } from '../types';

interface Bid {
  playerId: number;
  teamId: number;
  amount: number;
  time: string;
}

const BID_INCREMENT = 1000000; // 10 Lakhs

const AuctionPage: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [currentBid, setCurrentBid] = useState<number | null>(null);
  const [currentBidTeam, setCurrentBidTeam] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [auctionPlayers, setAuctionPlayers] = useState<Player[]>([]);
  const [teamPurse, setTeamPurse] = useState<{ [teamId: number]: number }>({});
  const [selectedSkill, setSelectedSkill] = useState<number>(0);
  interface Skill {
    id: number;
    skillName: string;
  }
  const [skills, setSkills] = useState<Skill[]>([]);
  const [auctionStarted, setAuctionStarted] = useState(false);

  // Helper to shuffle array
  function shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  useEffect(() => {
    // fetch('/players.json').then(res => res.json()).then((data: Player[]) => {
    //   setPlayers(data);
    //   setAuctionPlayers(data.filter(p => p.status === 'Unsold'));
    // });
    fetch('http://localhost:8282/api/players')
      .then(res => res.json())
      .then((data: Player[]) => {
        setPlayers(data);
      })
      .catch(err => console.error('Failed to fetch players:', err));
    // fetch('/teams.json').then(res => res.json()).then((data: Team[]) => {
    //   setTeams(data);
    //   setTeamPurse(Object.fromEntries(data.map(t => [t.id, t.remainingPurse])));
    // });
    fetch('http://localhost:8282/api/teams')
      .then(res => res.json())
      .then((data: Team[]) => {
        setTeams(data);
        setTeamPurse(Object.fromEntries(data.map(t => [t.id, t.remainingPurse])));
      })
      .catch(err => console.error('Failed to fetch teams:', err));
    // Fetch skills for dropdown
    fetch('http://localhost:8282/api/skills')
      .then(res => res.json())
      .then((data: Skill[]) => {
        setSkills(data);
        if (data.length > 0) setSelectedSkill(data[0].id);
      })
      .catch(err => console.error('Failed to fetch skills:', err));
  }, []);

  // Update auctionPlayers when players or selectedSkill changes
  useEffect(() => {
    if (selectedSkill === 0 || !auctionStarted) {
      setAuctionPlayers([]);
      return;
    }
    const filtered = players.filter(p =>
      p.status === 'UNSOLD' &&
      p.skillId === selectedSkill
    );
    setAuctionPlayers(shuffle(filtered));
    setCurrentPlayerIdx(0);
  }, [players, selectedSkill, auctionStarted]);
  useEffect(() => {
    // Reset bid when player changes
    if (auctionPlayers.length > 0) {
      const player = auctionPlayers[currentPlayerIdx];
      setCurrentBid(player.basePrice);
      setCurrentBidTeam(null);
      setError('');
    }
  }, [currentPlayerIdx, auctionPlayers]);

  if (!auctionStarted) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #fff 0%, #e0e7ff 100%)', padding: '2rem', width: '100vw', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h1 style={{ textAlign: 'center', fontSize: '2.5rem', fontWeight: 900, color: '#0f2027', marginBottom: '2rem' }}>Start EPL Auction</h1>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <label style={{ fontWeight: 600, fontSize: 16, marginRight: 10 }}>Select Skill:</label>
          <select value={selectedSkill} onChange={e => setSelectedSkill(Number(e.target.value))} style={{ fontSize: 16, padding: '4px 12px', borderRadius: 6, border: '1px solid #1976d2' }}>
            <option value={0} disabled>Select skill</option>
            {skills.map(skill => (
              <option key={skill.id} value={skill.id}>{skill.skillName}</option>
            ))}
          </select>
        </div>
        <button
          disabled={!selectedSkill}
          style={{ fontSize: 18, padding: '8px 32px', borderRadius: 8, background: '#1976d2', color: '#fff', fontWeight: 700, border: 'none', cursor: selectedSkill ? 'pointer' : 'not-allowed' }}
          onClick={() => setAuctionStarted(true)}
        >
          Start Auction
        </button>
      </div>
    );
  }
  if (auctionPlayers.length === 0 || teams.length === 0) return <div>All players auctioned or no players for selected skill!</div>;
  const player = auctionPlayers[currentPlayerIdx];

  const handleBid = (teamId: number, up: boolean) => {
    setError('');
    const purse = teamPurse[teamId];
    const nextBid = up ? (currentBid! + BID_INCREMENT) : (currentBid! - BID_INCREMENT);
    if (up && purse < nextBid) {
      setError('Insufficient funds to bid.');
      return;
    }
    if (!up && nextBid < player.basePrice) {
      setError('Bid cannot go below base price.');
      return;
    }
    setCurrentBid(nextBid);
    setCurrentBidTeam(teamId);
    setBids([...bids, {
      playerId: player.id,
      teamId,
      amount: nextBid,
      time: new Date().toLocaleTimeString()
    }]);
  };

  const handleSold = async () => {
    if (currentBidTeam == null) {
      setError('Select a team to sell the player.');
      return;
    }
    // Call backend to update auction result
    try {
      await fetch('http://localhost:8282/api/players/auction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: player.id,
          teamId: currentBidTeam,
          soldPrice: currentBid ?? player.basePrice,
          status: 'SOLD'
        })
      });
    } catch (e) {
      setError('Failed to update auction result.');
      return;
    }
    // Update player status and assign to team locally
    const updatedPlayers = players.map(p =>
      p.id === player.id
        ? {
            ...p,
            status: 'SOLD' as 'SOLD',
            soldPrice: currentBid ?? p.basePrice,
            teamId: currentBidTeam
          }
        : p
    );
    setPlayers(updatedPlayers);
    setAuctionPlayers(auctionPlayers.filter((_, idx) => idx !== currentPlayerIdx));
    setTeamPurse({
      ...teamPurse,
      [currentBidTeam]: teamPurse[currentBidTeam] - (currentBid || 0)
    });
    setCurrentPlayerIdx(idx => idx >= auctionPlayers.length - 1 ? 0 : idx);
    setError('');
  };

  const handleUnsold = async () => {
    // Call backend to update auction result as unsold
    try {
      await fetch('http://localhost:8282/api/players/auction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: player.id,
          teamId: null,
          soldPrice: 0,
          status: 'UNSOLD'
        })
      });
    } catch (e) {
      setError('Failed to update auction result.');
      return;
    }
    // Mark player as unsold and move to next locally
    setAuctionPlayers(auctionPlayers.filter((_, idx) => idx !== currentPlayerIdx));
    setCurrentPlayerIdx(idx => idx >= auctionPlayers.length - 1 ? 0 : idx);
    setError('');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #fff 0%, #e0e7ff 100%)', padding: '2rem', width: '100vw', boxSizing: 'border-box' }}>
      <h1 style={{ textAlign: 'center', fontSize: '2.5rem', fontWeight: 900, color: '#0f2027', marginBottom: '2rem' }}>Live EPL Auction</h1>
  {/* ...existing code... */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 260px', gap: 32, width: '100%', maxWidth: '1600px', margin: '0 auto', alignItems: 'start' }}>
        {/* Player Info */}
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px #0001', padding: 18, minWidth: 140, maxWidth: 220, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img src={player.photo} alt={player.name} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: '50%', margin: '0 auto 10px' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1976d2', textAlign: 'center', margin: 0 }}>{player.name}</h2>
          <div style={{ fontSize: 13, color: player.isNewPlayer === 1 ? '#43a047' : '#888', fontWeight: 600, marginBottom: 6 }}>
            {player.isNewPlayer === 1 ? 'New Player' : 'Old Player'}
          </div>
          {/* Player stats instead of photo */}
          <table style={{ width: '100%', fontSize: 13, margin: '10px 0' }}>
            <tbody>
              {Object.entries(player.stats || {}).map(([key, value]) => (
                <tr key={key}>
                  <td style={{ textTransform: 'capitalize', padding: '2px 6px', color: '#555' }}>{key}</td>
                  <td style={{ fontWeight: 700, padding: '2px 6px', color: '#1976d2' }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ textAlign: 'center', marginBottom: 6, fontSize: 14 }}>Base Price: <b>₹{player.basePrice.toLocaleString()}</b></div>
          <div style={{ textAlign: 'center', marginBottom: 6, fontSize: 14 }}>Current Price: <b style={{ color: '#ff5722' }}>₹{currentBid?.toLocaleString()}</b></div>
          <div style={{ textAlign: 'center', marginBottom: 6, fontSize: 14 }}>Highest Bidder: <b style={{ color: '#009688' }}>{currentBidTeam ? teams.find(t => t.id === currentBidTeam)?.name : '-'}</b></div>
          <div style={{ display: 'flex', gap: 10, marginTop: 12, justifyContent: 'center' }}>
            <button onClick={handleSold} style={{ background: '#43a047', color: '#fff', fontWeight: 700, border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 15, cursor: 'pointer' }}>Sold</button>
            <button onClick={handleUnsold} style={{ background: '#b71c1c', color: '#fff', fontWeight: 700, border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 15, cursor: 'pointer' }}>Unsold</button>
          </div>
          {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
        </div>
        {/* Team Bid Grid */}
        <div style={{
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 4px 24px #0001',
          padding: 24,
          minWidth: 320,
          width: '100%',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 18,
          alignContent: 'start',
        }}>
          {teams.map(team => (
            <div key={team.id} style={{
              border: '2px solid #1976d2',
              borderRadius: 10,
              padding: 10,
              minWidth: 110,
              maxWidth: 140,
              textAlign: 'center',
              background: currentBidTeam === team.id ? '#e3f2fd' : '#fff',
              boxShadow: '0 2px 8px #0001',
              marginBottom: 6,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <img src={team.logo} alt={team.name} style={{ width: 22, height: 22, objectFit: 'contain', marginBottom: 2 }} />
              <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 2 }}>{team.name}</div>
              <div style={{ fontSize: 10, color: '#009688', marginBottom: 2 }}>₹{teamPurse[team.id]?.toLocaleString()}</div>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'center', marginTop: 4 }}>
                <span style={{ fontWeight: 600, fontSize: 13, marginRight: 2 }}>Bid</span>
                <button onClick={() => handleBid(team.id, true)} style={{ background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, padding: '2px 6px', minWidth: 24, minHeight: 22, cursor: 'pointer', fontSize: 13, fontWeight: 700, marginRight: 2 }}>↑</button>
                <button onClick={() => handleBid(team.id, false)} style={{ background: '#ff5722', color: '#fff', border: 'none', borderRadius: 4, padding: '2px 6px', minWidth: 24, minHeight: 22, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>↓</button>
              </div>
            </div>
          ))}
        </div>
        {/* Bid History */}
        <div style={{
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 4px 24px #0001',
          padding: 24,
          minWidth: 280,
          maxWidth: 340,
          width: '100%',
          display: 'grid',
          gridTemplateColumns: 'repeat(1, 1fr)',
          gap: 18,
          alignContent: 'start',
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f2027', marginBottom: 12, textAlign: 'center' }}>Bid History</h3>
          <ul style={{ maxHeight: 160, overflowY: 'auto', padding: 0, listStyle: 'none', marginBottom: 18 }}>
            {bids.filter(b => b.playerId === player.id).slice().reverse().map((bid, idx) => (
              <li key={idx} style={{ marginBottom: 8, borderBottom: '1px solid #eee', paddingBottom: 8, fontSize: 13 }}>
                <b>{teams.find(t => t.id === bid.teamId)?.name}</b> bid <b>₹{bid.amount.toLocaleString()}</b> <span style={{ color: '#888', fontSize: 11 }}>at {bid.time}</span>
              </li>
            ))}
            {bids.filter(b => b.playerId === player.id).length === 0 && <li>No bids yet.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AuctionPage;
