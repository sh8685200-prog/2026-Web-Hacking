import React, { useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../api/axiosInterceptor';

/**
 * [A01] 관리자 전용 라우트 가드.
 * sessionStorage의 role이 'Admin'이 아니면 홈 페이지로 리다이렉트합니다.
 * 
 * [A09] 비관리자의 /admin 접근 시도를 백엔드 보안 로그에 기록합니다.
 * 프론트엔드 가드이므로 UX 보호 역할이며, 실제 보안은 백엔드의
 * [Authorize(Roles = "Admin")] 어트리뷰트가 담당합니다.
 */
const AdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const role = sessionStorage.getItem('role');
  const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
  const isUnauthorized = !isLoggedIn || role !== 'Admin';

  // 비관리자 접근 시도 시, 백엔드로 감사 로그 요청을 1회만 발송
  const loggedRef = useRef(false);
  useEffect(() => {
    if (isUnauthorized && !loggedRef.current) {
      loggedRef.current = true;
      // 관리자 전용 API에 접근 시도 → 백엔드에서 401/403을 반환하며 보안 로그에 자동 기록됨
      api.get('/admin/logs/download').catch(() => {
        // 의도적: 로깅 목적으로만 호출, 응답은 무시
      });
    }
  }, [isUnauthorized]);

  if (isUnauthorized) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default AdminGuard;
