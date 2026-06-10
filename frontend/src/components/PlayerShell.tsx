import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMusicPlayer } from '../contexts/MusicPlayerContext';
import api from '../api/axiosInterceptor';

// ── 드래그 가능한 슬라이더 Hook ──
function useDragSlider(
  onChange: (ratio: number) => void,
  onDragEnd?: (ratio: number) => void
) {
  const ref = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const [dragRatio, setDragRatio] = useState<number | null>(null);

  const getRatio = useCallback((clientX: number) => {
    if (!ref.current) return 0;
    const rect = ref.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    const ratio = getRatio(e.clientX);
    setDragRatio(ratio);
    onChange(ratio);

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const r = getRatio(ev.clientX);
      setDragRatio(r);
      onChange(r);
    };
    const handleMouseUp = (ev: MouseEvent) => {
      isDragging.current = false;
      const r = getRatio(ev.clientX);
      setDragRatio(null);
      onDragEnd?.(r);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [getRatio, onChange, onDragEnd]);

  // Touch support
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    isDragging.current = true;
    const touch = e.touches[0];
    const ratio = getRatio(touch.clientX);
    setDragRatio(ratio);
    onChange(ratio);

    const handleTouchMove = (ev: TouchEvent) => {
      if (!isDragging.current) return;
      const r = getRatio(ev.touches[0].clientX);
      setDragRatio(r);
      onChange(r);
    };
    const handleTouchEnd = (ev: TouchEvent) => {
      isDragging.current = false;
      const lastTouch = ev.changedTouches[0];
      const r = getRatio(lastTouch.clientX);
      setDragRatio(null);
      onDragEnd?.(r);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);
  }, [getRatio, onChange, onDragEnd]);

  return { ref, dragRatio, handleMouseDown, handleTouchStart, isDragging: isDragging.current };
}

