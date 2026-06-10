import React, { useState } from 'react';
import api from '../api/axiosInterceptor';
import { escapeHtml } from '../utils/sanitize';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    setMessage('');
    
    const cleanEmail = escapeHtml(email);
    try {
      const res = await api.post('/auth/forgot-password', { email: cleanEmail });
      setStatus('success');
      setMessage(res.data.message || '등록된 이메일로 비밀번호 재설정 링크가 발송되었습니다.');
    } catch (err: any) {
      setStatus('error');
      setMessage(err.response?.data?.message || '메일 발송에 실패했습니다. 다시 시도해주세요.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface-container w-full max-w-md rounded-2xl p-8 shadow-2xl border border-outline-variant/10 relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <h2 className="text-2xl font-headline font-bold mb-2">비밀번호 찾기</h2>
        <p className="text-on-surface-variant text-sm mb-6">
          가입한 이메일 주소를 입력하시면<br/>비밀번호 재설정 링크를 보내드립니다.
        </p>

        {status === 'success' ? (
          <div className="flex flex-col items-center py-6">
            <span className="material-symbols-outlined text-primary text-6xl mb-4">mark_email_read</span>
            <p className="text-center text-on-surface text-sm">{message}</p>
            <button 
              onClick={onClose}
              className="mt-8 w-full py-3 rounded-xl bg-surface-container-high text-on-surface hover:bg-surface-bright transition-colors font-bold"
            >
              닫기
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {status === 'error' && (
              <div className="bg-error/10 border border-error/30 text-error p-3 rounded-xl text-sm">
                {message}
              </div>
            )}
            
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-widest text-on-surface-variant ml-1 font-bold">이메일</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="security@music.com"
                className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-4 text-on-surface placeholder:text-outline focus:ring-1 focus:ring-primary/40 transition-all outline-none"
              />
            </div>

            <button 
              type="submit" 
              disabled={status === 'loading'}
              className="mt-2 w-full py-4 rounded-xl text-on-primary-fixed font-bold text-base hover:opacity-90 active:scale-[0.98] transition-all bg-primary disabled:opacity-60"
            >
              {status === 'loading' ? '전송 중...' : '재설정 링크 보내기'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
