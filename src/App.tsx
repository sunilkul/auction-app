import React from 'react';
import DashboardPage from './pages/DashboardPage';
import AuctionPage from './pages/AuctionPage';
import PlayerManagementPage from './pages/PlayerManagementPage';
import TeamPage from './pages/TeamPage';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <nav style={{ background: '#0f2027', padding: 16 }}>
        <Link to="/" style={{ color: '#fff', marginRight: 16 }}>Dashboard</Link>
        <Link to="/auction" style={{ color: '#fff', marginRight: 16 }}>Auction</Link>
        <Link to="/players" style={{ color: '#fff', marginRight: 16 }}>Players</Link>
        <Link to="/teams/1" style={{ color: '#fff' }}>Team</Link>
      </nav>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/auction" element={<AuctionPage />} />
        <Route path="/players" element={<PlayerManagementPage />} />
        <Route path="/teams/:id" element={<TeamPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
