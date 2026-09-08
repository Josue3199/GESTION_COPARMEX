import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import AdminDashboard from './pages/AdminDashboard'
import ComisionDetail from './pages/ComisionDetail'
import AdminPresidentes from './pages/AdminPresidentes'
import PresidenteDashboard from './pages/PresidenteDashboard'
import MiAvance from './pages/MiAvance'
import PlanesPresidentes from './pages/PlanesPresidentes'
import VerPlanComision from './pages/VerPlanComision'

function Home() {
  const { perfil, cargando } = useAuth()
  if (cargando) return null
  if (!perfil) return <Navigate to="/login" replace />
  const esStaff = perfil.rol === 'admin' || perfil.rol === 'directora'
  return <Navigate to={esStaff ? '/admin' : '/mi-comision'} replace />
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
              <ProtectedRoute rolRequerido={['admin', 'directora']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/comision/:id"
            element={
              <ProtectedRoute rolRequerido={['admin', 'directora']}>
                <ComisionDetail />
              </ProtectedRoute>
            }
          />
          {/* Solo el admin (no la directora) puede activar accesos. */}
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
          <Route
            path="/mi-avance"
            element={
              <ProtectedRoute rolRequerido="presidente">
                <MiAvance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/comisiones"
            element={
              <ProtectedRoute rolRequerido="presidente">
                <PlanesPresidentes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/comisiones/:id"
            element={
              <ProtectedRoute rolRequerido="presidente">
                <VerPlanComision />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
