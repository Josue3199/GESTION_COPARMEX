import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ROLES_VALIDOS = ['admin', 'directora', 'presidente']

const inicioPorRol = (rol) =>
  rol === 'admin' || rol === 'directora' ? '/admin' : '/mi-comision'

// rolRequerido puede ser un string ('admin') o un arreglo de roles
// permitidos (['admin', 'directora']).
export default function ProtectedRoute({ children, rolRequerido }) {
  const { user, perfil, cargando, logout } = useAuth()

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Cargando…
      </div>
    )
  }

  if (!user || !perfil) return <Navigate to="/login" replace />

  // Un perfil con rol desconocido o mal escrito (p. ej. "Admin") provocaba un
  // ciclo infinito de redirecciones; ahora se muestra un aviso.
  if (!ROLES_VALIDOS.includes(perfil.rol)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4 text-center text-slate-600">
        <p>
          Tu cuenta tiene un rol no válido ({String(perfil.rol)}). Pide al administrador que lo
          corrija.
        </p>
        <button
          onClick={logout}
          className="px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
        >
          Salir
        </button>
      </div>
    )
  }

  const rolesPermitidos = Array.isArray(rolRequerido) ? rolRequerido : [rolRequerido]
  if (rolRequerido && !rolesPermitidos.includes(perfil.rol)) {
    return <Navigate to={inicioPorRol(perfil.rol)} replace />
  }

  return children
}
