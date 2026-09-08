import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const inicioPorRol = (rol) =>
  rol === 'admin' || rol === 'directora' ? '/admin' : '/mi-comision'

// rolRequerido puede ser un string ('admin') o un arreglo de roles
// permitidos (['admin', 'directora']).
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

  const rolesPermitidos = Array.isArray(rolRequerido) ? rolRequerido : [rolRequerido]
  if (rolRequerido && !rolesPermitidos.includes(perfil.rol)) {
    return <Navigate to={inicioPorRol(perfil.rol)} replace />
  }

  return children
}
