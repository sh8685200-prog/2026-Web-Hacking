import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { escapeHtml } from '../utils/sanitize';
import api from '../api/axiosInterceptor';
import ForgotPasswordModal from './ForgotPasswordModal';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    const cleanEmail = escapeHtml(email);
    try {
      const response = await api.post('/auth/login', { email: cleanEmail, password });
      sessionStorage.setItem('isLoggedIn', 'true');
      sessionStorage.setItem('nickname', response.data.nickname);
      sessionStorage.setItem('role', response.data.role || 'User');
      window.dispatchEvent(new Event('authChange'));

      // Admin 계정이면 관리자 대시보드로 이동
      if (response.data.role === 'Admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err: any) {

      setErrorMsg(err.response?.data?.message || '로그인에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-background text-on-surface flex flex-col min-h-screen">
      {/* Header */}
      <header className="w-full flex justify-between items-center px-6 py-4 bg-background z-50">
        <div className="text-xl font-headline font-black text-primary uppercase tracking-widest">
          SECURITY MUSIC
        </div>
        <span className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors cursor-pointer">help_outline</span>
      </header>

      <main className="flex-grow flex items-center justify-center px-4 relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-secondary/10 blur-[120px] rounded-full" />
          <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-primary/5 blur-[120px] rounded-full" />
        </div>

        {/* Card */}
        <section className="w-full max-w-[440px] z-10">
          <div className="bg-surface-container rounded-[2rem] p-8 md:p-12 shadow-[0px_20px_40px_rgba(0,0,0,0.4)] relative border border-outline-variant/10">
            <div className="mb-10 text-center">
              <h1 className="font-headline font-bold text-3xl tracking-tight mb-2">다시 만나서 반가워요</h1>
              <p className="text-on-surface-variant text-sm">당신만의 소닉 갤러리가 기다리고 있습니다.</p>
            </div>

            {errorMsg && (
              <div className="bg-error/10 border border-error/30 text-error p-3 rounded-xl mb-6 text-sm text-center">{errorMsg}</div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-on-surface-variant ml-1 font-bold">이메일 또는 아이디</label>
                <input
                  type="text" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="security@music.com 또는 아이디"
                  className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-4 text-on-surface placeholder:text-outline focus:ring-1 focus:ring-primary/40 transition-all outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-on-surface-variant ml-1 font-bold">비밀번호</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-4 pr-12 text-on-surface placeholder:text-outline focus:ring-1 focus:ring-primary/40 transition-all outline-none"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface">
                    <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              <div className="pt-4">
                <button type="submit" disabled={isLoading}
                  className="w-full py-4 rounded-full text-on-primary-fixed font-headline font-bold text-lg hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-primary-container disabled:opacity-60"
                >
                  {isLoading ? '로그인 중...' : '로그인'}
                </button>
              </div>
            </form>

            {/* Forgot Password & Signup Link */}
            <div className="mt-8 flex flex-col items-center gap-6">
              <span 
                onClick={() => setIsModalOpen(true)}
                className="text-sm text-on-surface-variant hover:text-primary cursor-pointer transition-colors hover:underline underline-offset-4"
              >
                비밀번호를 잊으셨나요?
              </span>
              <p className="text-sm text-on-surface-variant">
                아직 회원이 아니신가요?
                <NavLink to="/signup" className="text-primary font-bold ml-1 hover:underline underline-offset-4">회원가입</NavLink>
              </p>
            </div>
          </div>
        </section>
      </main>

      <ForgotPasswordModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* Decorative Images */}
      <div className="hidden md:block fixed bottom-8 right-8 z-0 opacity-20 pointer-events-none">
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-2xl rotate-3">
            <img loading="lazy" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDrmkGW4abgjIF8YEyic1Wm9pkK9M2R1faUi2FaS2up94lwE9dxTDUKl_-3vSBtWTQ4BvOaSCpyqdb8tBYuVQUFW3aFnR78G-gk0k47RbK1t7zQRzPGheZB-o5538JbJCtWIkFYMONsNwsbP5PQGS2p86R0CXXRp4mykibueQ1XS7_jXqLNXq6kmYpiCCrJqn2rA7sovN4vpyXFn6pr-8V_zosT4BLjIY9Tw1Q75xpa1BKwa4-htaBsQyJSI38BrCpyYlf9LEV776s" alt="" />
          </div>
          <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-2xl -rotate-6 translate-y-4">
            <img loading="lazy" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBAeXutEkWaqoZ9fpwXjJwyBi8Z0cWr-Ar64rkLVfPuHcvitmgqLmtWxtovRUhvGGlFNsVfmNIATVV1fpchURX9fBIH9AGQJ1eFi5RFvx3tebzTuCjjbJ4S0y6i7evnp9hhD0SUrUf3eZAqu9dTvQ-Z7UZN8x0NMEB-hgkzKi0SYWtc3GyvJ032hfAMoL8CnlXvtl1beZErUShYVfdoog2PiiiG9DmwUrUY_UaNGdUzpQXagcmazNPeunBrtEYPiSiX1mzqGobGWqk" alt="" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
