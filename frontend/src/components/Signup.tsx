import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { escapeHtml } from '../utils/sanitize';
import api from '../api/axiosInterceptor';

const Signup: React.FC = () => {
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    if (password !== confirmPassword) { setErrorMsg('비밀번호가 일치하지 않습니다.'); setIsLoading(false); return; }
    const pwRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!pwRegex.test(password)) {
      setErrorMsg('비밀번호는 영문 대소문자, 숫자, 특수문자를 모두 포함하여 8자 이상이어야 합니다.');
      setIsLoading(false);
      return;
    }
    const cleanEmail = escapeHtml(email);
    const cleanName = escapeHtml(name);
    const cleanNickname = escapeHtml(nickname);
    try {
      await api.post('/auth/register', { name: cleanName, nickname: cleanNickname, email: cleanEmail, password });
      setSuccessMsg('가입이 완료되었습니다! 로그인 페이지로 이동합니다.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || '가입에 실패했습니다.');
    } finally { setIsLoading(false); }
  };

  return (
    <div className="bg-background text-on-surface min-h-screen flex flex-col items-center justify-center selection:bg-primary selection:text-on-primary-fixed">
      {/* Header */}
      <header className="bg-background w-full top-0 fixed z-50">
        <div className="flex justify-between items-center px-6 py-4 w-full">
          <NavLink to="/login" className="text-on-surface-variant active:opacity-70 transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </NavLink>
          <h1 className="text-xl font-black text-primary uppercase tracking-widest font-headline">SECURITY MUSIC</h1>
          <div className="w-6" />
        </div>
      </header>

      <main className="w-full max-w-md px-6 py-24 flex flex-col gap-10">
        <div className="flex flex-col gap-2">
          <h2 className="text-4xl font-black font-headline tracking-tight">새로운 감각의 시작</h2>
          <p className="text-on-surface-variant text-sm leading-relaxed">나만의 소닉 갤러리를 만들어보세요. 최상의 음질과 큐레이션을 경험할 수 있습니다.</p>
        </div>

        {errorMsg && <div className="bg-error/10 border border-error/30 text-error p-3 rounded-xl text-sm text-center">{errorMsg}</div>}
        {successMsg && <div className="bg-primary/10 border border-primary/30 text-primary p-3 rounded-xl text-sm text-center">{successMsg}</div>}

        <form onSubmit={handleSignup} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold tracking-widest text-on-surface-variant uppercase px-1">이름</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동"
              className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-4 text-on-surface placeholder:text-outline focus:ring-1 focus:ring-primary/40 transition-all outline-none" />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold tracking-widest text-on-surface-variant uppercase px-1">닉네임</label>
            <input type="text" required value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="길동몬"
              className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-4 text-on-surface placeholder:text-outline focus:ring-1 focus:ring-primary/40 transition-all outline-none" />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold tracking-widest text-on-surface-variant uppercase px-1">이메일 주소</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="aura@example.com"
              className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-4 text-on-surface placeholder:text-outline focus:ring-1 focus:ring-primary/40 transition-all outline-none" />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold tracking-widest text-on-surface-variant uppercase px-1">비밀번호</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-4 pr-12 text-on-surface placeholder:text-outline focus:ring-1 focus:ring-primary/40 transition-all outline-none" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors">
                <span className="material-symbols-outlined">{showPw ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
            <p className="text-[10px] text-on-surface-variant mt-1 ml-1 font-medium">※ 영문 대소문자, 숫자, 특수문자 포함 8자 이상</p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold tracking-widest text-on-surface-variant uppercase px-1">비밀번호 확인</label>
            <div className="relative">
              <input type={showCpw ? 'text' : 'password'} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••"
                className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-4 pr-12 text-on-surface placeholder:text-outline focus:ring-1 focus:ring-primary/40 transition-all outline-none" />
              <button type="button" onClick={() => setShowCpw(!showCpw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors">
                <span className="material-symbols-outlined">{showCpw ? 'visibility' : 'visibility_off'}</span>
              </button>
            </div>
          </div>

          <button type="submit" disabled={isLoading}
            className="mt-4 w-full bg-gradient-to-r from-primary to-primary-container text-on-primary-fixed font-bold py-4 rounded-full text-lg active:scale-[0.98] transition-transform shadow-[0px_4px_20px_rgba(0,255,163,0.2)] disabled:opacity-60">
            {isLoading ? '가입 중...' : '회원가입'}
          </button>
        </form>

        {/* Social */}
        <div className="flex flex-col items-center gap-8">
          <div className="flex items-center gap-4 w-full">
            <div className="h-px flex-1 bg-surface-container-highest" />
            <span className="text-xs text-outline font-bold uppercase tracking-widest">OR CONTINUE WITH</span>
            <div className="h-px flex-1 bg-surface-container-highest" />
          </div>
          <div className="flex gap-4 w-full">
            <button className="flex-1 bg-surface-container flex items-center justify-center py-3 rounded-xl hover:bg-surface-container-high transition-colors">
              <img loading="lazy" alt="Google" className="w-5 h-5" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA7wlPjYpMwwG3YGSz95tnmLn6Qy8aQd1VShBZnaL4lqLru2DX9ZKIMmo1mzm9OGmnz79ghHKC4E0U7liLji9JrF4LVhSfsj6JkLRvG9ALiDAhq0Se8L2UDYDc-J563VA1j5SAOIftPe08aSbydhV3rBHYD8VaHDdx6hvAWjhWGGwcNv2s7901D8AiMG1cVWXFi8e6i1T-mGM7yMh2l0DxMctLkBpg4hZtm7ZbzRhPzOYLZvOqiLJZ6E-wwQe-WGReoVK38wXeq3rs" />
            </button>
            <button className="flex-1 bg-surface-container flex items-center justify-center py-3 rounded-xl hover:bg-surface-container-high transition-colors">
              <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>ios</span>
            </button>
          </div>
          <p className="text-on-surface-variant text-sm">
            이미 계정이 있으신가요?
            <NavLink to="/login" className="text-primary font-bold ml-2 hover:underline underline-offset-4">로그인</NavLink>
          </p>
        </div>
      </main>

      {/* Decorative Backgrounds */}
      <div className="fixed top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-primary-container/5 blur-[120px] -z-10" />
      <div className="fixed bottom-[-5%] left-[-5%] w-[400px] h-[400px] rounded-full bg-secondary-container/5 blur-[100px] -z-10" />
    </div>
  );
};

export default Signup;
