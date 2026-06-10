import React, { useState, useEffect } from 'react';
import { useParams, NavLink } from 'react-router-dom';
import { useMusicPlayer, TrackInfo } from '../contexts/MusicPlayerContext';
import api from '../api/axiosInterceptor';

interface Track {
  id: number;
  title: string;
  duration: number;
  trackNumber: number;
}

interface AlbumData {
  id: number;
  title: string;
  coverImageUrl: string;
  releaseDate: string;
  artist: {
    id: number;
    name: string;
  };
  tracks: Track[];
}

const AlbumDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [album, setAlbum] = useState<AlbumData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [likedTracks, setLikedTracks] = useState<Set<number>>(new Set());
  const { playAlbum, currentTrack, isPlaying } = useMusicPlayer();

  const getImageUrl = (url?: string) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return url;
  };

  // 앨범 트랙 데이터를 TrackInfo[] 형태로 변환
  const toTrackInfoList = (albumData: AlbumData): TrackInfo[] => {
    return albumData.tracks.map(t => ({
      id: t.id,
      title: t.title,
      artistName: albumData.artist.name,
      albumTitle: albumData.title,
      coverImageUrl: albumData.coverImageUrl,
      duration: t.duration,
    }));
  };

  useEffect(() => {
    if (!id) return;

    const fetchAlbumData = async () => {
      try {
        const res = await api.get(`/music/albums/${id}`);
        setAlbum(res.data);

        // 트랙 좋아요 상태 일괄 조회
        const trackIds = res.data.tracks.map((t: Track) => t.id);
        if (trackIds.length > 0) {
          try {
            const likeRes = await api.post('/library/check-likes', { trackIds });
            setLikedTracks(new Set(likeRes.data.likedTrackIds || []));
          } catch {
            // 비로그인 시 무시
          }
        }
      } catch (err: any) {
        console.error(err);
        setErrorMsg(err.response?.data?.message || '앨범 정보를 가져올 수 없습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchAlbumData();
  }, [id]);

  const handleToggleLike = async (trackId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await api.post(`/library/like/${trackId}`);
      setLikedTracks(prev => {
        const next = new Set(prev);
        if (res.data.isLiked) {
          next.add(trackId);
        } else {
          next.delete(trackId);
        }
        return next;
      });
    } catch (err) {
      console.error('좋아요 토글 실패:', err);
    }
  };

  // 앨범 전체 재생 (모든 트랙을 큐에 넣고 첫 트랙부터 시작)
  const handlePlayAll = () => {
    if (!album || album.tracks.length === 0) return;
    const trackInfoList = toTrackInfoList(album);
    playAlbum(trackInfoList, 0);
  };

  // 개별 트랙 클릭 시: 해당 트랙부터 앨범 끝까지 큐에 추가
  const handlePlayTrack = (trackIndex: number) => {
    if (!album) return;
    const trackInfoList = toTrackInfoList(album);
    playAlbum(trackInfoList, trackIndex);
  };

  // 현재 재생 중인 트랙 확인
  const isTrackPlaying = (trackId: number) => {
    return currentTrack?.id === trackId && isPlaying;
  };

  const isTrackCurrent = (trackId: number) => {
    return currentTrack?.id === trackId;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (errorMsg || !album) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-error">
        <span className="material-symbols-outlined text-6xl mb-4">error</span>
        <h2 className="text-xl font-bold">{errorMsg || '앨범을 찾을 수 없습니다.'}</h2>
        <NavLink to="/" className="mt-4 text-primary hover:underline">홈으로 돌아가기</NavLink>
      </div>
    );
  }

  // 총 재생시간 계산
  const totalDuration = album.tracks.reduce((sum, t) => sum + t.duration, 0);
  const totalMinutes = Math.floor(totalDuration / 60);

  return (
    <div className="space-y-10 pb-20">
      {/* ── Album Header ── */}
      <div className="flex flex-col md:flex-row items-end gap-8 pt-10">
        <div className="w-64 h-64 shadow-2xl rounded-2xl overflow-hidden shrink-0">
          <img src={getImageUrl(album.coverImageUrl) || 'https://via.placeholder.com/300'} className="w-full h-full object-cover" alt={album.title} />
        </div>
        <div className="flex-1 space-y-4">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Album</span>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight">{album.title}</h1>
          <div className="flex items-center gap-2 font-bold">
            <NavLink to={`/artist/${album.artist.id}`} className="hover:underline">{album.artist.name}</NavLink>
            <span className="text-on-surface-variant">•</span>
            <span className="text-on-surface-variant font-normal">{new Date(album.releaseDate).getFullYear()}</span>
            <span className="text-on-surface-variant">•</span>
            <span className="text-on-surface-variant font-normal">{album.tracks.length}곡, {totalMinutes}분</span>
          </div>
        </div>
      </div>

      {/* ── Action Bar ── */}
      <div className="flex items-center gap-6">
        <button
          onClick={handlePlayAll}
          className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-on-primary shadow-lg hover:scale-105 active:scale-95 transition-all"
          title="전체 재생"
        >
          <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
        </button>
        <button className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors text-3xl">more_horiz</button>
      </div>

      {/* ── Track List ── */}
      <section>
        <div className="grid grid-cols-[3rem_1fr_3rem_6rem] px-4 py-2 border-b border-outline-variant/20 text-xs font-bold text-on-surface-variant uppercase tracking-widest">
          <span className="text-center">#</span>
          <span>제목</span>
          <span></span>
          <span className="text-right">길이</span>
        </div>
        <div className="mt-2">
          {album.tracks.map((track, idx) => (
            <div 
              key={track.id} 
              className={`grid grid-cols-[3rem_1fr_3rem_6rem] items-center px-4 py-3 rounded-xl transition-all group cursor-pointer
                ${isTrackCurrent(track.id) ? 'bg-primary/10' : 'hover:bg-surface-container'}`}
              onClick={() => handlePlayTrack(idx)}
            >
              {/* Track number / playing indicator */}
              <div className="text-center">
                {isTrackPlaying(track.id) ? (
                  <span className="material-symbols-outlined text-primary text-sm animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>
                    equalizer
                  </span>
                ) : isTrackCurrent(track.id) ? (
                  <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                    pause
                  </span>
                ) : (
                  <>
                    <span className="text-on-surface-variant font-bold group-hover:hidden">
                      {track.trackNumber || idx + 1}
                    </span>
                    <span className="hidden group-hover:inline text-primary">
                      <span className="material-symbols-outlined text-sm">play_arrow</span>
                    </span>
                  </>
                )}
              </div>
              <div className={`font-bold truncate ${isTrackCurrent(track.id) ? 'text-primary' : ''}`}>
                {track.title}
              </div>
              <div className="flex justify-center">
                <button
                  onClick={(e) => handleToggleLike(track.id, e)}
                  className="transition-transform hover:scale-110"
                >
                  <span
                    className={`material-symbols-outlined text-lg ${likedTracks.has(track.id) ? 'text-primary' : 'text-on-surface-variant/50 hover:text-on-surface-variant'}`}
                    style={likedTracks.has(track.id) ? { fontVariationSettings: "'FILL' 1" } : {}}
                  >
                    favorite
                  </span>
                </button>
              </div>
              <div className="text-right text-sm text-on-surface-variant">
                {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AlbumDetail;
