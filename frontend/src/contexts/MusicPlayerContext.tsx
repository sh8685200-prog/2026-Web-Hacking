import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';

// ═══════════════════════════════════════════════════════
// 타입 정의
// ═══════════════════════════════════════════════════════

export interface TrackInfo {
  id: number;
  title: string;
  artistName: string;
  albumTitle: string;
  coverImageUrl?: string;
  duration: number;
}

export type RepeatMode = 'off' | 'all' | 'one';

interface MusicPlayerState {
  currentTrack: TrackInfo | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  queue: TrackInfo[];
  queueIndex: number;
  shuffle: boolean;
  repeat: RepeatMode;
  isQueueOpen: boolean;
}

interface MusicPlayerActions {
  playTrack: (track: TrackInfo) => void;
  playAlbum: (tracks: TrackInfo[], startIndex?: number) => void;
  addToQueue: (track: TrackInfo) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  playQueueItem: (index: number) => void;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  seekTo: (time: number) => void;
  setVolume: (volume: number) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  toggleQueue: () => void;
  audioRef: React.RefObject<HTMLAudioElement>;
}

type MusicPlayerContextType = MusicPlayerState & MusicPlayerActions;

// ═══════════════════════════════════════════════════════
// Context 생성
// ═══════════════════════════════════════════════════════

const MusicPlayerContext = createContext<MusicPlayerContextType | null>(null);

// ═══════════════════════════════════════════════════════
// Provider 컴포넌트
// ═══════════════════════════════════════════════════════

