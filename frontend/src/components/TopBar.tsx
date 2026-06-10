import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

// sessionStorage에서 닉네임 가져오기
function getStoredNickname(): string {
  return sessionStorage.getItem('nickname') || '';
}

const TopBar: React.FC = () => {
  const [_isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(sessionStorage.getItem('isLoggedIn') === 'true');
  const [nickname, setNickname] = useState(getStoredNickname());
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  /* 외부 클릭 시 메뉴 닫기 */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    const handleAuthChange = () => {
      const loggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
      setIsLoggedIn(loggedIn);
      setNickname(loggedIn ? getStoredNickname() : '');
    };
    window.addEventListener('authChange', handleAuthChange);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('authChange', handleAuthChange);
    };
  }, []);

  const handleLogout = async () => {
    try {
      // [A07] 서버측 로그아웃: HttpOnly 쿠키를 서버에서 확실히 삭제
      const api = (await import('../api/axiosInterceptor')).default;
      await api.post('/auth/logout');
    } catch (err) {
      console.error('서버 로그아웃 실패:', err);
    }
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('nickname');
    sessionStorage.removeItem('role'); // [A07] role 잔존 방지
    setIsLoggedIn(false);
    setNickname('');
    setIsMenuOpen(false);
    window.dispatchEvent(new Event('authChange'));
    // 클라이언트 측 쿠키 삭제 (보조)
    document.cookie = 'accessToken=; Max-Age=0; path=/';
  };

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <>
      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 z-50 w-full bg-[#0e0e0e] flex justify-between items-center px-6 py-4">
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <NavLink to="/settings" className="w-8 h-8 rounded-full bg-surface-container overflow-hidden border border-outline-variant/20">
              <img className="w-full h-full object-cover" alt="Profile" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBFFHG6KK60SwojZ4R2AYB_dEHqhd7bweFTm9ZXK_tR2kLuYfCqAoKcIIfkg7kVe0YVj1ca_oKzxlPgg6rooIrRTjlLVjlCYeJePRR3WdaFB-SD5o1v260yTp744UW7sJngZ0sCKqoRN2c43kSIS2n95I6DyhKSFlHoHYnfMdkkAhwCmn6Vh2YJnliI_S9h6lYxO7jCqjuXAtRBIj6mVgj4UcLNS8TJ_WBv1w829EwuiZifOL_cwyLo59L5FUiYeTanOn4LhS4ScWw" />
            </NavLink>
          ) : (
            <NavLink to="/login" className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center border border-outline-variant/20">
              <span className="material-symbols-outlined text-sm">person</span>
            </NavLink>
          )}
          <h1 className="font-headline font-black text-primary tracking-widest uppercase text-2xl">Pulse</h1>
        </div>
        <div className="flex items-center gap-4">
          <button className="hover:bg-surface-container-low transition-colors p-2 rounded-full">
            <span className="material-symbols-outlined text-primary">search</span>
          </button>
          {!isLoggedIn && (
            <NavLink to="/login" className="text-xs font-bold text-primary px-3 py-1 bg-primary/10 rounded-full">
              로그인
            </NavLink>
          )}
        </div>
      </header>

      {/* Desktop Header */}
      <header className="hidden md:flex fixed top-0 right-0 left-64 h-16 bg-transparent justify-between items-center px-8 z-40">
        {/* Search */}
        <div className="flex items-center gap-4 flex-1 max-w-md">
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
            <input
              className="w-full bg-surface-container-highest border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-on-surface-variant"
              placeholder="노래, 아티스트, 앨범 검색"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
            />
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-6">
          {!isLoggedIn ? (
            <NavLink 
              to="/login" 
              className="flex items-center gap-2 bg-surface-container-highest hover:bg-primary hover:text-on-primary-fixed text-on-surface px-6 py-2.5 rounded-full transition-colors font-bold text-sm"
            >
              로그인
            </NavLink>
          ) : (
            <div className="flex items-center gap-6 text-sm font-bold text-on-surface-variant">
              <span className="text-primary font-bold">{nickname || '사용자'}</span>
              <NavLink to="/settings" className="hover:text-white transition-colors">내정보</NavLink>
              <NavLink to="/login" onClick={handleLogout} className="hover:text-error transition-colors">로그아웃</NavLink>
            </div>
          )}
        </div>
      </header>
    </>
  );
};

export default TopBar;
