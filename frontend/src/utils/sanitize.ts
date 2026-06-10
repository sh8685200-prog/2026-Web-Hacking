import DOMPurify from 'dompurify';

/**
 * OWASP A03: Injection (XSS 방어)
 * 클라이언트 측에서 렌더링하기 전, 사용자 입력 HTML에 대해 XSS 태그 및 
 * 위험한 속성을 완벽하게 세척(Santize)합니다.
 */
export const sanitizeHtml = (dirtyHtml: string): string => {
    return DOMPurify.sanitize(dirtyHtml, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'], // 안전한 태그만 렌더링
        ALLOWED_ATTR: ['href'] // XSS를 유발할 수 있는 onClick 등 속성 삭제
    });
};

/**
 * 일반적인 String 입력에 대한 스크립트 특수문자 이스케이프
 */
export const escapeHtml = (unsafeString: string): string => {
    return unsafeString
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
};
