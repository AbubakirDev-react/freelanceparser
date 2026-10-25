import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  // .env общий с cron-скриптом и лежит в корне. В браузер попадают только VITE_* переменные:
  // URL и publishable-ключ. Secret-ключ без префикса VITE_ Vite не тронет.
  envDir: '..',
})
