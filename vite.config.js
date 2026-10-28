import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Separa Firebase y React del código propio para que el bundle
        // principal no pase de 500 kB y se cachee mejor entre despliegues.
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})
