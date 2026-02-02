
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // GitHub Pages 하위 경로 배포 시 리소스 로딩 문제를 해결합니다.
  build: {
    outDir: 'dist',
  }
});
