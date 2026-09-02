import React, { useState, useEffect } from 'react';
import DashboardPage from './pages/DashboardPage';
import AuctionPage from './pages/AuctionPage';
import PlayerManagementPage from './pages/PlayerManagementPage';
import TeamPage from './pages/TeamPage';
import WheelPickerPage from './pages/WheelPickerPage';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/auction', label: 'Auction', end: false },
  { to: '/players', label: 'Players', end: false },
  { to: '/teams/1', label: 'Teams', end: false },
];

const Nav: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-6 gap-1 transition-all duration-300"
      style={{
        background: scrolled
          ? 'rgba(2,6,23,0.92)'
          : 'rgba(2,6,23,0.7)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(245,158,11,0.12)',
        boxShadow: scrolled ? '0 4px 30px rgba(0,0,0,0.4)' : 'none',
      }}
    >
      {/* Brand */}
      <NavLink to="/" className="mr-6 flex items-center gap-2 no-underline group">
        <img
          src="/epl-logo.png"
          alt="EPL Season 8"
          style={{
            height: 36,
            width: 'auto',
            objectFit: 'contain',
            filter: 'drop-shadow(0 0 8px rgba(245,158,11,0.5))',
            transition: 'filter 0.2s ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.filter = 'drop-shadow(0 0 14px rgba(245,158,11,0.85))')}
          onMouseLeave={e => (e.currentTarget.style.filter = 'drop-shadow(0 0 8px rgba(245,158,11,0.5))')}
        />
        <span className="text-slate-500 font-body text-[0.65rem] tracking-[0.3em] uppercase font-medium hidden sm:inline">
          EPAM Premier League |
           Season 8
        </span>
      </NavLink>

      {/* Nav links — centred absolutely so brand + logos don't affect position */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `relative px-4 py-1.5 rounded-lg text-[0.72rem] font-body font-extrabold tracking-widest uppercase transition-all duration-200 no-underline ${
                isActive
                  ? 'text-amber-400'
                  : 'text-slate-400 hover:text-slate-100'
              }`
            }
            style={({ isActive }) => ({
              background: isActive ? 'rgba(245,158,11,0.1)' : 'transparent',
            })}
          >
            {({ isActive }) => (
              <>
                {item.label}
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -bottom-0.5 left-1/4 right-1/4 h-0.5 rounded-full"
                    style={{ background: '#f59e0b' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>

      {/* EPAM + CoT logos */}
      <div className="ml-auto flex items-center gap-4">
        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.10)' }} />
        <img
          src="/epam-logo.svg"
          alt="EPAM"
          style={{
            height: 24,
            width: 'auto',
            objectFit: 'contain',
            opacity: 0.85,
          }}
        />
        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.10)' }} />
        <img
          src="/cot-logo.png"
          alt="Culture of Togetherness"
          style={{
            height: 22,
            width: 'auto',
            objectFit: 'contain',
            opacity: 0.90,
          }}
        />
      </div>
    </nav>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#020617] text-slate-100">
        <Nav />
        <div className="pt-14">
          <Routes>
            <Route path="/"             element={<DashboardPage />} />
            <Route path="/auction"      element={<AuctionPage />} />
            <Route path="/players"      element={<PlayerManagementPage />} />
            <Route path="/teams/:id"    element={<TeamPage />} />
            <Route path="/wheel-picker" element={<WheelPickerPage />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
};

export default App;
