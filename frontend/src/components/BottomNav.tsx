import React from 'react';
import { NavLink } from 'react-router-dom';

const BottomNav: React.FC = () => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pt-4 pb-8 bg-surface-container-highest/60 backdrop-blur-3xl rounded-t-[24px] shadow-[0px_-20px_40px_rgba(0,0,0,0.4)]">
      <NavLink to="/" className={({ isActive }) => `flex flex-col items-center justify-center transition-all active:scale-90 ${isActive ? 'text-primary bg-surface-container rounded-full px-4 py-1' : 'text-on-surface-variant hover:text-white'}`}>
        {({ isActive }) => (
          <>
            <span className="material-symbols-outlined" style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>home</span>
            <span className="font-label text-[10px] font-semibold uppercase tracking-widest mt-1">Home</span>
          </>
        )}
      </NavLink>
      <NavLink to="/explore" className={({ isActive }) => `flex flex-col items-center justify-center transition-all active:scale-90 ${isActive ? 'text-primary bg-surface-container rounded-full px-4 py-1' : 'text-on-surface-variant hover:text-white'}`}>
        {({ isActive }) => (
          <>
            <span className="material-symbols-outlined" style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>explore</span>
            <span className="font-label text-[10px] font-semibold uppercase tracking-widest mt-1">Explore</span>
          </>
        )}
      </NavLink>
      <NavLink to="/library" className={({ isActive }) => `flex flex-col items-center justify-center transition-all active:scale-90 ${isActive ? 'text-primary bg-surface-container rounded-full px-4 py-1' : 'text-on-surface-variant hover:text-white'}`}>
        {({ isActive }) => (
          <>
            <span className="material-symbols-outlined" style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>library_music</span>
            <span className="font-label text-[10px] font-semibold uppercase tracking-widest mt-1">Library</span>
          </>
        )}
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => `flex flex-col items-center justify-center transition-all active:scale-90 ${isActive ? 'text-primary bg-surface-container rounded-full px-4 py-1' : 'text-on-surface-variant hover:text-white'}`}>
        {({ isActive }) => (
          <>
            <span className="material-symbols-outlined" style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>person</span>
            <span className="font-label text-[10px] font-semibold uppercase tracking-widest mt-1">My Info</span>
          </>
        )}
      </NavLink>
    </nav>
  );
};

export default BottomNav;
