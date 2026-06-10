import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Heart } from 'lucide-react';
// import api from '../api/axiosInterceptor'; 

const MusicPlayer: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  // 컴포넌트 마운트 시 청크 단위 스트리밍 주소 할당 (OWASP 방어 통과)
  // 실제 연결 URL 예시: /api/music/stream/1 
  const CHUNK_STREAM_URL = "/api/music/stream/1"; 

  useEffect(() => {
    if (audioRef.current) {
        audioRef.current.src = CHUNK_STREAM_URL;
        audioRef.current.load();
    }
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.error("Playback failed", e));
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressPercentage = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      
      {/* Hidden Audio Element handles Range Chunking securely */}
      <audio 
        ref={audioRef} 
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
        preload="metadata"
      />

      <main style={{ flex: 1, padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <h1 style={{ color: 'var(--text-muted)', fontWeight: 300, fontSize: '1.8rem', textAlign: 'center', lineHeight: '1.6' }}>
          서버 메모리 고갈을 다 막아내는,<br/>강력한 청크 기반 백엔드가 연결되었습니다.
        </h1>
      </main>

      {/* Floating Bottom Media Player */}
      <div style={{ position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 4rem)', maxWidth: '900px', zIndex: 50 }}>
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.5rem', background: 'rgba(20, 20, 20, 0.7)' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '30%' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '8px', background: 'linear-gradient(45deg, #1e3a8a, #3b82f6)', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }} />
            <div>
              <h4 style={{ fontSize: '0.95rem', marginBottom: '0.2rem' }}>Chunk Protocol</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>ASP.NET Core (EnableRange)</p>
            </div>
            <button onClick={() => setIsLiked(!isLiked)} style={{ marginLeft: '1rem', transition: 'transform 0.2s', transform: isLiked ? 'scale(1.1)' : 'scale(1)' }}>
              <Heart size={20} color={isLiked ? '#ef4444' : 'var(--text-muted)'} fill={isLiked ? '#ef4444' : 'none'} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '40%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '0.5rem' }}>
              <button style={{ color: 'var(--text-secondary)' }}><SkipBack size={24} /></button>
              <button 
                onClick={togglePlay}
                style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--text-primary)', color: 'var(--bg-primary)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
              >
                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" style={{ marginLeft: '2px' }} />}
              </button>
              <button style={{ color: 'var(--text-secondary)' }}><SkipForward size={24} /></button>
            </div>
            
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>{formatTime(currentTime)}</span>
              <div style={{ flex: 1, height: '4px', background: 'var(--bg-tertiary)', borderRadius: '2px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${progressPercentage}%`, background: 'var(--accent-color)', borderRadius: '2px' }} />
              </div>
              <span>{duration ? formatTime(duration) : '0:00'}</span>
            </div>
          </div>

          <div style={{ width: '30%', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
            <Volume2 size={20} color="var(--text-secondary)" />
            <div style={{ width: '80px', height: '4px', background: 'var(--bg-tertiary)', borderRadius: '2px' }}>
              <div style={{ height: '100%', width: '80%', background: 'var(--text-secondary)', borderRadius: '2px' }} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default MusicPlayer;
