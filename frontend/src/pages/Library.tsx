import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import api from '../api/axiosInterceptor';
import { useMusicPlayer } from '../contexts/MusicPlayerContext';

/* ── 타입 정의 ── */
interface LikedTrack {
  id: number;
  title: string;
  duration: number;
  trackNumber: number;
  album: { id: number; title: string; coverImageUrl?: string };
  artist: { id: number; name: string };
  likedAt: string;
  isLiked: boolean;
}

type FilterKey = 'liked' | 'playlists' | 'albums' | 'artists' | 'podcasts';

const Library: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<FilterKey>('liked');
  const [tracks, setTracks] = useState<LikedTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { playTrack } = useMusicPlayer();

  const getImageUrl = (url?: string) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return url;
  };

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'liked', label: 'Liked Songs' },
    { key: 'playlists', label: 'Playlists' },
    { key: 'albums', label: 'Saved Albums' },
    { key: 'artists', label: 'Followed Artists' },
    { key: 'podcasts', label: 'Podcasts' },
  ];

  /* ── 좋아요 한 곡 목록 로드 ── */
  const fetchLikedTracks = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/library/liked-tracks');
      setTracks(response.data.tracks || []);
    } catch (err: any) {
      console.error('보관함 로드 실패:', err);
      // 401 → axiosInterceptor가 Silent Refresh 시도 후 실패 시 /login으로 리다이렉트
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeFilter === 'liked') {
      fetchLikedTracks();
    }
  }, [activeFilter]);

  /* ── 좋아요 토글 (하트 클릭) ── */
  const handleToggleLike = async (trackId: number) => {
    try {
      const response = await api.post(`/library/like/${trackId}`);
      const { isLiked } = response.data;

      if (!isLiked) {
        // 좋아요 취소 → 목록에서 제거 (즉시 UI 반영)
        setTracks(prev => prev.filter(t => t.id !== trackId));
      }
    } catch (err) {
      console.error('좋아요 토글 실패:', err);
    }
  };

  /* ── 트랙 재생 ── */
  const handlePlay = (track: LikedTrack) => {
    playTrack({
      id: track.id,
      title: track.title,
      artistName: track.artist.name,
      albumTitle: track.album.title,
      coverImageUrl: track.album.coverImageUrl || undefined,
      duration: track.duration,
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <span className="text-primary font-headline text-xl animate-pulse">로딩 중...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Pills */}
      <section className="flex overflow-x-auto gap-3 no-scrollbar">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={`whitespace-nowrap px-6 py-2 rounded-full text-sm font-semibold transition-all active:scale-95 ${
              activeFilter === f.key
                ? 'bg-primary-container text-on-primary-fixed'
                : 'bg-surface-container-highest text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {f.label}
          </button>
        ))}
      </section>

      {/* Liked Songs View */}
      {activeFilter === 'liked' && (
        <>
          <div className="flex flex-col md:flex-row items-end gap-6 p-6 rounded-3xl bg-gradient-to-t from-surface-container-low to-transparent border border-outline-variant/10">
            <div className="w-48 h-48 md:w-56 md:h-56 rounded-2xl shadow-2xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-white text-7xl" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-primary">Playlist</span>
              <h2 className="text-5xl md:text-7xl font-headline font-black text-on-surface">Liked Songs</h2>
              <div className="flex items-center gap-2 mt-2 text-on-surface-variant text-sm font-semibold">
                <span className="text-on-surface">{sessionStorage.getItem('nickname') || 'User'}</span>
                <span className="w-1 h-1 rounded-full bg-on-surface-variant" />
                <span>{tracks.length} songs</span>
              </div>
            </div>
          </div>

          {/* Songs Table */}
          {tracks.length > 0 ? (
            <div className="w-full">
              {/* Header */}
              <div className="grid grid-cols-[40px_1fr_1fr_1fr_80px] gap-4 px-4 py-3 text-on-surface-variant text-xs font-bold uppercase tracking-tighter border-b border-outline-variant/10">
                <div className="text-center">#</div>
                <div>Title</div>
                <div className="hidden md:block">Album</div>
                <div className="hidden lg:block">Date Added</div>
                <div className="flex justify-end pr-4">
                  <span className="material-symbols-outlined text-sm">schedule</span>
                </div>
              </div>

              {/* Rows */}
              <div className="mt-2 flex flex-col">
                {tracks.map((track, idx) => (
                  <div
                    key={track.id}
                    onClick={() => handlePlay(track)}
                    className="group grid grid-cols-[40px_1fr_1fr_1fr_80px] gap-4 px-4 py-3 items-center rounded-xl hover:bg-surface-container-high transition-all cursor-pointer"
                  >
                    <div className="flex justify-center items-center text-on-surface-variant">
                      <span className="group-hover:hidden text-sm">{idx + 1}</span>
                      <span className="hidden group-hover:block material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                    </div>
                    <div className="flex items-center gap-4">
                      {track.album.coverImageUrl ? (
                        <img loading="lazy" className="w-12 h-12 rounded-lg object-cover" src={getImageUrl(track.album.coverImageUrl) || ''} alt={track.title} />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-surface-container-highest flex items-center justify-center">
                          <span className="material-symbols-outlined text-on-surface-variant">music_note</span>
                        </div>
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="text-on-surface font-semibold truncate">{track.title}</span>
                        <NavLink to={`/artist/${track.artist.id}`} onClick={(e) => e.stopPropagation()} className="text-on-surface-variant text-sm truncate hover:underline hover:text-primary transition-colors block">{track.artist.name}</NavLink>
                      </div>
                    </div>
                    <NavLink to={`/album/${track.album.id}`} onClick={(e) => e.stopPropagation()} className="hidden md:block text-on-surface-variant text-sm truncate hover:underline hover:text-primary transition-colors">{track.album.title}</NavLink>
                    <div className="hidden lg:block text-on-surface-variant text-sm">{formatDate(track.likedAt)}</div>
                    <div className="flex items-center justify-end gap-4">
                      {/* 하트 아이콘 토글 — 클릭 시 API 호출 후 즉시 색상 변경 */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleLike(track.id); }}
                        className="transition-transform hover:scale-110"
                      >
                        <span
                          className="material-symbols-outlined text-primary text-xl"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          favorite
                        </span>
                      </button>
                      <span className="text-on-surface-variant text-sm font-mono pr-2">{formatDuration(track.duration)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-6">
              <div className="w-24 h-24 rounded-full bg-surface-container flex items-center justify-center">
                <span className="material-symbols-outlined text-6xl text-on-surface-variant">favorite_border</span>
              </div>
              <div className="max-w-xs space-y-2">
                <p className="text-on-surface font-bold text-lg">좋아요 한 곡이 없습니다</p>
                <p className="text-on-surface-variant text-sm">둘러보기에서 마음에 드는 음악에 하트를 눌러보세요!</p>
              </div>
              <NavLink
                to="/explore"
                className="bg-primary text-on-primary-fixed px-8 py-3 rounded-full font-bold transition-transform active:scale-95 shadow-lg shadow-primary/20"
              >
                음악 찾기
              </NavLink>
            </div>
          )}
        </>
      )}

      {/* Other filters — placeholder */}
      {activeFilter !== 'liked' && (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-6">
          <div className="w-24 h-24 rounded-full bg-surface-container flex items-center justify-center">
            <span className="material-symbols-outlined text-6xl text-on-surface-variant">library_music</span>
          </div>
          <div className="max-w-xs space-y-2">
            <p className="text-on-surface font-bold text-lg">아직 콘텐츠가 없습니다.</p>
            <p className="text-on-surface-variant text-sm">둘러보기에서 마음에 드는 음악을 찾아보세요!</p>
          </div>
          <NavLink
            to="/explore"
            className="bg-primary text-on-primary-fixed px-8 py-3 rounded-full font-bold transition-transform active:scale-95 shadow-lg shadow-primary/20"
          >
            음악 찾기
          </NavLink>
        </div>
      )}
    </div>
  );
};

export default Library;