export const MusicPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<TrackInfo | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(75);
  const [queue, setQueue] = useState<TrackInfo[]>([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>('off');
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // 시크 중 timeupdate 이벤트가 currentTime을 덮어쓰는 것을 방지하는 플래그
  const isSeekingRef = useRef(false);

  // 셔플 이력 관리 (뒤로가기 지원)
  const shuffleHistoryRef = useRef<number[]>([]);

  /**
   * 스트리밍 URL 생성.
   */
  const getStreamUrl = (trackId: number) =>
    `/api/music/stream/${trackId}`;

  // ── 내부: 특정 트랙 로드 & 재생 ──
  const loadAndPlay = useCallback((track: TrackInfo) => {
    setCurrentTrack(track);
    setIsPlaying(true);
    setCurrentTime(0);
    setDuration(0);

    if (audioRef.current) {
      audioRef.current.src = getStreamUrl(track.id);
      audioRef.current.load();
      audioRef.current.play().catch(err => {
        console.error('재생 실패:', err);
        setIsPlaying(false);
      });
    }
  }, []);

  // ── 단일 트랙 재생 (큐에 추가) ──
  const playTrack = useCallback((track: TrackInfo) => {
    setQueue([track]);
    setQueueIndex(0);
    shuffleHistoryRef.current = [0];
    loadAndPlay(track);
  }, [loadAndPlay]);

  // ── 앨범 전체 재생 (모든 트랙을 큐에 추가) ──
  const playAlbum = useCallback((tracks: TrackInfo[], startIndex: number = 0) => {
    if (tracks.length === 0) return;
    setQueue(tracks);
    setQueueIndex(startIndex);
    shuffleHistoryRef.current = [startIndex];
    loadAndPlay(tracks[startIndex]);
  }, [loadAndPlay]);

  // ── 큐에 트랙 추가 ──
  const addToQueue = useCallback((track: TrackInfo) => {
    setQueue(prev => [...prev, track]);
  }, []);

  // ── 큐에서 트랙 제거 ──
  const removeFromQueue = useCallback((index: number) => {
    setQueue(prev => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
    setQueueIndex(prev => {
      if (index < prev) return prev - 1;
      if (index === prev) return prev; // 현재 트랙 제거 시 위치 유지
      return prev;
    });
  }, []);

  // ── 큐 비우기 ──
  const clearQueue = useCallback(() => {
    setQueue([]);
    setQueueIndex(-1);
  }, []);

  // ── 큐에서 특정 항목 재생 ──
  const playQueueItem = useCallback((index: number) => {
    if (index >= 0 && index < queue.length) {
      setQueueIndex(index);
      shuffleHistoryRef.current = [index];
      loadAndPlay(queue[index]);
    }
  }, [queue, loadAndPlay]);

  // ── 다음 트랙 ──
  const nextTrack = useCallback(() => {
    if (queue.length === 0) return;

    if (repeat === 'one') {
      // 한 곡 반복: 현재 곡 처음부터 다시
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(console.error);
        setIsPlaying(true);
      }
      return;
    }

    let nextIdx: number;

    if (shuffle) {
      // 셔플 모드: 랜덤 다음 곡 (현재 곡 제외)
      const available = queue.map((_, i) => i).filter(i => i !== queueIndex);
      if (available.length === 0) {
        if (repeat === 'all') {
          nextIdx = Math.floor(Math.random() * queue.length);
        } else {
          setIsPlaying(false);
          return;
        }
      } else {
        nextIdx = available[Math.floor(Math.random() * available.length)];
      }
      shuffleHistoryRef.current.push(nextIdx);
    } else {
      nextIdx = queueIndex + 1;
      if (nextIdx >= queue.length) {
        if (repeat === 'all') {
          nextIdx = 0;
        } else {
          setIsPlaying(false);
          return;
        }
      }
    }

    setQueueIndex(nextIdx);
    loadAndPlay(queue[nextIdx]);
  }, [queue, queueIndex, shuffle, repeat, loadAndPlay]);

  // ── 이전 트랙 ──
  const prevTrack = useCallback(() => {
    if (queue.length === 0) return;

    // 3초 이상 재생했으면 처음으로 되돌리기
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      return;
    }

    let prevIdx: number;

    if (shuffle) {
      // 셔플 이력에서 이전 곡
      const history = shuffleHistoryRef.current;
      if (history.length > 1) {
        history.pop();
        prevIdx = history[history.length - 1];
      } else {
        prevIdx = queueIndex;
      }
    } else {
      prevIdx = queueIndex - 1;
      if (prevIdx < 0) {
        if (repeat === 'all') {
          prevIdx = queue.length - 1;
        } else {
          prevIdx = 0;
        }
      }
    }

    setQueueIndex(prevIdx);
    loadAndPlay(queue[prevIdx]);
  }, [queue, queueIndex, shuffle, repeat, loadAndPlay]);

  // ── 재생/일시정지 토글 ──
  const togglePlay = useCallback(() => {
    if (!audioRef.current || !currentTrack) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(err => console.error('재생 실패:', err));
      setIsPlaying(true);
    }
  }, [isPlaying, currentTrack]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const resume = useCallback(() => {
    audioRef.current?.play().catch(console.error);
    setIsPlaying(true);
  }, []);

  // ── 시간 이동 (건너뛰기) → Range Request 활용 ──
  const seekTo = useCallback((time: number) => {
    if (audioRef.current) {
      isSeekingRef.current = true;
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  // ── 볼륨 변경 ──
  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(100, vol));
    setVolumeState(clamped);
    if (audioRef.current) {
      audioRef.current.volume = clamped / 100;
    }
  }, []);

  // ── 셔플 토글 ──
  const toggleShuffle = useCallback(() => {
    setShuffle(prev => !prev);
  }, []);

  // ── 반복 모드 토글: off → all → one → off ──
  const toggleRepeat = useCallback(() => {
    setRepeat(prev => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  }, []);

  // ── 큐 패널 토글 ──
  const toggleQueue = useCallback(() => {
    setIsQueueOpen(prev => !prev);
  }, []);

  // ── 오디오 이벤트 핸들러 등록 ──
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      // 시크 중에는 timeupdate를 무시 (0:00 복귀 방지)
      if (isSeekingRef.current) return;
      setCurrentTime(audio.currentTime);
    };
    const handleSeeked = () => {
      // 시크 완료 후 플래그 해제, 최종 위치 반영
      isSeekingRef.current = false;
      setCurrentTime(audio.currentTime);
    };
    const handleDurationChange = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const handleEnded = () => {
      // 곡 종료 시 자동 다음 곡 재생
      nextTrack();
    };
    const handleError = (e: any) => {
      const error = e.target.error;
      let message = '알 수 없는 오디오 에러';
      if (error) {
        switch (error.code) {
          case error.MEDIA_ERR_ABORTED: message = '재생이 중단되었습니다.'; break;
          case error.MEDIA_ERR_NETWORK: message = '네트워크 오류로 인해 오디오 로딩이 실패했습니다.'; break;
          case error.MEDIA_ERR_DECODE: message = '오디오 디코딩 중 오류가 발생했습니다.'; break;
          case error.MEDIA_ERR_SRC_NOT_SUPPORTED: message = '지원하지 않는 오디오 형식이거나 스트리밍 주소에 접근할 수 없습니다. (미리듣기 제공이 중단되었을 수 있습니다)'; break;
        }
      }
      console.error('MusicPlayer 에러:', message, error);
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('seeked', handleSeeked);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    // 볼륨 초기화
    audio.volume = volume / 100;

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('seeked', handleSeeked);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [volume, nextTrack]);

  const value: MusicPlayerContextType = {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    queue,
    queueIndex,
    shuffle,
    repeat,
    isQueueOpen,
    playTrack,
    playAlbum,
    addToQueue,
    removeFromQueue,
    clearQueue,
    playQueueItem,
    togglePlay,
    pause,
    resume,
    seekTo,
    setVolume,
    nextTrack,
    prevTrack,
    toggleShuffle,
    toggleRepeat,
    toggleQueue,
    audioRef,
  };

  return (
    <MusicPlayerContext.Provider value={value}>
      {/* 
        핵심: <audio> 태그를 Provider 최상단에 한 번만 렌더링.
        crossOrigin="use-credentials" → CORS 환경에서 HttpOnly 쿠키(JWT) 전송.
        preload="metadata" → 메타데이터(duration 등)만 미리 로드.
      */}
      <audio
        ref={audioRef}
        preload="metadata"
      />
      {children}
    </MusicPlayerContext.Provider>
  );
};

// ═══════════════════════════════════════════════════════
// Custom Hook
// ═══════════════════════════════════════════════════════

export const useMusicPlayer = (): MusicPlayerContextType => {
  const context = useContext(MusicPlayerContext);
  if (!context) {
    throw new Error('useMusicPlayer는 MusicPlayerProvider 내에서 사용해야 합니다.');
  }
  return context;
};

export default MusicPlayerContext;
