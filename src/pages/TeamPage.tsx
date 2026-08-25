import React, { useEffect, useState } from 'react';
import { Team, Player } from '../types';

const BG = 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(235,242,252,0.92) 100%), url(/iStock-2163573192_web.jpg) center/cover no-repeat fixed';

const TeamPage: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
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
    <div style={{ minHeight: '100vh', background: BG, padding: '2.5rem 2rem' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 'clamp(2.2rem, 4vw, 3.5rem)',
          fontWeight: 900,
          color: '#C47B0A',
          letterSpacing: 4,
          textTransform: 'uppercase',
          lineHeight: 1,
        }}>All Teams</div>
        <div style={{ fontSize: 11, color: '#6B7FA0', letterSpacing: 5, textTransform: 'uppercase', marginTop: 8 }}>
          Click a team to view players
        </div>
      </div>

      {/* Team grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 24,
        maxWidth: 1100,
        margin: '0 auto',
      }}>
        {teams.map(team => (
          <div
            key={team.id}
            className="team-card-hover"
            onClick={() => handleTeamClick(team)}
            style={{
              background: 'rgba(255,255,255,0.90)',
              border: '1px solid rgba(0,0,0,0.08)',
              borderTop: '2px solid #F5A623',
              borderRadius: 16,
              boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
              padding: '1.75rem 1.5rem',
              textAlign: 'center',
              cursor: 'pointer',
              backdropFilter: 'blur(12px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              minHeight: 220,
              justifyContent: 'center',
            }}
          >
            <img
              src={team.logo}
              alt={team.name}
              style={{ width: 80, height: 80, objectFit: 'contain', marginBottom: 14, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.15))' }}
            />
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 800,
              fontSize: '1.4rem',
              color: '#0D1E3E',
              letterSpacing: 1,
              textTransform: 'uppercase',
              marginBottom: 10,
            }}>{team.name}</div>
            <div style={{
              background: 'rgba(0,0,0,0.04)',
              border: '1px solid rgba(0,0,0,0.07)',
              borderRadius: 8,
              padding: '6px 14px',
              width: '100%',
            }}>
              <div style={{ fontSize: 11, color: '#6B7FA0', marginBottom: 2 }}>
                <span style={{ fontWeight: 700 }}>POC 1: </span>
                <span style={{ color: '#1A3362' }}>{team.poc1}</span>
              </div>
              <div style={{ fontSize: 11, color: '#6B7FA0' }}>
                <span style={{ fontWeight: 700 }}>POC 2: </span>
                <span style={{ color: '#1A3362' }}>{team.poc2}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && selectedTeam && (() => {
        const teamPlayers = players.filter(p => p.teamId === selectedTeam.id);
        const showScroll = teamPlayers.length > 10;
        return (
          <div
            style={{
              position: 'fixed',
              top: 0, left: 0,
              width: '100vw', height: '100vh',
              background: 'rgba(10,20,50,0.45)',
              backdropFilter: 'blur(6px)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={closeModal}
          >
            <div
              style={{
                background: 'rgba(255,255,255,0.99)',
                border: '1px solid rgba(0,0,0,0.10)',
                borderTop: '2px solid #F5A623',
                borderRadius: 18,
                boxShadow: '0 20px 60px rgba(0,0,0,0.20)',
                padding: '2rem',
                minWidth: 520,
                maxWidth: 900,
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
                  top: 14, right: 16,
                  background: 'rgba(0,0,0,0.06)',
                  color: '#1A3362',
                  border: '1px solid rgba(0,0,0,0.12)',
                  borderRadius: 6,
                  padding: '4px 12px',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >✕</button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: '1.5rem' }}>
                <img src={selectedTeam.logo} alt={selectedTeam.name} style={{ width: 56, height: 44, objectFit: 'contain' }} />
                <div>
                  <div style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: '1.6rem',
                    fontWeight: 800,
                    color: '#0D1E3E',
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                  }}>{selectedTeam.name}</div>
                  <div style={{ fontSize: 12, color: '#6B7FA0' }}>{teamPlayers.length} player{teamPlayers.length !== 1 ? 's' : ''}</div>
                </div>
              </div>

              {teamPlayers.length === 0 ? (
                <div style={{ color: '#6B7FA0', textAlign: 'center', padding: '32px 0', fontSize: 14 }}>
                  No players bought yet.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(196,123,10,0.20)', background: 'rgba(245,166,35,0.06)' }}>
                        {['Photo', 'Name', 'Status', 'Base Price', 'Sold Price'].map(h => (
                          <th key={h} style={{
                            padding: '10px 12px',
                            textAlign: 'left',
                            fontSize: 10,
                            fontWeight: 700,
                            color: '#6B7FA0',
                            letterSpacing: 2,
                            textTransform: 'uppercase',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {teamPlayers.map((player, i) => (
                        <tr key={player.id} style={{
                          borderBottom: '1px solid rgba(0,0,0,0.05)',
                          background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)',
                        }}>
                          <td style={{ padding: '10px 12px' }}>
                            <img src={player.photo} alt={player.name} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(0,0,0,0.10)' }} />
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1A3362' }}>{player.name}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <span className={`badge ${player.status === 'SOLD' ? 'badge-sold' : 'badge-unsold'}`}>
                              {player.status}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', fontFamily: "'Space Mono', monospace", fontSize: 12, color: '#4A6080' }}>
                            ₹{player.basePrice.toLocaleString()}
                          </td>
                          <td style={{ padding: '10px 12px', fontFamily: "'Space Mono', monospace", fontSize: 12, color: player.soldPrice ? '#B87B10' : '#8A9AB8' }}>
                            {player.soldPrice ? `₹${player.soldPrice.toLocaleString()}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default TeamPage;
