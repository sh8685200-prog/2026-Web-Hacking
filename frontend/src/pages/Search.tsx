import React, { useState, useEffect } from 'react';
import { useLocation, NavLink, useNavigate } from 'react-router-dom';
import { useMusicPlayer } from '../contexts/MusicPlayerContext';
import api from '../api/axiosInterceptor';

interface SearchResult {
  tracks: any[];
  artists: any[];
  albums: any[];
}

const Search: React.FC = () => {
  const location = useLocation();
  const query = new URLSearchParams(location.search).get('q') || '';
  const [results, setResults] = useState<SearchResult>({ tracks: [], artists: [], albums: [] });
  const [loading, setLoading] = useState(false);
  const { playTrack } = useMusicPlayer();
  const navigate = useNavigate();

  const getImageUrl = (url?: string) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return url;
  };

  useEffect(() => {
    if (query) {
      setLoading(true);
      api.get(`/music/search?q=${encodeURIComponent(query)}`)
        .then(res => setResults(res.data))
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [query]);

  if (!query) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-on-surface-variant">
        <span className="material-symbols-outlined text-6xl mb-4">search</span>
        <h2 className="text-xl font-bold">검색어를 입력하여 원하는 음악을 찾아보세요.</h2>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const hasResults = results.tracks.length > 0 || results.artists.length > 0 || results.albums.length > 0;

  return (
    <div className="space-y-12 pb-10">
      <h1 className="font-headline text-3xl font-black">"{query}" 검색 결과</h1>

      {!hasResults ? (
        <div className="text-center py-20 text-on-surface-variant">
          <p className="text-lg">검색 결과가 없습니다.</p>
        </div>
      ) : (
        <>
          {/* 아티스트 */}
          {results.artists.length > 0 && (
            <section className="space-y-6">
              <h2 className="text-2xl font-bold border-b border-outline-variant/20 pb-2">아티스트</h2>
              <div className="flex gap-8 overflow-x-auto no-scrollbar pb-4">
                {results.artists.map(artist => (
                  <NavLink key={artist.id} to={`/artist/${artist.id}`} className="flex-none w-32 group">
                    <div className="aspect-square rounded-full overflow-hidden mb-3 border-2 border-transparent group-hover:border-primary transition-all shadow-lg">
                      <img 
                        src={getImageUrl(artist.profileImageUrl) || 'https://via.placeholder.com/150'} 
                        className="w-full h-full object-cover" 
                        alt={artist.name} 
                      />
                    </div>
                    <p className="text-center font-bold truncate group-hover:text-primary">{artist.name}</p>
                  </NavLink>
                ))}
              </div>
            </section>
          )}

          {/* 곡 */}
          {results.tracks.length > 0 && (
            <section className="space-y-6">
              <h2 className="text-2xl font-bold border-b border-outline-variant/20 pb-2">곡</h2>
              <div className="space-y-1">
                {results.tracks.map((track, idx) => (
                  <div 
                    key={track.id} 
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-surface-container transition-colors group cursor-pointer"
                    onClick={() => playTrack({
                      id: track.id,
                      title: track.title,
                      artistName: track.artist,
                      albumTitle: '',
                      coverImageUrl: track.albumCover,
                      duration: track.duration
                    })}
                  >
                    <span className="w-6 text-center text-on-surface-variant group-hover:hidden">{idx + 1}</span>
                    <span className="w-6 text-center text-primary hidden group-hover:block material-symbols-outlined text-sm">play_arrow</span>
                    <img src={getImageUrl(track.albumCover) || 'https://via.placeholder.com/50'} className="w-12 h-12 rounded-lg object-cover" alt="" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{track.title}</p>
                      <p 
                        className="text-sm text-on-surface-variant truncate hover:text-primary hover:underline cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (track.artistId) navigate(`/artist/${track.artistId}`);
                        }}
                      >
                        {track.artist}
                      </p>
                    </div>
                    <span className="text-sm text-on-surface-variant">
                      {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 앨범 */}
          {results.albums.length > 0 && (
            <section className="space-y-6">
              <h2 className="text-2xl font-bold border-b border-outline-variant/20 pb-2">앨범</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {results.albums.map(album => (
                  <NavLink key={album.id} to={`/album/${album.id}`} className="group">
                    <div className="aspect-square rounded-2xl overflow-hidden mb-3 relative">
                      <img src={getImageUrl(album.coverImageUrl) || 'https://via.placeholder.com/300'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={album.title} />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-on-primary shadow-lg">
                          <span className="material-symbols-outlined">play_arrow</span>
                        </div>
                      </div>
                    </div>
                    <p className="font-bold truncate group-hover:text-primary">{album.title}</p>
                    <p 
                      className="text-sm text-on-surface-variant truncate hover:text-primary hover:underline cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (album.artistId) navigate(`/artist/${album.artistId}`);
                      }}
                    >
                      {album.artist}
                    </p>
                  </NavLink>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default Search;
