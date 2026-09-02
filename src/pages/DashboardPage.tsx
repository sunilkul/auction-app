import React, { useEffect, useState } from 'react';
import { Team } from '../types';

const BG = 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(235,242,252,0.92) 100%), url(/iStock-2163573192_web.jpg) center/cover no-repeat fixed';

const DashboardPage: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    fetch('http://localhost:8282/api/teams')
      .then(res => res.json())
      .then((data) => {
        if (Array.isArray(data)) setTeams(data);
        else if (data && typeof data === 'object') setTeams([data]);
        else setTeams([]);
      })
      .catch(err => {
        setTeams([]);
        console.error('Failed to fetch teams:', err);
      });
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: BG,
      padding: '2.5rem 2rem',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 'clamp(2.8rem, 6vw, 5rem)',
          fontWeight: 900,
          color: '#005A8E',
          letterSpacing: 5,
          textTransform: 'uppercase',
          lineHeight: 1,
          textShadow: '0 2px 20px rgba(0,90,142,0.18)',
        }}>EPL Auction</div>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: '0.85rem',
          fontWeight: 600,
          letterSpacing: 7,
          color: '#6B7FA0',
          textTransform: 'uppercase',
          marginTop: 8,
        }}>Live Dashboard</div>
      </div>

      {/* Team grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '1.5rem',
        maxWidth: 1440,
        margin: '0 auto',
      }}>
        {teams.map(team => {
          const pct = team.purse > 0 ? Math.round((team.remainingPurse / team.purse) * 100) : 0;
          const barColor = pct > 60 ? '#00A85A' : pct > 30 ? '#F5A623' : '#E5283F';

          return (
            <div
              key={team.id}
              className="team-card-hover"
              style={{
                background: 'rgba(255,255,255,0.90)',
                border: '1px solid rgba(0,0,0,0.08)',
                borderTop: `3px solid ${barColor}`,
                borderRadius: 18,
                padding: '1.6rem 1.5rem 1.4rem',
                backdropFilter: 'blur(14px)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              {/* Logo */}
              <img
                src={team.logo}
                alt={team.name}
                style={{
                  width: 110,
                  height: 80,
                  objectFit: 'contain',
                  marginBottom: '0.9rem',
                  filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.18))',
                }}
              />

              {/* Name */}
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: '1.65rem',
                fontWeight: 800,
                color: '#0D1E3E',
                letterSpacing: 1.5,
                textAlign: 'center',
                textTransform: 'uppercase',
                marginBottom: '1.1rem',
              }}>{team.name}</div>

              {/* Purse block */}
              <div style={{ width: '100%', marginBottom: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#6B7FA0', letterSpacing: 1.5, textTransform: 'uppercase' }}>Remaining</span>
                  <span style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: '1.35rem',
                    fontWeight: 700,
                    color: barColor,
                  }}>
                    ₹{typeof team.remainingPurse === 'number' ? team.remainingPurse.toLocaleString() : 'N/A'}
                  </span>
                </div>

                {/* Progress bar */}
                <div style={{ width: '100%', height: 5, background: 'rgba(0,0,0,0.08)', borderRadius: 99 }}>
                  <div style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: barColor,
                    borderRadius: 99,
                    transition: 'width 0.7s ease',
                  }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontSize: 10, color: '#8A9AB8' }}>{pct}% remaining</span>
                  <span style={{ fontSize: 10, color: '#8A9AB8' }}>
                    Total: ₹{typeof team.purse === 'number' ? team.purse.toLocaleString() : 'N/A'}
                  </span>
                </div>
              </div>

              {/* POC box */}
              <div style={{
                width: '100%',
                background: 'rgba(0,0,0,0.04)',
                border: '1px solid rgba(0,0,0,0.07)',
                borderRadius: 10,
                padding: '0.65rem 1rem',
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
              }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7FA0', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 3 }}>POC 1</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1A3362', textTransform: 'uppercase' }}>{team.poc1 || '—'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7FA0', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 3 }}>POC 2</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1A3362', textTransform: 'uppercase' }}>{team.poc2 || '—'}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardPage;