// ── 재생 목록 패널 컴포넌트 ──
const QueuePanel: React.FC = () => {
  const { queue, queueIndex, currentTrack, isQueueOpen, toggleQueue, playQueueItem, removeFromQueue, clearQueue } = useMusicPlayer();

  if (!isQueueOpen) return null;

  const getImageUrl = (url?: string) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return url;
  };

  return (
    <div className="fixed right-4 bottom-28 w-80 max-h-[60vh] bg-surface-container/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-outline-variant/20 z-[60] flex flex-col overflow-hidden animate-in">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/15">
        <h3 className="font-headline font-bold text-sm">재생 대기열</h3>
        <div className="flex items-center gap-2">
          {queue.length > 1 && (
            <button
              onClick={clearQueue}
              className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-error transition-colors"
            >
              전체 삭제
            </button>
          )}
          <button onClick={toggleQueue} className="text-on-surface-variant hover:text-white transition-colors">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      </div>

      {/* Current Track */}
      {currentTrack && (
        <div className="px-4 py-3 border-b border-outline-variant/10">
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2 block">지금 재생 중</span>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
              {currentTrack.coverImageUrl ? (
                <img className="w-full h-full object-cover" src={getImageUrl(currentTrack.coverImageUrl) || ''} alt={currentTrack.title} />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-emerald-800 to-emerald-500" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold truncate text-primary">{currentTrack.title}</p>
              <p className="text-[10px] text-on-surface-variant truncate">{currentTrack.artistName}</p>
            </div>
          </div>
        </div>
      )}

      {/* Queue List */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl mb-2">queue_music</span>
            <p className="text-xs">대기열이 비어있습니다</p>
          </div>
        ) : (
          <div className="py-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 px-5 mb-1 block">
              다음 재생 • {queue.length}곡
            </span>
            {queue.map((track, idx) => (
              <div
                key={`${track.id}-${idx}`}
                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-all group
                  ${idx === queueIndex ? 'bg-primary/10' : 'hover:bg-surface-container-high'}`}
                onClick={() => playQueueItem(idx)}
              >
                <span className={`text-xs font-bold w-5 text-center flex-shrink-0 ${idx === queueIndex ? 'text-primary' : 'text-on-surface-variant/50'}`}>
                  {idx === queueIndex ? (
                    <span className="material-symbols-outlined text-sm text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>volume_up</span>
                  ) : idx + 1}
                </span>
                <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0">
                  {track.coverImageUrl ? (
                    <img className="w-full h-full object-cover" src={getImageUrl(track.coverImageUrl) || ''} alt={track.title} />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-emerald-800 to-emerald-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-bold truncate ${idx === queueIndex ? 'text-primary' : ''}`}>{track.title}</p>
                  <p className="text-[10px] text-on-surface-variant truncate">{track.artistName}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removeFromQueue(idx); }}
                  className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error transition-all flex-shrink-0"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};


const PlayerShell: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    queue,
    shuffle,
    repeat,
    togglePlay,
    seekTo,
    setVolume,
    nextTrack,
    prevTrack,
    toggleShuffle,
    toggleRepeat,
    toggleQueue,
    isQueueOpen,
  } = useMusicPlayer();

  const [isLiked, setIsLiked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(75);

  // 시간 시크: 드래그 중에는 로컬 값 사용, 드래그 끝나면 seekTo 호출
  const [seekingTime, setSeekingTime] = useState<number | null>(null);

  const progressSlider = useDragSlider(
    (ratio) => {
      setSeekingTime(ratio * duration);
    },
    (ratio) => {
      seekTo(ratio * duration);
      setSeekingTime(null);
    }
  );

  const volumeSlider = useDragSlider(
    (ratio) => {
      setVolume(Math.round(ratio * 100));
      if (ratio > 0) setIsMuted(false);
    }
  );

  // 트랙 변경 시 좋아요 상태 확인
  useEffect(() => {
    if (!currentTrack) return;
    api.get(`/library/is-liked/${currentTrack.id}`)
      .then(res => setIsLiked(res.data.isLiked))
      .catch(() => setIsLiked(false));
  }, [currentTrack]);

  // 하트 토글
  const handleToggleLike = async () => {
    if (!currentTrack) return;
    try {
      const res = await api.post(`/library/like/${currentTrack.id}`);
      setIsLiked(res.data.isLiked);
    } catch (err) {
      console.error('좋아요 토글 실패:', err);
    }
  };

  // 음소거 토글
  const handleMuteToggle = () => {
    if (isMuted) {
      setVolume(prevVolume);
      setIsMuted(false);
    } else {
      setPrevVolume(volume);
      setVolume(0);
      setIsMuted(true);
    }
  };

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const displayTime = seekingTime !== null ? seekingTime : currentTime;
  const progressPercent = duration > 0 ? (displayTime / duration) * 100 : 0;
  const volumePercent = volume;

  // 볼륨 아이콘
  const getVolumeIcon = () => {
    if (volume === 0 || isMuted) return 'volume_off';
    if (volume < 33) return 'volume_mute';
    if (volume < 66) return 'volume_down';
    return 'volume_up';
  };

  // 반복 아이콘
  const getRepeatIcon = () => {
    if (repeat === 'one') return 'repeat_one';
    return 'repeat';
  };

  const getImageUrl = (url?: string) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return url;
  };

  const trackTitle = currentTrack?.title || 'Midnight City';
  const trackArtist = currentTrack?.artistName || 'NEON SHADOWS';

  return (
    <>
      {/* Queue Panel */}
      <QueuePanel />

      {/* Mobile Floating Mini Player */}
      <div className="md:hidden fixed bottom-[88px] left-4 right-4 z-50 bg-[#262626]/80 backdrop-blur-3xl rounded-2xl shadow-[0px_20px_40px_rgba(0,0,0,0.4)] border border-white/5">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 shadow-lg flex-shrink-0">
              {currentTrack?.coverImageUrl ? (
                <img className="w-full h-full object-cover" src={getImageUrl(currentTrack.coverImageUrl) || ''} alt={trackTitle} />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-emerald-800 to-emerald-500" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-body font-bold text-sm leading-tight truncate">{trackTitle}</p>
              <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-wider truncate">{trackArtist}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button className="p-2 text-on-surface transition-transform active:scale-90" onClick={prevTrack}>
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>skip_previous</span>
            </button>
            <button className="w-10 h-10 flex items-center justify-center bg-primary rounded-full transition-transform active:scale-90" onClick={togglePlay}>
              <span className="material-symbols-outlined text-on-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                {isPlaying ? 'pause' : 'play_arrow'}
              </span>
            </button>
            <button className="p-2 text-on-surface transition-transform active:scale-90" onClick={nextTrack}>
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>skip_next</span>
            </button>
          </div>
        </div>
        {/* Progress Indicator */}
        <div className="px-4 pb-1">
          <div
            ref={progressSlider.ref}
            className="h-1 bg-white/10 rounded-full overflow-hidden relative cursor-pointer"
            onMouseDown={progressSlider.handleMouseDown}
            onTouchStart={progressSlider.handleTouchStart}
          >
            <div className="h-full bg-primary shadow-[0_0_8px_rgba(177,255,206,0.6)] transition-[width] duration-100" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      </div>

      {/* Desktop Player */}
      <footer className="hidden md:flex fixed bottom-4 left-4 right-4 rounded-[24px] h-24 bg-surface-variant/60 backdrop-blur-[24px] shadow-[0px_20px_40px_rgba(0,0,0,0.4)] items-center justify-between px-8 z-50">
        {/* Left: Track Info */}
        <div className="flex items-center gap-4 w-[280px]">
          <div className="w-14 h-14 rounded-xl overflow-hidden shadow-lg border border-white/10 flex-shrink-0">
            {currentTrack?.coverImageUrl ? (
              <img className="w-full h-full object-cover" src={getImageUrl(currentTrack.coverImageUrl) || ''} alt={trackTitle} />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-emerald-800 to-emerald-500" />
            )}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-on-surface truncate">{trackTitle}</p>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-wider truncate">{trackArtist}</p>
          </div>
          <button onClick={handleToggleLike} className="ml-1 transition-transform hover:scale-110 flex-shrink-0">
            <span
              className={`material-symbols-outlined text-xl ${isLiked ? 'text-primary' : 'text-on-surface-variant'}`}
              style={isLiked ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              favorite
            </span>
          </button>
        </div>

        {/* Center: Controls & Progress */}
        <div className="flex flex-col items-center gap-1.5 flex-1 max-w-2xl px-8">
          <div className="flex items-center gap-6">
            {/* Shuffle */}
            <button
              onClick={toggleShuffle}
              className={`transition-colors ${shuffle ? 'text-primary' : 'text-on-surface-variant hover:text-white'}`}
              title={shuffle ? '셔플 켜짐' : '셔플 꺼짐'}
            >
              <span className="material-symbols-outlined text-xl">shuffle</span>
              {shuffle && <div className="w-1 h-1 bg-primary rounded-full mx-auto mt-0.5" />}
            </button>
            {/* Previous */}
            <button onClick={prevTrack} className="text-white hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>skip_previous</span>
            </button>
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="w-11 h-11 rounded-full bg-primary flex items-center justify-center text-on-primary-fixed hover:scale-105 active:scale-95 transition-transform shadow-[0_0_15px_rgba(177,255,206,0.3)]"
            >
              <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                {isPlaying ? 'pause' : 'play_arrow'}
              </span>
            </button>
            {/* Next */}
            <button onClick={nextTrack} className="text-white hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>skip_next</span>
            </button>
            {/* Repeat */}
            <button
              onClick={toggleRepeat}
              className={`transition-colors ${repeat !== 'off' ? 'text-primary' : 'text-on-surface-variant hover:text-white'}`}
              title={repeat === 'off' ? '반복 꺼짐' : repeat === 'all' ? '전체 반복' : '한 곡 반복'}
            >
              <span className="material-symbols-outlined text-xl">{getRepeatIcon()}</span>
              {repeat !== 'off' && <div className="w-1 h-1 bg-primary rounded-full mx-auto mt-0.5" />}
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full flex items-center gap-3">
            <span className="text-[10px] font-body text-on-surface-variant w-10 text-right tabular-nums">
              {formatTime(displayTime)}
            </span>
            <div
              ref={progressSlider.ref}
              className="h-1.5 flex-1 bg-white/10 rounded-full overflow-visible relative group cursor-pointer"
              onMouseDown={progressSlider.handleMouseDown}
              onTouchStart={progressSlider.handleTouchStart}
            >
              {/* Filled bar */}
              <div
                className="absolute top-0 left-0 h-full bg-primary rounded-full shadow-[0_0_8px_#b1ffce] transition-[width] duration-75"
                style={{ width: `${progressPercent}%` }}
              />
              {/* Thumb */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[10px] font-body text-on-surface-variant w-10 tabular-nums">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Right: Queue + Volume */}
        <div className="flex items-center justify-end gap-4 w-[280px]">
          {/* Queue button */}
          <button
            onClick={toggleQueue}
            className={`transition-colors relative ${isQueueOpen ? 'text-primary' : 'text-on-surface-variant hover:text-white'}`}
            title="재생 대기열"
          >
            <span className="material-symbols-outlined text-xl">queue_music</span>
            {queue.length > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-primary text-on-primary text-[8px] font-bold rounded-full flex items-center justify-center">
                {queue.length > 99 ? '99+' : queue.length}
              </span>
            )}
          </button>

          {/* Volume */}
          <div className="flex items-center gap-2 group">
            <button onClick={handleMuteToggle} className="text-on-surface-variant group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-xl">{getVolumeIcon()}</span>
            </button>
            <div
              ref={volumeSlider.ref}
              className="w-24 h-1.5 bg-white/10 rounded-full overflow-visible relative cursor-pointer group/vol"
              onMouseDown={volumeSlider.handleMouseDown}
              onTouchStart={volumeSlider.handleTouchStart}
            >
              <div
                className="absolute top-0 left-0 h-full bg-on-surface-variant group-hover:bg-primary rounded-full transition-colors"
                style={{ width: `${volumePercent}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover/vol:opacity-100 transition-opacity"
                style={{ left: `${volumePercent}%` }}
              />
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default PlayerShell;
