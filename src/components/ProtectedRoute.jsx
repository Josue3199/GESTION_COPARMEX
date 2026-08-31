import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, rolRequerido }) {
  const { user, perfil, cargando } = useAuth()

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Cargando…
      </div>
    )
  }

  if (!user || !perfil) return <Navigate to="/login" replace />

  if (rolRequerido && perfil.rol !== rolRequerido) {
    return <Navigate to={perfil.rol === 'admin' ? '/admin' : '/mi-comision'} replace />
  }

  return children
}
