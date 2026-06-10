import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useMusicPlayer } from '../contexts/MusicPlayerContext';
import api from '../api/axiosInterceptor';

const Home: React.FC = () => {
  const [trendingTracks, setTrendingTracks] = useState<any[]>([]);
  const [newAlbums, setNewAlbums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { playAlbum } = useMusicPlayer();
  const navigate = useNavigate();
  const nickname = sessionStorage.getItem('nickname') || '사용자';

  const getImageUrl = (url?: string) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return url;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tt, nr] = await Promise.all([
          api.get('/music/trending'),
          api.get('/music/new-releases')
        ]);
        setTrendingTracks(tt.data.slice(0, 6)); // 홈에는 6개만
        setNewAlbums(nr.data.slice(0, 4));
      } catch (err) {
        console.error("홈 데이터 로딩 실패:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-10">
      {/* ── Greeting ── */}
      <section className="space-y-6">
        <h2 className="font-headline font-black text-4xl tracking-tight">안녕하세요, {nickname}님</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {trendingTracks.map((track, idx) => (
            <div 
              key={track.id} 
              className="flex items-center gap-4 bg-surface-container-low rounded-xl overflow-hidden pr-4 group hover:bg-surface-container transition-all cursor-pointer border border-outline-variant/10"
              onClick={() => {
                const allTracks = trendingTracks.map((t: any) => ({
                  id: t.id,
                  title: t.title,
                  artistName: t.artistName,
                  albumTitle: '',
                  coverImageUrl: t.albumCover,
                  duration: t.duration
                }));
                playAlbum(allTracks, idx);
              }}
            >
              <img className="w-16 h-16 object-cover" alt={track.title} src={getImageUrl(track.albumCover) || 'https://via.placeholder.com/150'} />
              <div className="flex-1 min-w-0">
                <span className="font-bold text-sm block truncate group-hover:text-primary transition-colors">{track.title}</span>
                <span
                  className="text-xs text-on-surface-variant truncate block hover:underline hover:text-primary cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); if (track.artistId) navigate(`/artist/${track.artistId}`); }}
                >{track.artistName}</span>
              </div>
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-on-primary shadow-lg opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 회원님을 위한 추천 (최신 앨범 기반) ── */}
      <section className="space-y-6">
        <div className="flex justify-between items-end">
          <h2 className="font-headline font-bold text-2xl tracking-tight">최근 등록된 앨범</h2>
          <NavLink to="/explore" className="text-primary font-bold text-xs uppercase tracking-widest hover:underline">전체보기</NavLink>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {newAlbums.map((album) => (
            <NavLink key={album.id} to={`/album/${album.id}`} className="space-y-3 group">
              <div className="aspect-square rounded-2xl overflow-hidden relative shadow-xl">
                <img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={album.title} src={getImageUrl(album.coverImageUrl) || 'https://via.placeholder.com/300'} />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                  <div className="bg-primary p-3 rounded-full shadow-2xl">
                    <span className="material-symbols-outlined text-on-primary" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                  </div>
                </div>
              </div>
              <div>
                <p className="font-bold text-sm truncate group-hover:text-primary">{album.title}</p>
                <p 
                  className="text-xs text-on-surface-variant truncate hover:text-primary hover:underline cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (album.artistId) navigate(`/artist/${album.artistId}`);
                  }}
                >
                  {album.artistName}
                </p>
              </div>
            </NavLink>
          ))}
        </div>
      </section>

      {/* ── 가이드 배너 ── */}
      <section className="relative h-64 rounded-3xl overflow-hidden group cursor-pointer shadow-2xl">
        <img 
          src="https://images.unsplash.com/photo-1493225255756-d9584f8606e9?auto=format&fit=crop&q=80&w=1200" 
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
          alt="Banner"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 p-8 flex flex-col justify-center max-w-md space-y-4">
          <span className="text-primary font-bold text-xs uppercase tracking-[0.2em]">New Experience</span>
          <h3 className="text-3xl font-black leading-tight">음악으로 소통하는 팬톡 게시판을 만나보세요</h3>
          <p className="text-on-surface-variant text-sm">좋아하는 아티스트의 페이지에서 팬들과 함께 이야기를 나눌 수 있습니다.</p>
          <button onClick={() => navigate('/explore')} className="px-6 py-2.5 bg-white text-black rounded-full font-bold text-sm w-fit hover:bg-primary hover:text-on-primary transition-all">
            아티스트 찾기
          </button>
        </div>
      </section>
    </div>
  );
};

export default Home;
