
import React, { useEffect, useState } from 'react';
import { Team, Player } from '../types';

const TeamPage: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // fetch('/teams.json').then(res => res.json()).then(setTeams);
    // fetch('/players.json').then(res => res.json()).then(setPlayers);
    fetch('http://localhost:8282/api/teams').then(res => res.json()).then(setTeams);
    fetch('http://localhost:8282/api/players').then(res => res.json()).then(setPlayers);
  }, []);

  const handleTeamClick = (team: Team) => {
    setSelectedTeam(team);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedTeam(null);
  };

  return (
    <div style={{ padding: 32, minHeight: '100vh', background: 'linear-gradient(135deg, #fff 0%, #e0e7ff 100%)' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, textAlign: 'center', marginBottom: 32 }}>All Teams</h1>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 32,
        maxWidth: 1200,
        margin: '0 auto',
      }}>
        {teams.map(team => (
          <div
            key={team.id}
            style={{
              background: '#fff',
              border: '2px solid #1976d2',
              borderRadius: 16,
              boxShadow: '0 4px 16px #0001',
              padding: 24,
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'transform 0.15s',
              minHeight: 220,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={() => handleTeamClick(team)}
          >
            <img src={team.logo} alt={team.name} style={{ width: 80, height: 80, objectFit: 'contain', marginBottom: 12 }} />
            <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 8 }}>{team.name}</div>
            <div style={{ fontSize: 14, color: '#555', marginBottom: 4 }}>POC 1: {team.poc1}</div>
            <div style={{ fontSize: 14, color: '#555', marginBottom: 4 }}>POC 2: {team.poc2}</div>
            <div style={{ fontSize: 13, color: '#009688', marginBottom: 4 }}>Purse: ₹{team.purse.toLocaleString()}</div>
            <div style={{ fontSize: 13, color: '#1976d2' }}>Remaining: ₹{team.remainingPurse.toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Modal Popup for Team Players */}
      {showModal && selectedTeam && (() => {
        const teamPlayers = players.filter(p => p.teamId === selectedTeam.id);
        const showScroll = teamPlayers.length > 10;
        return (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0,0,0,0.35)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={closeModal}
          >
            <div
              style={{
                background: '#fff',
                borderRadius: 18,
                boxShadow: '0 8px 32px #0003',
                padding: 32,
                minWidth: 340,
                maxWidth: 600,
                maxHeight: showScroll ? '80vh' : 'auto',
                overflowY: showScroll ? 'auto' : 'visible',
                position: 'relative',
              }}
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={closeModal}
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 16,
                  background: '#1976d2',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '4px 12px',
                  fontWeight: 700,
                  fontSize: 16,
                  cursor: 'pointer',
                  zIndex: 10,
                }}
              >X</button>
              <h2 style={{ fontSize: 22, fontWeight: 700, textAlign: 'center', marginBottom: 18 }}>{selectedTeam.name} Players</h2>
              <div style={{ width: '100%', overflowX: 'auto' }}>
                {teamPlayers.length === 0 ? (
                  <div>No players bought yet.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', background: '#f5f5f5', borderRadius: 12, overflow: 'hidden' }}>
                    <thead style={{ background: '#1976d2', color: '#fff' }}>
                      <tr>
                        <th>Photo</th>
                        <th>Name</th>
                        <th>Skill</th>
                        <th>Status</th>
                        <th>Base Price</th>
                        <th>Sold Price</th>
                        <th>Stats</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamPlayers.map(player => (
                        <tr key={player.id} style={{ textAlign: 'center', borderBottom: '1px solid #eee' }}>
                          <td><img src={player.photo} alt={player.name} style={{ width: 48, height: 48, borderRadius: '50%' }} /></td>
                          <td>{player.name}</td>
                          <td>{player.skillName}</td>
                          <td style={{ color: player.status === 'SOLD' ? '#009688' : '#ff5722', fontWeight: 700 }}>{player.status}</td>
                          <td>₹{player.basePrice.toLocaleString()}</td>
                          <td>{player.soldPrice ? `₹${player.soldPrice.toLocaleString()}` : '-'}</td>
                          <td>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 12 }}>
                              {Object.entries(player.stats || {}).map(([k, v]) => (
                                <li key={k}>{k}: {v}</li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default TeamPage;
