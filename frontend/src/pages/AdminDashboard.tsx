import React, { useState, useRef, useEffect, DragEvent } from 'react';
import api from '../api/axiosInterceptor';

/* ── 타입 ── */
type TabKey = 'artist' | 'album' | 'track' | 'spotify' | 'security';

interface ArtistOption {
  id: number;
  name: string;
}
interface AlbumOption {
  id: number;
  title: string;
}

/* ── Dropzone 컴포넌트 ── */
const Dropzone: React.FC<{
  label: string;
  accept: string;
  icon: string;
  hint: string;
  file: File | null;
  onFileSelect: (f: File | null) => void;
}> = ({ label, accept, icon, hint, file, onFileSelect }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) onFileSelect(f);
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{label}</label>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300 group
          ${isDragOver
            ? 'border-primary bg-primary/10 scale-[1.01]'
            : file
              ? 'border-primary/40 bg-primary/5'
              : 'border-outline-variant/30 bg-surface-container hover:border-primary/50 hover:bg-surface-container-high'
          }`}
      >
        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => onFileSelect(e.target.files?.[0] || null)} />

        {file ? (
          <>
            <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-on-surface truncate max-w-[240px]">{file.name}</p>
              <p className="text-xs text-on-surface-variant mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onFileSelect(null); }}
              className="text-xs text-error hover:underline font-semibold"
            >
              파일 제거
            </button>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-2xl bg-surface-container-highest flex items-center justify-center group-hover:bg-primary/10 transition-colors">
              <span className="material-symbols-outlined text-on-surface-variant text-3xl group-hover:text-primary transition-colors">{icon}</span>
            </div>
            <div className="text-center">
              <p className="text-sm text-on-surface font-semibold">
                파일을 드래그하거나 <span className="text-primary">클릭하여 선택</span>
              </p>
              <p className="text-xs text-on-surface-variant mt-1">{hint}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/* ── 메인 대시보드 ── */
const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('artist');

  // 아티스트 폼
  const [artistName, setArtistName] = useState('');
  const [artistBio, setArtistBio] = useState('');
  const [artistImage, setArtistImage] = useState<File | null>(null);
  const [artistLoading, setArtistLoading] = useState(false);

  // 앨범 폼
  const [albumTitle, setAlbumTitle] = useState('');
  const [albumArtistId, setAlbumArtistId] = useState<number>(0);
  const [albumCover, setAlbumCover] = useState<File | null>(null);
  const [albumLoading, setAlbumLoading] = useState(false);

  // 음원 폼
  const [trackTitle, setTrackTitle] = useState('');
  const [trackAlbumId, setTrackAlbumId] = useState<number>(0);
  const [trackFile, setTrackFile] = useState<File | null>(null);
  const [trackNumber, setTrackNumber] = useState('');
  const [trackLoading, setTrackLoading] = useState(false);

  // Spotify 동기화 폼
  const [spotifyQuery, setSpotifyQuery] = useState('K-Pop');
  const [spotifyLoading, setSpotifyLoading] = useState(false);

  // 보안 로그 다운로드
  const [logDownloading, setLogDownloading] = useState(false);

  // 셀렉트 옵션
  const [artists, setArtists] = useState<ArtistOption[]>([]);
  const [albums, setAlbums] = useState<AlbumOption[]>([]);

  // 상태 메시지
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    api.get('/music/artists').then(r => setArtists(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === 'track' || activeTab === 'album') {
      api.get('/music/artists').then(r => setArtists(r.data)).catch(() => {});
    }
  }, [activeTab]);

  const fetchAlbums = async (artistId: number) => {
    if (!artistId) return;
    try {
      const r = await api.get(`/music/artists/${artistId}`);
      setAlbums(r.data.albums?.map((a: any) => ({ id: a.id, title: a.title })) || []);
    } catch { setAlbums([]); }
  };

  const showMsg = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  /* ── 아티스트 등록 ── */
  const handleArtistSubmit = async () => {
    if (!artistName.trim()) return showMsg('아티스트 이름을 입력해 주세요.', 'error');
    setArtistLoading(true);
    try {
      const fd = new FormData();
      fd.append('name', artistName);
      if (artistBio) fd.append('bio', artistBio);
      if (artistImage) fd.append('profileImage', artistImage);
      await api.post('/music/artists', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      showMsg('아티스트가 등록되었습니다!', 'success');
      setArtistName(''); setArtistBio(''); setArtistImage(null);
      api.get('/music/artists').then(r => setArtists(r.data));
    } catch (e: any) {
      showMsg(e.response?.data?.message || '등록 실패', 'error');
    } finally { setArtistLoading(false); }
  };

  /* ── 앨범 등록 ── */
  const handleAlbumSubmit = async () => {
    if (!albumTitle.trim()) return showMsg('앨범명을 입력해 주세요.', 'error');
    if (!albumArtistId) return showMsg('아티스트를 선택해 주세요.', 'error');
    setAlbumLoading(true);
    try {
      const fd = new FormData();
      fd.append('artistId', albumArtistId.toString());
      fd.append('title', albumTitle);
      if (albumCover) fd.append('coverImage', albumCover);
      await api.post('/music/albums', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      showMsg('앨범이 등록되었습니다!', 'success');
      setAlbumTitle(''); setAlbumCover(null);
    } catch (e: any) {
      showMsg(e.response?.data?.message || '등록 실패', 'error');
    } finally { setAlbumLoading(false); }
  };

  /* ── 음원 업로드 ── */
  const handleTrackSubmit = async () => {
    if (!trackTitle.trim()) return showMsg('곡 제목을 입력해 주세요.', 'error');
    if (!trackAlbumId) return showMsg('앨범을 선택해 주세요.', 'error');
    if (!trackFile) return showMsg('음원 파일을 첨부해 주세요.', 'error');
    setTrackLoading(true);
    try {
      const fd = new FormData();
      fd.append('albumId', trackAlbumId.toString());
      fd.append('title', trackTitle);
      fd.append('audioFile', trackFile);
      if (trackNumber) fd.append('trackNumber', trackNumber);
      await api.post('/music/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      showMsg('음원이 업로드되었습니다!', 'success');
      setTrackTitle(''); setTrackFile(null); setTrackNumber('');
    } catch (e: any) {
      showMsg(e.response?.data?.message || '업로드 실패', 'error');
    } finally { setTrackLoading(false); }
  };

  /* ── Spotify 데이터 동기화 ── */
  const handleSpotifySync = async () => {
    if (!spotifyQuery.trim()) return showMsg('검색 키워드를 입력해 주세요.', 'error');
    setSpotifyLoading(true);
    try {
      const response = await api.post('/admin/sync-spotify', { query: spotifyQuery, limit: 50 });
      showMsg(`성공! 총 ${response.data.importedCount}개의 곡이 DB에 저장되었습니다.`, 'success');
      // 목록 리프레시
      api.get('/music/artists').then(r => setArtists(r.data));
    } catch (e: any) {
      showMsg(e.response?.data?.message || '동기화 실패', 'error');
    } finally {
      setSpotifyLoading(false);
    }
  };

  /* ── 보안 로그 다운로드 ── */
  const handleLogDownload = async () => {
    setLogDownloading(true);
    try {
      const response = await api.get('/admin/logs/download', {
        responseType: 'blob',
        withCredentials: true,
      });

      // Content-Disposition 헤더에서 파일명 추출 (없으면 기본명 사용)
      const contentDisposition = response.headers['content-disposition'];
      let filename = `security-log-${new Date().toISOString().split('T')[0]}.txt`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match && match[1]) {
          filename = match[1].replace(/['"]*/g, '');
        }
      }

      // Blob → 다운로드 링크 동적 생성
      const blob = new Blob([response.data], { type: 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showMsg(`"${filename}" 다운로드가 완료되었습니다.`, 'success');
    } catch (err: any) {
      if (err.response?.status === 403) {
        showMsg('접근 권한이 없습니다. 관리자만 다운로드할 수 있습니다.', 'error');
      } else if (err.response?.status === 401) {
        showMsg('인증이 만료되었습니다. 다시 로그인해 주세요.', 'error');
      } else if (err.response?.status === 404) {
        showMsg('다운로드할 로그 파일이 없습니다. 서버 활동이 시작되면 생성됩니다.', 'error');
      } else {
        showMsg('로그 다운로드 중 오류가 발생했습니다.', 'error');
      }
    } finally {
      setLogDownloading(false);
    }
  };

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'artist', label: '아티스트 추가', icon: 'person_add' },
    { key: 'album', label: '앨범 추가', icon: 'album' },
    { key: 'track', label: '음원 업로드', icon: 'upload_file' },
    { key: 'spotify', label: 'Spotify 동기화', icon: 'sync' },
    { key: 'security', label: '보안 로그', icon: 'shield' },
  ];

  const selectClass = "w-full py-3 px-4 bg-surface-container-highest/80 border border-outline-variant/30 rounded-xl text-on-surface text-sm outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all appearance-none cursor-pointer";
  const inputClass = "w-full py-3 px-4 bg-surface-container-highest/80 border border-outline-variant/30 rounded-xl text-on-surface text-sm outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all placeholder:text-on-surface-variant/50";

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shadow-lg shadow-primary/20">
          <span className="material-symbols-outlined text-on-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>admin_panel_settings</span>
        </div>
        <div>
          <h1 className="font-headline text-2xl font-black text-on-surface tracking-tight">관리자 대시보드</h1>
          <p className="text-on-surface-variant text-xs font-medium">아티스트, 앨범, 음원 데이터 관리</p>
        </div>
      </div>

      {/* Toast */}
      {message && (
        <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl text-sm font-semibold animate-[slideDown_0.3s_ease] ${message.type === 'success' ? 'bg-primary/15 text-primary border border-primary/20' : 'bg-error/15 text-error border border-error/20'}`}>
          <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            {message.type === 'success' ? 'check_circle' : 'error'}
          </span>
          {message.text}
        </div>
      )}

      {/* Tab Menu */}
      <nav className="flex bg-surface-container rounded-2xl p-1.5 gap-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === t.key
                ? 'bg-primary text-on-primary shadow-lg shadow-primary/20'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <span className="material-symbols-outlined text-lg">{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </nav>

      {/* ═══ 아티스트 추가 ═══ */}
      {activeTab === 'artist' && (
        <div className="bg-surface-container rounded-3xl p-6 md:p-8 space-y-6 border border-outline-variant/10">
          <div className="flex items-center gap-3 pb-2 border-b border-outline-variant/10">
            <span className="material-symbols-outlined text-primary text-2xl">person_add</span>
            <h2 className="font-headline text-lg font-bold">새 아티스트 등록</h2>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">아티스트 이름 *</label>
            <input value={artistName} onChange={e => setArtistName(e.target.value)} className={inputClass} placeholder="예: Luna (루나)" maxLength={200} />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">소개글</label>
            <textarea value={artistBio} onChange={e => setArtistBio(e.target.value)} className={`${inputClass} min-h-[120px] resize-none`} placeholder="아티스트를 소개하는 글을 적어 주세요..." maxLength={2000} />
          </div>

          <Dropzone label="프로필 이미지" accept="image/jpeg,image/png,image/webp" icon="add_photo_alternate" hint="JPG, PNG, WebP · 최대 10MB" file={artistImage} onFileSelect={setArtistImage} />

          <button onClick={handleArtistSubmit} disabled={artistLoading} className="btn-primary mt-4">
            {artistLoading ? <span className="animate-spin material-symbols-outlined text-lg">progress_activity</span> : <span className="material-symbols-outlined text-lg">check</span>}
            {artistLoading ? '등록 중...' : '아티스트 등록'}
          </button>
        </div>
      )}

      {/* ═══ 앨범 추가 ═══ */}
      {activeTab === 'album' && (
        <div className="bg-surface-container rounded-3xl p-6 md:p-8 space-y-6 border border-outline-variant/10">
          <div className="flex items-center gap-3 pb-2 border-b border-outline-variant/10">
            <span className="material-symbols-outlined text-primary text-2xl">album</span>
            <h2 className="font-headline text-lg font-bold">새 앨범 등록</h2>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">아티스트 선택 *</label>
            <div className="relative">
              <select value={albumArtistId} onChange={e => setAlbumArtistId(Number(e.target.value))} className={selectClass}>
                <option value={0}>아티스트를 선택하세요</option>
                {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-lg">expand_more</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">앨범 제목 *</label>
            <input value={albumTitle} onChange={e => setAlbumTitle(e.target.value)} className={inputClass} placeholder="예: Synthetic Dreams" maxLength={300} />
          </div>

          <Dropzone label="앨범 커버 이미지" accept="image/jpeg,image/png,image/webp" icon="image" hint="JPG, PNG, WebP · 최대 10MB" file={albumCover} onFileSelect={setAlbumCover} />

          <button onClick={handleAlbumSubmit} disabled={albumLoading} className="btn-primary mt-4">
            {albumLoading ? <span className="animate-spin material-symbols-outlined text-lg">progress_activity</span> : <span className="material-symbols-outlined text-lg">check</span>}
            {albumLoading ? '등록 중...' : '앨범 등록'}
          </button>
        </div>
      )}

      {/* ═══ 음원 업로드 ═══ */}
      {activeTab === 'track' && (
        <div className="bg-surface-container rounded-3xl p-6 md:p-8 space-y-6 border border-outline-variant/10">
          <div className="flex items-center gap-3 pb-2 border-b border-outline-variant/10">
            <span className="material-symbols-outlined text-primary text-2xl">upload_file</span>
            <h2 className="font-headline text-lg font-bold">음원 업로드</h2>
          </div>

          {/* 아티스트 → 앨범 연쇄 선택 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">아티스트 *</label>
              <div className="relative">
                <select value={albumArtistId} onChange={e => { const v = Number(e.target.value); setAlbumArtistId(v); fetchAlbums(v); setTrackAlbumId(0); }} className={selectClass}>
                  <option value={0}>아티스트 선택</option>
                  {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-lg">expand_more</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">앨범 *</label>
              <div className="relative">
                <select value={trackAlbumId} onChange={e => setTrackAlbumId(Number(e.target.value))} className={selectClass} disabled={!albumArtistId}>
                  <option value={0}>앨범 선택</option>
                  {albums.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-lg">expand_more</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">곡 제목 *</label>
              <input value={trackTitle} onChange={e => setTrackTitle(e.target.value)} className={inputClass} placeholder="예: Midnight City" maxLength={300} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">트랙 번호</label>
              <input type="number" min="1" value={trackNumber} onChange={e => setTrackNumber(e.target.value)} className={inputClass} placeholder="1" />
            </div>
          </div>

          <Dropzone label="음원 파일 *" accept=".mp3,.flac,audio/mpeg,audio/flac" icon="audio_file" hint="MP3, FLAC · 최대 100MB" file={trackFile} onFileSelect={setTrackFile} />

          <button onClick={handleTrackSubmit} disabled={trackLoading} className="w-full py-4 bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-2xl font-bold text-base flex justify-center items-center gap-3 transition-all active:scale-[0.98] hover:shadow-[0_0_30px_rgba(177,255,206,0.25)] disabled:opacity-60 mt-4">
            {trackLoading ? <span className="animate-spin material-symbols-outlined text-xl">progress_activity</span> : <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>cloud_upload</span>}
            {trackLoading ? '업로드 중...' : '서버로 업로드'}
          </button>
        </div>
      )}

      {/* ═══ Spotify 동기화 ═══ */}
      {activeTab === 'spotify' && (
        <div className="bg-surface-container rounded-3xl p-6 md:p-8 space-y-6 border border-outline-variant/10">
          <div className="flex items-center gap-3 pb-2 border-b border-outline-variant/10">
            <span className="material-symbols-outlined text-[#1DB954] text-2xl">sync</span>
            <h2 className="font-headline text-lg font-bold">Spotify 대량 데이터 동기화</h2>
          </div>
          
          <div className="p-5 bg-surface-container-highest rounded-2xl border border-outline-variant/10 flex gap-4">
            <span className="material-symbols-outlined text-[#1DB954] text-3xl">info</span>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              입력한 키워드로 Spotify에서 50개의 트랙 정보를 가져옵니다. 
              가져온 정보는 <strong className="text-on-surface">Artist → Album → Track</strong> 순서로 우리 앱 데이터베이스에 자동 매핑되어 저장됩니다.<br/><br/>
              ※ 30초 미리듣기(Preview URL)가 존재하는 음원만 필터링하여 저장합니다.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">검색 키워드 *</label>
            <input 
              value={spotifyQuery} 
              onChange={e => setSpotifyQuery(e.target.value)} 
              className={inputClass} 
              placeholder="예: K-Pop, Synthwave, Jazz" 
              maxLength={100} 
            />
          </div>

          <button 
            onClick={handleSpotifySync} 
            disabled={spotifyLoading} 
            className="w-full py-4 bg-[#1DB954] text-black rounded-2xl font-bold text-base flex justify-center items-center gap-3 transition-all active:scale-[0.98] hover:brightness-110 disabled:opacity-60 mt-4 shadow-lg shadow-[#1DB954]/20"
          >
            {spotifyLoading ? <span className="animate-spin material-symbols-outlined text-xl">progress_activity</span> : <span className="material-symbols-outlined text-xl">cloud_download</span>}
            {spotifyLoading ? 'Spotify에서 동기화 진행 중...' : '데이터 동기화 시작 (최대 50곡)'}
          </button>
        </div>
      )}

      {/* ═══ 보안 감사 로그 ═══ */}
      {activeTab === 'security' && (
        <div className="bg-surface-container rounded-3xl p-6 md:p-8 space-y-6 border border-outline-variant/10">
          <div className="flex items-center gap-3 pb-2 border-b border-outline-variant/10">
            <span className="material-symbols-outlined text-amber-400 text-2xl">shield</span>
            <h2 className="font-headline text-lg font-bold">시스템 보안 감사 로그</h2>
          </div>

          {/* 안내 카드 */}
          <div className="p-5 bg-surface-container-highest rounded-2xl border border-outline-variant/10 space-y-3">
            <div className="flex gap-3">
              <span className="material-symbols-outlined text-amber-400 text-2xl mt-0.5">info</span>
              <div className="text-sm text-on-surface-variant leading-relaxed">
                <p className="font-bold text-on-surface mb-2">OWASP A09 — 보안 로깅 및 모니터링</p>
                <p>이 로그 파일에는 다음과 같은 보안 이벤트가 기록됩니다:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li><strong className="text-error">인증 실패</strong> — 잘못된 로그인 시도 (IP 포함)</li>
                  <li><strong className="text-amber-400">403 권한 거부</strong> — 비인가 자원 접근 시도</li>
                  <li><strong className="text-error">시스템 에러</strong> — 미처리 예외 (ErrorId 추적 가능)</li>
                  <li><strong className="text-primary">관리자 활동</strong> — 동기화, 로그 다운로드 등</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 로그 파일 정보 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-surface-container-highest rounded-2xl p-4 text-center">
              <span className="material-symbols-outlined text-primary text-3xl mb-2 block">folder_open</span>
              <p className="text-xs text-on-surface-variant uppercase tracking-widest font-bold">저장 위치</p>
              <p className="text-sm font-mono text-on-surface mt-1">Logs/</p>
            </div>
            <div className="bg-surface-container-highest rounded-2xl p-4 text-center">
              <span className="material-symbols-outlined text-primary text-3xl mb-2 block">calendar_today</span>
              <p className="text-xs text-on-surface-variant uppercase tracking-widest font-bold">롤링 주기</p>
              <p className="text-sm text-on-surface mt-1">일별 (Daily)</p>
            </div>
            <div className="bg-surface-container-highest rounded-2xl p-4 text-center">
              <span className="material-symbols-outlined text-primary text-3xl mb-2 block">timer</span>
              <p className="text-xs text-on-surface-variant uppercase tracking-widest font-bold">보관 기간</p>
              <p className="text-sm text-on-surface mt-1">90일</p>
            </div>
          </div>

          {/* 다운로드 버튼 */}
          <button
            onClick={handleLogDownload}
            disabled={logDownloading}
            className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-black rounded-2xl font-bold text-base flex justify-center items-center gap-3 transition-all active:scale-[0.98] hover:brightness-110 disabled:opacity-60 mt-4 shadow-lg shadow-amber-500/20"
          >
            {logDownloading
              ? <span className="animate-spin material-symbols-outlined text-xl">progress_activity</span>
              : <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>download</span>
            }
            {logDownloading ? '다운로드 중...' : '시스템 보안 로그 다운로드 (.txt)'}
          </button>

          {/* 보안 경고 */}
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-error/5 border border-error/15">
            <span className="material-symbols-outlined text-error text-lg mt-0.5">warning</span>
            <div className="text-xs text-on-surface-variant leading-relaxed">
              <strong className="text-error">주의:</strong> 보안 로그 파일에는 민감한 서버 정보가 포함되어 있습니다.
              다운로드한 파일은 안전한 환경에서만 열람하고, 외부에 공유하지 마세요.
              모든 다운로드 기록은 감사 로그에 남습니다.
            </div>
          </div>
        </div>
      )}

      {/* 하단 보안 안내 */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-surface-container-low border border-outline-variant/10">
        <span className="material-symbols-outlined text-on-surface-variant text-lg mt-0.5">shield</span>
        <div className="text-xs text-on-surface-variant leading-relaxed">
          <strong className="text-on-surface">보안 정책:</strong> 업로드된 파일은 MIME 타입 + 매직 바이트 이중 검증을 거치며,
          UUID로 난수화된 이름으로 <code className="text-primary/80 bg-primary/10 px-1 rounded">protected_media/</code> 폴더에 안전하게 저장됩니다.
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
