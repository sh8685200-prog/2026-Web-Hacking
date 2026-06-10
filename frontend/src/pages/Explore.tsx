import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useMusicPlayer } from '../contexts/MusicPlayerContext';
import api from '../api/axiosInterceptor';

const genres = [
  { name: 'Pop', gradient: 'from-pink-500 to-rose-500', img: 'https://images.unsplash.com/photo-1514525253361-bee243870eb2?auto=format&fit=crop&q=80&w=200' },
  { name: 'Hip-Hop', gradient: 'from-amber-500 to-orange-600', img: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&q=80&w=200' },
  { name: 'K-Pop', gradient: 'from-purple-500 to-indigo-600', img: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=200' },
  { name: 'Rock', gradient: 'from-red-600 to-stone-800', img: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&q=80&w=200' },
  { name: 'Chill', gradient: 'from-teal-400 to-cyan-600', img: 'https://images.unsplash.com/photo-1494232410401-ad00d5433cfa?auto=format&fit=crop&q=80&w=200' },
  { name: 'Electronic', gradient: 'from-blue-600 to-fuchsia-600', img: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=200' },
];

const Explore: React.FC = () => {
  const [newAlbums, setNewAlbums] = useState<any[]>([]);
  const [trendingTracks, setTrendingTracks] = useState<any[]>([]);
  const [genreTracks, setGenreTracks] = useState<any[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { playTrack } = useMusicPlayer();
  const navigate = useNavigate();

  const getImageUrl = (url?: string) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return url;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [albumsRes, trendingRes] = await Promise.all([
          api.get('/music/new-releases'),
          api.get('/music/trending')
        ]);
        setNewAlbums(albumsRes.data);
        setTrendingTracks(trendingRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const fetchTracksByGenre = async (genre: string) => {
    setLoading(true);
    setSelectedGenre(genre);
    try {
      const res = await api.get(`/music/by-genre?genre=${genre}`);
      setGenreTracks(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && newAlbums.length === 0) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20">
      {/* ── Featured New Release ── */}
      <section>
        <h2 className="font-headline text-3xl font-black mb-8 tracking-tight">최신 릴리스</h2>
        <div className="flex overflow-x-auto gap-6 pb-4 no-scrollbar -mx-2 px-2">
          {newAlbums.length > 0 ? newAlbums.map((album) => (
            <NavLink 
              key={album.id} 
              to={`/album/${album.id}`} 
              className="min-w-[300px] md:min-w-[450px] group relative aspect-[16/9] rounded-3xl overflow-hidden shadow-2xl shrink-0"
            >
              <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" src={getImageUrl(album.coverImageUrl) || 'https://via.placeholder.com/600x400'} alt={album.title} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 p-8 w-full backdrop-blur-md bg-surface-container-lowest/30">
                <span className="text-primary font-bold text-xs uppercase tracking-widest mb-2 block">New Release</span>
                <h3 className="font-headline text-4xl font-black text-white leading-tight mb-2 truncate">{album.title}</h3>
                <p 
                  className="text-on-surface-variant text-lg hover:text-primary hover:underline cursor-pointer inline-block"
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
          )) : (
            <p className="text-on-surface-variant">표시할 앨범이 없습니다.</p>
          )}
        </div>
      </section>

      {/* ── Genre Categories ── */}
      <section>
        <h2 className="font-headline text-2xl font-bold mb-6">장르 및 분위기</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {genres.map((g) => (
            <div 
              key={g.name} 
              onClick={() => fetchTracksByGenre(g.name)} 
              className={`h-32 relative rounded-2xl overflow-hidden cursor-pointer group hover:scale-[1.05] active:scale-95 transition-all bg-gradient-to-br ${g.gradient} ${selectedGenre === g.name ? 'ring-4 ring-primary ring-offset-4 ring-offset-background' : ''}`}
            >
              <div className="p-4 relative z-10">
                <h4 className="font-headline text-lg font-black text-white">{g.name}</h4>
              </div>
              <img loading="lazy" className="absolute bottom-[-5px] right-[-5px] w-16 h-16 object-cover rounded-lg rotate-[15deg] group-hover:rotate-0 transition-transform opacity-60" src={g.img} alt={g.name} />
            </div>
          ))}
        </div>
      </section>

      {/* ── Category Recommendations ── */}
      {selectedGenre && (
        <section className="animate-[slideUp_0.5s_ease]">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="font-headline text-2xl font-bold text-primary">{selectedGenre} 추천 곡</h2>
              <p className="text-on-surface-variant text-sm mt-1">이 장르에서 가장 인기 있는 곡들입니다.</p>
            </div>
            <button onClick={() => setSelectedGenre(null)} className="text-xs font-bold uppercase tracking-widest hover:text-primary">닫기</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {genreTracks.length > 0 ? genreTracks.map((t) => (
              <div key={t.id} className="group space-y-3 cursor-pointer" onClick={() => playTrack({
                id: t.id,
                title: t.title,
                artistName: t.artistName,
                albumTitle: '',
                coverImageUrl: t.albumCover,
                duration: t.duration
              })}>
                <div className="relative aspect-square rounded-2xl overflow-hidden shadow-lg">
                  <img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" src={getImageUrl(t.albumCover) || 'https://via.placeholder.com/200'} alt={t.title} />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
                  </div>
                </div>
                <div>
                  <p className="font-bold text-white leading-tight mb-1 truncate">{t.title}</p>
                  <p 
                    className="text-on-surface-variant text-sm truncate hover:text-primary hover:underline cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (t.artistId) navigate(`/artist/${t.artistId}`);
                    }}
                  >
                    {t.artistName}
                  </p>
                </div>
              </div>
            )) : (
              <div className="col-span-full py-12 text-center bg-surface-container rounded-3xl border border-dashed border-outline-variant/30">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2">music_off</span>
                <p className="text-on-surface-variant">아직 이 장르에 등록된 곡이 없습니다.</p>
                <button 
                  onClick={() => navigate(`/search?q=${selectedGenre}`)}
                  className="mt-4 text-primary font-bold hover:underline"
                >
                  통합 검색에서 찾아보기
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Trending Now ── */}
      <section>
        <h2 className="font-headline text-2xl font-bold mb-8">지금 뜨는 곡</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {trendingTracks.length > 0 ? trendingTracks.map((t) => (
            <div key={t.id} className="group space-y-3 cursor-pointer" onClick={() => playTrack({
              id: t.id,
              title: t.title,
              artistName: t.artistName,
              albumTitle: '',
              coverImageUrl: t.albumCover,
              duration: t.duration
            })}>
              <div className="relative aspect-square rounded-2xl overflow-hidden shadow-lg">
                <img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" src={getImageUrl(t.albumCover) || 'https://via.placeholder.com/200'} alt={t.title} />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
                </div>
              </div>
              <div>
                <p className="font-bold text-white leading-tight mb-1 truncate">{t.title}</p>
                <p 
                  className="text-on-surface-variant text-sm truncate hover:text-primary hover:underline cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (t.artistId) navigate(`/artist/${t.artistId}`);
                  }}
                >
                  {t.artistName}
                </p>
              </div>
            </div>
          )) : (
            <p className="text-on-surface-variant">등록된 곡이 없습니다.</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default Explore;
