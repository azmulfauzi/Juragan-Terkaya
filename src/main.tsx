import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { sinkronkanWaktu } from './lib/waktu'
import { supabaseSiap } from './lib/supabase'

// Samakan jam perangkat dengan jam server sebelum timer mulai dipakai.
if (supabaseSiap) void sinkronkanWaktu()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
