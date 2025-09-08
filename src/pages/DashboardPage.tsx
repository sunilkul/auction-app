import React, { useEffect, useState } from 'react';
import { Team } from '../types';

const DashboardPage: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  useEffect(() => {
    // fetch('/teams.json').then(res => res.json()).then(setTeams); // Old code for reference
    fetch('http://localhost:8282/api/teams')
      .then(res => res.json())
      .then(setTeams)
      .catch(err => console.error('Failed to fetch teams:', err));
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f2027 0%, #2c5364 100%)',
      padding: '2rem',
      fontFamily: 'Poppins, Arial, sans-serif',
    }}>
      <h1 style={{
        textAlign: 'center',
        fontSize: '3rem',
        fontWeight: 900,
        color: '#fff',
        letterSpacing: 2,
        marginBottom: '2.5rem',
        textShadow: '0 4px 24px #000a, 0 1px 0 #fff3',
        animation: 'pulse 2s infinite',
      }}>EPL Auction Dashboard</h1>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '2rem',
      }}>
        {teams.map(team => (
          <div key={team.id} style={{
            background: 'linear-gradient(120deg, #fff 60%, #e0e7ff 100%)',
            borderRadius: '1.5rem',
            boxShadow: '0 8px 32px #0002',
            padding: '2rem 1.5rem 1.5rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden',
            border: '3px solid #0f2027',
            transition: 'transform 0.3s, box-shadow 0.3s',
          }}>
            <img src={team.logo} alt={team.name} style={{
              width: 90,
              height: 90,
              objectFit: 'contain',
              marginBottom: '1rem',
              filter: 'drop-shadow(0 2px 8px #0003)'
            }} />
            <div style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: '#0f2027',
              marginBottom: '0.5rem',
              letterSpacing: 1,
              textShadow: '0 2px 8px #fff8',
            }}>{team.name}</div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              width: '100%',
              margin: '0.5rem 0',
              fontSize: '1.1rem',
              fontWeight: 600,
            }}>
              <span>Purse:</span>
              <span style={{ color: '#009688' }}>₹{team.purse.toLocaleString()}</span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              width: '100%',
              margin: '0.5rem 0',
              fontSize: '1.1rem',
              fontWeight: 600,
            }}>
              <span>Remaining:</span>
              <span style={{ color: '#ff5722' }}>₹{team.remainingPurse.toLocaleString()}</span>
            </div>
            <div style={{
              background: '#e3f2fd',
              borderRadius: '0.75rem',
              padding: '0.5rem 1rem',
              marginTop: '1rem',
              width: '100%',
              boxShadow: '0 2px 8px #0001',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16
            }}>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1976d2' }}>POC 1</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#222' }}>{team.poc1}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1976d2' }}>POC 2</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#222' }}>{team.poc2}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardPage;
