import React from 'react';
import DashboardPage from './pages/DashboardPage';
import AuctionPage from './pages/AuctionPage';
import PlayerManagementPage from './pages/PlayerManagementPage';
import TeamPage from './pages/TeamPage';
import WheelPickerPage from './pages/WheelPickerPage';
import { BrowserRouter, Routes, Route, Link, NavLink } from 'react-router-dom';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <nav className="app-nav">
        <Link to="/" className="nav-brand">
          EPL<span>Cricket Auction</span>
        </Link>
        <NavLink to="/"             end  className={({ isActive }) => `nav-link${isActive ? ' nav-link-active' : ''}`}>Dashboard</NavLink>
        <NavLink to="/auction"           className={({ isActive }) => `nav-link${isActive ? ' nav-link-active' : ''}`}>Auction</NavLink>
        <NavLink to="/players"           className={({ isActive }) => `nav-link${isActive ? ' nav-link-active' : ''}`}>Players</NavLink>
        <NavLink to="/teams/1"           className={({ isActive }) => `nav-link${isActive ? ' nav-link-active' : ''}`}>Teams</NavLink>
        <NavLink to="/wheel-picker"      className={({ isActive }) => `nav-link${isActive ? ' nav-link-active' : ''}`}>Generator</NavLink>
      </nav>
      <Routes>
        <Route path="/"            element={<DashboardPage />} />
        <Route path="/auction"     element={<AuctionPage />} />
        <Route path="/players"     element={<PlayerManagementPage />} />
        <Route path="/teams/:id"   element={<TeamPage />} />
        <Route path="/wheel-picker" element={<WheelPickerPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
