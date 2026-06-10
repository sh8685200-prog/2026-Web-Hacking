import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { MusicPlayerProvider } from './contexts/MusicPlayerContext';

import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import BottomNav from './components/BottomNav';
import PlayerShell from './components/PlayerShell';
import Login from './components/Login';
import Signup from './components/Signup';
import ResetPassword from './pages/ResetPassword';
import Home from './pages/Home';
import ArtistDetail from './pages/ArtistDetail';
import Explore from './pages/Explore';
import Library from './pages/Library';
import AlbumDetail from './pages/AlbumDetail';
import Settings from './pages/Settings';
import AdminDashboard from './pages/AdminDashboard';
import AdminGuard from './components/AdminGuard';
import Search from './pages/Search';
import api, { setCsrfToken } from './api/axiosInterceptor';

/* ── 인증 페이지 외 레이아웃 (Sidebar + TopBar + Player) ── */
const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background text-on-background">
      <Sidebar />
      <TopBar />
      <main className="md:ml-64 pt-24 md:pt-20 pb-48 md:pb-32 px-6 md:px-8 h-screen overflow-y-auto no-scrollbar">
        {children}
      </main>
      <PlayerShell />
      <BottomNav />
    </div>
  );
};

/* ── 라우팅 분기 래퍼: 인증 페이지에선 레이아웃 숨김 ── */
const RoutingShell: React.FC = () => {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup' || location.pathname === '/reset-password';

  if (isAuthPage) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    );
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/library" element={<Library />} />
        <Route path="/artist/:id" element={<ArtistDetail />} />
        <Route path="/album/:id" element={<AlbumDetail />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/admin" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
        <Route path="/search" element={<Search />} />
        {/* 존재하지 않는 경로 → 홈으로 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
};

/* ── App 진입점 ── */
const App: React.FC = () => {
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        const res = await api.get('/csrf-token');
        if (res.data.csrfToken) {
          setCsrfToken(res.data.csrfToken);
        }
      } catch {
        console.warn("CSRF 셋업 실패 (개발 모드이거나 백엔드가 꺼져있을 수 있습니다.)");
      } finally {
        setIsInitializing(false);
      }
    };
    fetchCsrfToken();
  }, []);

  if (isInitializing) {
    return (
      <div className="h-screen flex justify-center items-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-primary font-bold italic tracking-tighter text-3xl font-headline animate-pulse">SECURITY MUSIC</h1>
          <p className="text-on-surface-variant text-sm">초기화 중...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <MusicPlayerProvider>
        <RoutingShell />
      </MusicPlayerProvider>
    </BrowserRouter>
  );
};

export default App;
