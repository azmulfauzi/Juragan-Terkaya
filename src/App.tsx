import { Navigate, Route, Routes } from 'react-router-dom'
import { supabaseSiap } from './lib/supabase'
import SetupBanner from './components/SetupBanner'
import Home from './pages/Home'
import Peserta from './pages/Peserta'
import Fasilitator from './pages/Fasilitator'

export default function App() {
  if (!supabaseSiap) return <SetupBanner />

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/peserta" element={<Peserta />} />
      <Route path="/fasilitator" element={<Fasilitator />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
