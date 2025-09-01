import { defineConfig } from 'vite';

export default async () => {
  const react = (await import('@vitejs/plugin-react')).default;
  return defineConfig({
    plugins: [react()],
    server: { port: 3000, proxy: { '/api': 'http://localhost:4000' } }
  });
};
