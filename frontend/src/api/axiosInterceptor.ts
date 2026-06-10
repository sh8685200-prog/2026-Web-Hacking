// frontend/src/api/axiosInterceptor.ts
import axios from 'axios';

const api = axios.create({
    baseURL: '/api', // [배포] 같은 도메인이므로 상대 경로 사용 (CORS 불필요)
    withCredentials: true,
});

let csrfTokenStr = '';

export const setCsrfToken = (token: string) => {
    csrfTokenStr = token;
};

api.interceptors.request.use(config => {
    if (csrfTokenStr) {
        config.headers['X-CSRF-TOKEN'] = csrfTokenStr;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        // 401 에러가 발생했고, 로그인/새로고침 요청이 아니며, 재시도 전일 때만 실행
        if (error.response?.status === 401 && 
            !originalRequest._retry && 
            !originalRequest.url?.includes('/auth/login') &&
            !originalRequest.url?.includes('/auth/refresh')) {
            
            originalRequest._retry = true;
            try {
                await axios.post('/api/auth/refresh', {}, {
                    withCredentials: true 
                });
                return api(originalRequest);
            } catch (refreshError) {
                console.error("Refresh token expired. Sending to login.");
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }
        
        return Promise.reject(error);
    }
);

export default api;

