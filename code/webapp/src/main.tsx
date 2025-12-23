import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Log environment configuration
console.log('🚀 SushiGo - Environment Configuration');
console.log('📍 API URL:', import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1');
console.log('🔧 Environment:', import.meta.env.MODE);
console.log('---');

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
