import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';

const Settings: React.FC = () => {
  const [nickname, setNickname] = useState(sessionStorage.getItem('nickname') || '사용자');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // await api.put('/user/profile', { nickname });
      sessionStorage.setItem('nickname', nickname); // sessionStorage 업데이트
      window.dispatchEvent(new Event('authChange')); // TopBar 등에 알림
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      console.error('프로필 저장 실패');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('nickname');
    window.dispatchEvent(new Event('authChange'));
    document.cookie = 'accessToken=; Max-Age=0; path=/';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <NavLink to="/" className="text-on-surface-variant hover:text-white transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </NavLink>
        <h1 className="font-headline text-2xl font-bold tracking-tight">계정 설정</h1>
      </div>

      {/* Profile Section */}
      <section className="flex flex-col md:flex-row items-center gap-10">
        {/* Profile Picture */}
        <div className="relative group cursor-pointer active:scale-95 transition-transform duration-200">
          <div className="w-48 h-48 rounded-full overflow-hidden ring-4 ring-surface-container-low shadow-2xl">
            <img loading="lazy" alt="프로필 사진" className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuC5U8y43OKNxGP8sz8TCir6NUkxif0Bmi6HuUEdQc9BQN0q4K7G94Cl2yYssWihyXutXKbV2Km61H18DbAh2fye-ie1YR1crmhvOSpP4d_AMTlhZxV6x_InnVMHsKAr43HjS-m692ahERJxOuAA4q2ZeMotGvrX1jvCDbaCoeETR98AMmGa2xwAaCua3P49A56jSJnbm45uzHwh1qwy9-vy4PHtiDfPqSFHTul3HdHAValFr0yI6PAOxdHw5UIYBRtOmtfXYZcBfL0"
            />
          </div>
          <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[2px]">
            <span className="material-symbols-outlined text-white text-4xl">photo_camera</span>
          </div>
        </div>

        {/* Profile Info */}
        <div className="flex-1 w-full space-y-6">
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-2 ml-1">닉네임</label>
            <input
              type="text" value={nickname} onChange={(e) => setNickname(e.target.value)}
              className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-4 text-on-surface focus:ring-2 focus:ring-primary/40 transition-all outline-none text-lg"
            />
          </div>
          {saved && <p className="text-primary text-sm ml-1">✓ 프로필이 저장되었습니다.</p>}
          <button
            onClick={handleSave} disabled={isSaving}
            className="w-full md:w-auto px-10 py-4 rounded-full bg-gradient-to-r from-primary to-primary-container text-on-primary-fixed font-bold hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/10 disabled:opacity-60"
          >
            {isSaving ? '변경 중...' : '변경하기'}
          </button>
        </div>
      </section>

      {/* Subscription Plan */}
      <section className="space-y-6">
        <h2 className="font-headline text-2xl font-bold tracking-tight">내 플랜</h2>
        <div className="bg-surface-container-low rounded-[2rem] p-8 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-secondary/10 rounded-full blur-[80px]" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold tracking-widest uppercase">Premium Subscriber</span>
              <h3 className="text-3xl font-headline font-extrabold">Standard Premium</h3>
              <p className="text-on-surface-variant text-sm max-w-xs">고음질 스트리밍과 오프라인 감상을 무제한으로 즐기고 계십니다.</p>
            </div>
            <button className="bg-surface-variant/80 backdrop-blur-md px-8 py-4 rounded-full text-on-surface font-semibold hover:bg-surface-container-high transition-colors active:scale-95 outline outline-1 outline-outline-variant/15">
              구독 및 결제 관리
            </button>
          </div>
        </div>
      </section>

      {/* Security Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface-container rounded-3xl p-6 hover:bg-surface-container-high transition-colors cursor-pointer group">
          <div className="flex items-center justify-between mb-4">
            <span className="material-symbols-outlined text-primary text-3xl">security</span>
            <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">chevron_right</span>
          </div>
          <h4 className="font-bold text-lg">보안 설정</h4>
          <p className="text-on-surface-variant text-sm mt-1">비밀번호 변경 및 2단계 인증</p>
        </div>
        <div className="bg-surface-container rounded-3xl p-6 hover:bg-surface-container-high transition-colors cursor-pointer group">
          <div className="flex items-center justify-between mb-4">
            <span className="material-symbols-outlined text-tertiary text-3xl">notifications</span>
            <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">chevron_right</span>
          </div>
          <h4 className="font-bold text-lg">알림 설정</h4>
          <p className="text-on-surface-variant text-sm mt-1">푸시 알림 및 이메일 수신 동의</p>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="pt-8 border-t border-outline-variant/10 flex flex-col items-center space-y-6">
        <NavLink
          to="/login"
          onClick={handleLogout}
          className="flex items-center gap-2 text-on-surface-variant font-semibold hover:text-white transition-colors py-2 px-4 rounded-full hover:bg-surface-container-highest active:scale-95"
        >
          <span className="material-symbols-outlined">logout</span>
          로그아웃
        </NavLink>
        <span className="text-error/60 text-sm font-medium hover:text-error transition-colors cursor-pointer hover:underline underline-offset-4">
          계정 탈퇴하기
        </span>
      </section>
    </div>
  );
};

export default Settings;
