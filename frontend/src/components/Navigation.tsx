import React from 'react';
import { NavLink } from 'react-router-dom';
import { Music, MessageSquare } from 'lucide-react';

const Navigation: React.FC = () => {
  return (
    <nav style={{
      position: 'fixed',
      top: '2rem',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 100,
      display: 'flex',
      gap: '1rem',
      background: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(12px)',
      border: '1px solid var(--glass-border)',
      padding: '0.5rem 1rem',
      borderRadius: '9999px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
    }}>
      <NavLink 
        to="/player" 
        style={({ isActive }) => ({
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1.2rem',
          borderRadius: '9999px',
          color: isActive ? '#fff' : 'var(--text-secondary)',
          background: isActive ? 'var(--accent-color)' : 'transparent',
          fontWeight: isActive ? 600 : 400,
          transition: 'all 0.2s ease',
          textDecoration: 'none'
        })}
      >
        <Music size={18} /> Player
      </NavLink>

      <NavLink 
        to="/community" 
        style={({ isActive }) => ({
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1.2rem',
          borderRadius: '9999px',
          color: isActive ? '#fff' : 'var(--text-secondary)',
          background: isActive ? 'var(--accent-color)' : 'transparent',
          fontWeight: isActive ? 600 : 400,
          transition: 'all 0.2s ease',
          textDecoration: 'none'
        })}
      >
        <MessageSquare size={18} /> FanTalk
      </NavLink>
    </nav>
  );
};

export default Navigation;
