import React, { useState, useRef } from 'react';
import './Player.css';

const MusicPlayer = ({ onLogout }) => {
  const [currentView, setCurrentView] = useState('explore'); // 'home' or 'explore'
  const [currentTrack, setCurrentTrack] = useState({
    id: 1,
    title: "Don't Believe The Truth",
    artist: 'Oasis',
    image: 'assets/oasis.png',
    isForeign: true
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const featuredTracks = [
    { id: 1, title: "Don't Believe The Truth", subtitle: 'Oasis', image: 'assets/oasis.png', isForeign: true },
    { id: 2, title: 'Jamong Salgu Club', subtitle: 'Hanroro', image: 'assets/hanroro.png', isForeign: false },
    { id: 3, title: 'Parcels', subtitle: 'Parcels', image: 'assets/parcels.png', isForeign: true },
    { id: 4, title: 'Wish You Were Here', subtitle: 'Pink Floyd', image: 'assets/pinkfloyd.png', isForeign: true }
  ];

  const madeForYouTracks = [
    { id: 5, title: 'Daily Mix 1', subtitle: 'Made for Developer with tracks from Oasis, Hanroro,...', image: 'assets/oasis.png', isForeign: false }, 
    { id: 6, title: 'Discover Weekly', subtitle: 'Your weekly mixtape of fresh music. New tracks...', image: 'assets/hanroro.png', isForeign: false },
    { id: 7, title: 'Release Radar', subtitle: 'Catch all the latest music from artists you follow.', image: 'assets/parcels.png', isForeign: false },
    { id: 8, title: 'Mood Booster', subtitle: 'Get your daily dose of positivity with these upbeat...', image: 'assets/pinkfloyd.png', isForeign: false },
    { id: 9, title: 'The Flow', subtitle: 'Deeply immersive ambient and downtempo for deep...', image: 'assets/oasis.png', isForeign: false }
  ];

  const trendingArtists = [
    { name: 'Vortex', image: 'assets/parcels.png' },
    { name: 'Luna Sol', image: 'assets/hanroro.png' },
    { name: 'Cyber Pulse', image: 'assets/oasis.png' },
    { name: 'Miles Blue', image: 'assets/pinkfloyd.png' },
  ];

  const browseCategories = [
    { name: 'Pop', colorClass: 'bg-pop', img: 'assets/hanroro.png' },
    { name: 'Rock', colorClass: 'bg-rock', img: 'assets/oasis.png' },
    { name: 'Electronic', colorClass: 'bg-electronic', img: 'assets/parcels.png' },
    { name: 'Jazz', colorClass: 'bg-jazz', img: 'assets/pinkfloyd.png' },
    { name: 'K-Pop', colorClass: 'bg-kpop', img: 'assets/hanroro.png' },
    { name: 'Indie', colorClass: 'bg-indie', img: 'assets/parcels.png' },
    { name: 'Hip-Hop', colorClass: 'bg-hiphop', img: 'assets/oasis.png' },
    { name: 'Chill', colorClass: 'bg-chill', img: 'assets/pinkfloyd.png' },
  ];

  const playTrack = (track) => {
    setCurrentTrack({ ...track, artist: track.subtitle }); 
    setIsPlaying(true);
    if (audioRef.current) {
        audioRef.current.src = `/stream.php?action=stream&track_id=${track.id}`;
        audioRef.current.play().catch(e => console.error("Playback failed", e));
    }
  };

  const togglePlay = () => {
    if (!audioRef.current.src && currentTrack) {
        audioRef.current.src = `/stream.php?action=stream&track_id=${currentTrack.id}`;
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.error("Playback failed", e));
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="app-container">
      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} />
      
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo-section">
          <h2>SonicImmersion</h2>
          <span className="logo-subtitle">Premium Member</span>
        </div>
        
        <nav className="main-nav">
          <ul>
            <li className={currentView === 'home' ? 'active' : ''} onClick={() => setCurrentView('home')}>
                <span className="icon">🏠</span> Home
            </li>
            <li className={currentView === 'explore' ? 'active-pill' : ''} onClick={() => setCurrentView('explore')}>
                <span className="icon">🔍</span> Explore
            </li>
            <li className={currentView === 'library' ? 'active' : ''} onClick={() => setCurrentView('library')}>
                <span className="icon">📚</span> Library
            </li>
            
            <div className="sidebar-divider"></div>

            <li className={currentView === 'liked' ? 'active' : ''}>
                <span className="icon">🤍</span> Liked Songs
            </li>
            <li className={currentView === 'playlists' ? 'active' : ''}>
                <span className="icon">≡</span> Playlists
            </li>
          </ul>
        </nav>
        
        <div className="sidebar-bottom">
            <button className="create-playlist-btn">Create Playlist</button>
            <button onClick={onLogout} className="settings-btn"><span className="icon">⚙️</span> Settings / Logout</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-view">
        <header className="topbar">
          <div className="topbar-left">
            {/* Nav Arrows hidden in new design, left space empty */}
          </div>
          <div className="topbar-right">
            <nav className="top-nav-links">
                <span className={currentView === 'home' ? 'active' : ''} onClick={() => setCurrentView('home')}>Home</span>
                <span className={currentView === 'explore' ? 'active' : ''} onClick={() => setCurrentView('explore')}>Explore</span>
                <span className={currentView === 'library' ? 'active' : ''} onClick={() => setCurrentView('library')}>Library</span>
            </nav>
            <button className="icon-btn-top">⚙️</button>
            <div className="user-profile">
              <span className="avatar-circle">👤</span>
            </div>
          </div>
        </header>

        <div className="content">
          
          {currentView === 'home' && (
            <div className="home-view-content">
              <div className="section-header">
                <h3>FEATURED SELECTIONS</h3>
              </div>
              
              <div className="featured-grid">
                {featuredTracks.map(track => (
                  <div key={`feat-${track.id}`} className="featured-card" onClick={() => playTrack(track)}>
                    <img src={track.image} alt={track.title} className="feat-img" />
                    <div className="feat-overlay" translate={track.isForeign ? "no" : "yes"}>
                        <button className="play-overlay">▶</button>
                        <h4>{track.title}</h4>
                        <span className="feat-subtitle">{track.subtitle}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="section-header flex-header">
                <h3>MADE FOR YOU</h3>
                <span className="view-all">View All</span>
              </div>

              <div className="made-for-you-grid">
                {madeForYouTracks.map(track => (
                  <div key={`made-${track.id}`} className="made-card" onClick={() => playTrack(track)}>
                    <div className="img-container">
                      <img src={track.image} alt={track.title} />
                      <button className="play-overlay">▶</button>
                    </div>
                    <h4 translate={track.isForeign ? "no" : "yes"}>{track.title}</h4>
                    <p translate={track.isForeign ? "no" : "yes"}>{track.subtitle}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentView === 'explore' && (
            <div className="explore-view-content">
                <div className="explore-search-bar">
                    <span className="icon">🔍</span>
                    <input type="text" placeholder="Artists, songs, or podcasts" />
                </div>

                <div className="section-header">
                    <h3>TRENDING ARTISTS</h3>
                </div>
                
                <div className="trending-artists">
                    {trendingArtists.map((artist, idx) => (
                        <div key={idx} className="artist-circle-card">
                            <img src={artist.image} alt={artist.name} className="artist-avatar" />
                            <span>{artist.name}</span>
                        </div>
                    ))}
                </div>

                <div className="section-header">
                    <h3>BROWSE ALL</h3>
                </div>

                <div className="browse-grid">
                    {browseCategories.map((cat, idx) => (
                        <div key={idx} className={`genre-card ${cat.colorClass}`}>
                            <h4>{cat.name}</h4>
                            <img src={cat.img} alt={cat.name} />
                        </div>
                    ))}
                </div>
            </div>
          )}

        </div>
      </main>

      {/* Player Bar */}
      <footer className="player-bar">
        <div className="now-playing">
          <img src={currentTrack.image} alt="Current Track" />
          <div className="track-info" translate={currentTrack.isForeign ? "no" : "yes"}>
            <h4>{currentTrack.title}</h4>
            <p>{currentTrack.artist}</p>
          </div>
          <button className="like-btn">🤍</button>
        </div>

        <div className="player-controls">
          <div className="control-buttons">
            <button className="icon-btn">🔀</button>
            <button className="icon-btn">⏮</button>
            <button className="play-pause-btn" onClick={togglePlay}>
                {isPlaying ? '⏸' : '▶'}
            </button>
            <button className="icon-btn">⏭</button>
            <button className="icon-btn">🔁</button>
          </div>
          <div className="playback-bar">
            <span className="time">2:14</span>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: isPlaying ? '50%' : '30%' }}></div>
              <div className="progress-thumb" style={{ left: isPlaying ? '50%' : '30%', opacity: 0 }}></div>
            </div>
            <span className="time">4:45</span>
          </div>
        </div>

        <div className="extra-controls">
          <button className="icon-btn">🎤</button>
          <button className="icon-btn">≡</button>
          <button className="icon-btn">🔈</button>
          <div className="volume-bar">
            <div className="progress-fill" style={{ width: '80%' }}></div>
          </div>
          <button className="icon-btn">⛶</button>
        </div>
      </footer>
    </div>
  );
};

export default MusicPlayer;
