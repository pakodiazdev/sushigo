import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Expone el servidor a todas las interfaces de red
    port: parseInt(process.env.VITE_PORT) || 5173,
    strictPort: true,
    watch: {
      usePolling: true, // Necesario para que funcione el watch en algunos sistemas de archivos compartidos
    },
    hmr: {
      clientPort: parseInt(process.env.VITE_PORT) || 5173, // Puerto para el cliente HMR (mismo que el servidor)
      host: 'localhost', // Cambia esto si accedes desde una URL diferente
    },
  },
})
