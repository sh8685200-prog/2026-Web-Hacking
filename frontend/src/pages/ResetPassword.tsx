import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, NavLink } from 'react-router-dom';
import api from '../api/axiosInterceptor';

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const emailParam = searchParams.get('email');
  const tokenParam = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!emailParam || !tokenParam) {
      setStatus('error');
      setMessage('유효하지 않은 재설정 링크입니다.');
    }
  }, [emailParam, tokenParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'error' && !emailParam) return;
    
    if (password !== confirmPassword) {
      setStatus('error');
      setMessage('비밀번호가 일치하지 않습니다.');
      return;
    }

    const pwRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!pwRegex.test(password)) {
      setStatus('error');
      setMessage('비밀번호는 영문 대소문자, 숫자, 특수문자를 모두 포함하여 8자 이상이어야 합니다.');
      return;
    }

    setStatus('loading');
    try {
      await api.post('/auth/reset-password', {
        email: emailParam,
        token: tokenParam,
        newPassword: password
      });
      
      setStatus('success');
      setMessage('비밀번호가 성공적으로 변경되었습니다. 잠시 후 로그인 페이지로 이동합니다.');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setStatus('error');
      setMessage(err.response?.data?.message || '비밀번호 재설정에 실패했습니다. 링크가 만료되었을 수 있습니다.');
    }
  };

  return (
    <div className="bg-background text-on-surface flex flex-col min-h-screen">
      <header className="w-full flex justify-between items-center px-6 py-4 bg-background z-50">
        <NavLink to="/login" className="text-xl font-headline font-black text-primary uppercase tracking-widest hover:opacity-80 transition-opacity">
          SECURITY MUSIC
        </NavLink>
      </header>

      <main className="flex-grow flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-secondary/10 blur-[120px] rounded-full" />
          <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-primary/5 blur-[120px] rounded-full" />
        </div>

        <section className="w-full max-w-[440px] z-10">
          <div className="bg-surface-container rounded-[2rem] p-8 md:p-12 shadow-[0px_20px_40px_rgba(0,0,0,0.4)] relative border border-outline-variant/10">
            <div className="mb-10 text-center">
              <h1 className="font-headline font-bold text-3xl tracking-tight mb-2">새 비밀번호 설정</h1>
              <p className="text-on-surface-variant text-sm">새로운 비밀번호를 입력해주세요.</p>
            </div>

            {status === 'success' ? (
              <div className="bg-primary/10 border border-primary/30 text-primary p-4 rounded-xl text-center flex flex-col items-center gap-4">
                <span className="material-symbols-outlined text-4xl">check_circle</span>
                <p className="font-bold">{message}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {(status === 'error' && message) && (
                  <div className="bg-error/10 border border-error/30 text-error p-3 rounded-xl text-sm text-center">
                    {message}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-on-surface-variant ml-1 font-bold">새 비밀번호</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-4 pr-12 text-on-surface placeholder:text-outline focus:ring-1 focus:ring-primary/40 transition-all outline-none"
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface">
                      <span className="material-symbols-outlined">{showPw ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-on-surface-variant mt-1 ml-1 font-medium">※ 영문 대소문자, 숫자, 특수문자 포함 8자 이상</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-on-surface-variant ml-1 font-bold">새 비밀번호 확인</label>
                  <div className="relative">
                    <input
                      type={showCpw ? 'text' : 'password'} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-4 pr-12 text-on-surface placeholder:text-outline focus:ring-1 focus:ring-primary/40 transition-all outline-none"
                    />
                    <button type="button" onClick={() => setShowCpw(!showCpw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface">
                      <span className="material-symbols-outlined">{showCpw ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>

                <div className="pt-4">
                  <button type="submit" disabled={status === 'loading' || !emailParam || !tokenParam}
                    className="w-full py-4 rounded-full text-on-primary-fixed font-headline font-bold text-lg hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-primary-container disabled:opacity-60"
                  >
                    {status === 'loading' ? '변경 중...' : '비밀번호 변경'}
                  </button>
                </div>
              </form>
            )}
            
            <div className="mt-8 text-center text-sm text-on-surface-variant">
              <NavLink to="/login" className="hover:text-primary transition-colors flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                로그인 화면으로 돌아가기
              </NavLink>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ResetPassword;
