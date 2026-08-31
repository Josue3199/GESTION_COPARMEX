import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import AdminDashboard from './pages/AdminDashboard'
import ComisionDetail from './pages/ComisionDetail'
import AdminPresidentes from './pages/AdminPresidentes'
import PresidenteDashboard from './pages/PresidenteDashboard'

function Home() {
  const { perfil, cargando } = useAuth()
  if (cargando) return null
  if (!perfil) return <Navigate to="/login" replace />
  return <Navigate to={perfil.rol === 'admin' ? '/admin' : '/mi-comision'} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Home />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute rolRequerido="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/comision/:id"
            element={
              <ProtectedRoute rolRequerido="admin">
                <ComisionDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/presidentes"
            element={
              <ProtectedRoute rolRequerido="admin">
                <AdminPresidentes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mi-comision"
            element={
              <ProtectedRoute rolRequerido="presidente">
                <PresidenteDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
