import React, { useState, useEffect } from 'react';
import { useParams, NavLink } from 'react-router-dom';
import { useMusicPlayer } from '../contexts/MusicPlayerContext';
import api from '../api/axiosInterceptor';

/* ── 타입 정의 ── */

interface BoardPost {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  authorId: number;
  authorName: string;
  commentCount: number;
  isOwner: boolean;
}

interface ArtistData {
  id: number;
  name: string;
  bio: string;
  profileImageUrl: string;
  albums: any[];
}

type TabKey = 'popular' | 'albums' | 'fantalk';

const ArtistDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabKey>('albums');
  const [artist, setArtist] = useState<ArtistData | null>(null);
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const { playAlbum, currentTrack, isPlaying } = useMusicPlayer();

  const getImageUrl = (url?: string) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return url;
  };

  // 인기 곡 추출 (모든 앨범 트랙 중 상위 5개)
  const popularTracks = artist?.albums?.flatMap(al => al.tracks.map((t: any) => ({ ...t, albumCover: al.coverImageUrl, albumTitle: al.title }))).slice(0, 5) || [];

  // 팬톡 글쓰기 관련
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 수정/삭제 관련
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  // 현재 로그인 유저 Role 확인 (sessionStorage에서 읽기)
  const isAdmin = sessionStorage.getItem('role') === 'Admin';

  useEffect(() => {
    if (!id) return;
    
    const fetchArtistData = async () => {
      try {
        const res = await api.get(`/music/artists/${id}`);
        setArtist(res.data);
        
        // 팬톡 게시글 가져오기
        const boardRes = await api.get(`/board/artist/${id}`);
        setPosts(boardRes.data.posts || boardRes.data.Posts || boardRes.data || []);
      } catch (err: any) {
        console.error(err);
        setErrorMsg(err.response?.data?.message || '아티스트 정보를 가져올 수 없습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchArtistData();
  }, [id]);

  // 목록 새로고침 헬퍼
  const refreshPosts = async () => {
    try {
      const res = await api.get(`/board/artist/${id}`);
      setPosts(res.data.posts || res.data.Posts || res.data || []);
    } catch (err) {
      console.error('게시글 새로고침 실패:', err);
    }
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    
    setIsSubmitting(true);
    try {
      await api.post('/board', { artistId: parseInt(id!), title: newTitle, content: newContent });
      setNewTitle('');
      setNewContent('');
      await refreshPosts();
    } catch (err) {
      alert('글 작성에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── 수정 시작
  const handleEditStart = (post: BoardPost) => {
    setEditingPostId(post.id);
    setEditTitle(post.title);
    setEditContent(post.content);
  };

  // ── 수정 취소
  const handleEditCancel = () => {
    setEditingPostId(null);
    setEditTitle('');
    setEditContent('');
  };

  // ── 수정 저장
  const handleEditSave = async (postId: number) => {
    if (!editTitle.trim() || !editContent.trim()) {
      alert('제목과 내용을 모두 입력해주세요.');
      return;
    }
    setIsUpdating(true);
    try {
      await api.put(`/board/${postId}`, { title: editTitle, content: editContent });
      setEditingPostId(null);
      setEditTitle('');
      setEditContent('');
      await refreshPosts();
    } catch (err: any) {
      alert(err.response?.data?.message || '수정에 실패했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  // ── 삭제
  const handleDelete = async (postId: number) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    setIsDeleting(postId);
    try {
      await api.delete(`/board/${postId}`);
      await refreshPosts();
    } catch (err: any) {
      alert(err.response?.data?.message || '삭제에 실패했습니다.');
    } finally {
      setIsDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (errorMsg || !artist) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-error">
        <span className="material-symbols-outlined text-6xl mb-4">error</span>
        <h2 className="text-xl font-bold">{errorMsg || '아티스트를 찾을 수 없습니다.'}</h2>
        <NavLink to="/" className="mt-4 text-primary hover:underline">홈으로 돌아가기</NavLink>
      </div>
    );
  }

  return (
    <div className="space-y-8 -mx-8 -mt-20 pb-20">
      {/* ── Hero Header ── */}
      <div className="relative h-[400px] flex items-end px-8 pb-8">
        <div className="absolute inset-0">
          <img 
            src={getImageUrl(artist.profileImageUrl) || 'https://images.unsplash.com/photo-1514525253361-bee8718a340b?auto=format&fit=crop&q=80&w=1200'} 
            className="w-full h-full object-cover"
            alt={artist.name}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        </div>
        
        <div className="relative z-10 flex items-center gap-8 w-full">
          <div className="w-48 h-48 rounded-full overflow-hidden shadow-2xl border-4 border-white/10 shrink-0">
            <img src={getImageUrl(artist.profileImageUrl) || 'https://via.placeholder.com/200'} className="w-full h-full object-cover" alt="" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest mb-2">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
              Verified Artist
            </div>
            <h1 className="font-headline text-7xl font-black mb-4">{artist.name}</h1>
            <p className="text-on-surface-variant max-w-2xl line-clamp-2">{artist.bio || '아티스트 소개가 없습니다.'}</p>
          </div>
        </div>
      </div>

      {/* ── Action Bar ── */}
      <div className="px-8 flex items-center gap-6">
        <button className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-on-primary shadow-lg hover:scale-105 active:scale-95 transition-all">
          <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
        </button>
        <button className="px-6 py-2 border border-outline rounded-full font-bold hover:bg-surface-container transition-colors">
          팔로우
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="px-8 flex gap-8 border-b border-outline-variant/20">
        <button 
          onClick={() => setActiveTab('albums')}
          className={`pb-4 font-bold text-sm transition-all relative ${activeTab === 'albums' ? 'text-primary' : 'text-on-surface-variant hover:text-white'}`}
        >
          인기 및 앨범
          {activeTab === 'albums' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />}
        </button>
        <button 
          onClick={() => setActiveTab('fantalk')}
          className={`pb-4 font-bold text-sm transition-all relative ${activeTab === 'fantalk' ? 'text-primary' : 'text-on-surface-variant hover:text-white'}`}
        >
          팬톡 게시판
          {activeTab === 'fantalk' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />}
        </button>
      </div>

      {/* ── Tab Content ── */}
      <div className="px-8 space-y-10">
        {activeTab === 'albums' && (
          <>
            {/* 인기 곡 */}
            {popularTracks.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-xl font-bold">인기</h2>
                <div className="space-y-1">
                  {popularTracks.map((track: any, idx: number) => {
                    const isCurrent = currentTrack?.id === track.id;
                    const isCurrentPlaying = isCurrent && isPlaying;
                    return (
                    <div 
                      key={track.id} 
                      className={`flex items-center gap-4 p-2 rounded-xl transition-all group cursor-pointer ${isCurrent ? 'bg-primary/10' : 'hover:bg-surface-container'}`}
                      onClick={() => {
                        const allPopular = popularTracks.map((t: any) => ({
                          id: t.id,
                          title: t.title,
                          artistName: artist.name,
                          albumTitle: t.albumTitle,
                          coverImageUrl: t.albumCover,
                          duration: t.duration
                        }));
                        playAlbum(allPopular, idx);
                      }}
                    >
                      <div className="w-6 text-center">
                        {isCurrentPlaying ? (
                          <span className="material-symbols-outlined text-primary text-sm animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>equalizer</span>
                        ) : isCurrent ? (
                          <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>pause</span>
                        ) : (
                          <>
                            <span className="group-hover:hidden text-on-surface-variant">{idx + 1}</span>
                            <span className="hidden group-hover:block text-primary material-symbols-outlined text-sm">play_arrow</span>
                          </>
                        )}
                      </div>
                      <img src={getImageUrl(track.albumCover) || ''} className="w-10 h-10 rounded-lg object-cover" alt="" />
                      <div className="flex-1">
                        <p className={`font-bold text-sm truncate ${isCurrent ? 'text-primary' : ''}`}>{track.title}</p>
                      </div>
                      <span className="text-xs text-on-surface-variant">
                        {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 앨범 */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold">앨범</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
                {artist.albums.map(album => (
                  <NavLink key={album.id} to={`/album/${album.id}`} className="group space-y-3">
                    <div className="aspect-square rounded-2xl overflow-hidden shadow-xl">
                      <img src={getImageUrl(album.coverImageUrl) || 'https://via.placeholder.com/300'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={album.title} />
                    </div>
                    <p className="font-bold truncate group-hover:text-primary">{album.title}</p>
                    <p className="text-xs text-on-surface-variant">{new Date(album.releaseDate).getFullYear()}</p>
                  </NavLink>
                ))}
              </div>
            </section>
          </>
        )}

        {activeTab === 'fantalk' && (
          <div className="space-y-8 max-w-4xl">
            {/* 글쓰기 폼 */}
            <form onSubmit={handlePostSubmit} className="bg-surface-container rounded-3xl p-6 space-y-4 border border-outline-variant/10">
              <h3 className="font-bold text-lg">팬톡 남기기</h3>
              <input 
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="제목을 입력하세요"
                className="w-full bg-surface-container-highest border-none rounded-xl py-3 px-4 outline-none focus:ring-1 focus:ring-primary transition-all"
              />
              <textarea 
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                placeholder={`${artist.name} 아티스트에게 응원의 한마디를 남겨보세요!`}
                className="w-full bg-surface-container-highest border-none rounded-xl py-4 px-4 h-32 outline-none focus:ring-1 focus:ring-primary transition-all resize-none"
              />
              <div className="flex justify-end">
                <button 
                  type="submit"
                  disabled={isSubmitting || !newTitle.trim() || !newContent.trim()}
                  className="px-8 py-2.5 bg-primary text-on-primary rounded-full font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  게시하기
                </button>
              </div>
            </form>

            {/* 게시글 목록 */}
            <div className="space-y-4">
              {posts.map(post => (
                <div key={post.id} className="p-6 bg-surface-container-low rounded-3xl border border-outline-variant/10 hover:bg-surface-container transition-all">
                  {/* ── 헤더: 작성자 + 수정/삭제 버튼 ── */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center font-bold text-primary">
                        {post.authorName?.[0] || '?'}
                      </div>
                      <div>
                        <p className="font-bold text-sm">{post.authorName}</p>
                        <p className="text-xs text-on-surface-variant">
                          {new Date(post.createdAt).toLocaleDateString()}
                          {post.updatedAt && <span className="ml-1 text-primary/60">(수정됨)</span>}
                        </p>
                      </div>
                    </div>
                    {/* 본인 또는 관리자만 수정/삭제 버튼 표시 */}
                    {(post.isOwner || isAdmin) && editingPostId !== post.id && (
                      <div className="flex items-center gap-2">
                        {post.isOwner && (
                          <button
                            onClick={() => handleEditStart(post)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-on-surface-variant hover:text-primary hover:bg-surface-container-highest rounded-lg transition-all"
                            title="수정"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span>
                            수정
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(post.id)}
                          disabled={isDeleting === post.id}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-all disabled:opacity-50"
                          title="삭제"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                          {isDeleting === post.id ? '삭제 중...' : '삭제'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* ── 수정 모드 ── */}
                  {editingPostId === post.id ? (
                    <div className="space-y-3">
                      <input
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        className="w-full bg-surface-container-highest border-none rounded-xl py-3 px-4 outline-none focus:ring-1 focus:ring-primary transition-all font-bold"
                        placeholder="제목"
                      />
                      <textarea
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                        className="w-full bg-surface-container-highest border-none rounded-xl py-3 px-4 h-32 outline-none focus:ring-1 focus:ring-primary transition-all resize-none"
                        placeholder="내용"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={handleEditCancel}
                          className="px-5 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container-highest rounded-full transition-all"
                        >
                          취소
                        </button>
                        <button
                          onClick={() => handleEditSave(post.id)}
                          disabled={isUpdating}
                          className="px-6 py-2 bg-primary text-on-primary rounded-full font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-all"
                        >
                          {isUpdating ? '저장 중...' : '저장'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ── 일반 보기 모드 ── */
                    <>
                      <h4 className="text-lg font-bold mb-2">{post.title}</h4>
                      <p className="text-on-surface-variant text-sm whitespace-pre-wrap">{post.content}</p>
                      <div className="mt-4 flex items-center gap-4 text-xs font-bold text-on-surface-variant">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">chat_bubble</span>
                          {post.commentCount} 댓글
                        </span>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {posts.length === 0 && (
                <div className="text-center py-10 text-on-surface-variant">
                  <p>첫 번째 팬톡을 남겨보세요!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtistDetail;
