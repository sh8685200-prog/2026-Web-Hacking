import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { icon: 'home', label: '홈', path: '/' },
  { icon: 'explore', label: '둘러보기', path: '/explore' },
  { icon: 'library_music', label: '보관함', path: '/library' },
];

const Sidebar: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkRole = () => setIsAdmin(sessionStorage.getItem('role') === 'Admin');
    checkRole();
    window.addEventListener('authChange', checkRole);
    window.addEventListener('storage', checkRole);
    return () => {
      window.removeEventListener('authChange', checkRole);
      window.removeEventListener('storage', checkRole);
    };
  }, []);

  return (
    <nav className="hidden md:flex h-full w-64 fixed left-0 top-0 bg-surface-container-low flex-col py-8 z-50">
      {/* Logo */}
      <div className="px-8 mb-12">
        <NavLink to="/" className="text-primary font-bold italic tracking-tighter text-2xl font-headline hover:text-primary-container transition-colors">
          SECURITY MUSIC
        </NavLink>
      </div>

      {/* Navigation Links */}
      <div className="flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-4 py-3 px-6 font-headline font-medium text-sm transition-colors active:scale-95 duration-150 ${
                isActive
                  ? 'text-primary border-l-4 border-secondary bg-surface-container'
                  : 'text-on-surface-variant border-l-4 border-transparent hover:bg-surface-container hover:text-white'
              }`
            }
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>

      {/* Admin 전용 영역 */}
      {isAdmin && (
        <div className="mt-auto px-6 pb-4">
          <div className="border-t border-outline-variant/15 pt-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 px-2 mb-2 block">Admin</span>
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                  isActive
                    ? 'bg-primary/15 text-primary'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-white'
                }`
              }
            >
              <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>admin_panel_settings</span>
              관리자 대시보드
            </NavLink>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Sidebar;
