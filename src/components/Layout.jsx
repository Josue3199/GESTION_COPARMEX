import { useAuth } from '../context/AuthContext'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import logoCoparmex from '../assets/logo-coparmex.jpg'

const NAV_ADMIN = [
  { to: '/admin', label: 'Panel' },
  { to: '/admin/presidentes', label: 'Presidentes' },
]

const NAV_PRESIDENTE = [
  { to: '/mi-comision', label: 'Mi plan' },
  { to: '/mi-avance', label: 'Mi avance' },
  { to: '/comisiones', label: 'Todos los planes' },
]

export default function Layout({ children, titulo }) {
  const { perfil, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const nav = perfil?.rol === 'admin' ? NAV_ADMIN : perfil?.rol === 'presidente' ? NAV_PRESIDENTE : []

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <div
        className="fixed inset-0 bg-no-repeat bg-center bg-contain opacity-[0.06] pointer-events-none print:hidden"
        style={{ backgroundImage: `url(${logoCoparmex})`, backgroundSize: 'min(60vw, 520px)' }}
        aria-hidden="true"
      />

      <div className="relative z-[1]">
        <header className="bg-white/90 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10 print:hidden">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logoCoparmex} alt="COPARMEX" className="h-9 w-auto object-contain" />
              <div>
                <p className="text-xs uppercase tracking-wide text-brand-600 font-semibold">
                  Comisiones de Trabajo
                </p>
                <h1 className="text-lg font-bold text-slate-800">{titulo}</h1>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-slate-500 hidden sm:inline">
                {perfil?.nombre || perfil?.rol}
              </span>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
              >
                Salir
              </button>
            </div>
          </div>

          {nav.length > 0 && (
            <nav className="max-w-6xl mx-auto px-4 flex gap-1 -mt-px overflow-x-auto">
              {nav.map((item) => {
                const activo = location.pathname === item.to
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`whitespace-nowrap px-3 py-2 text-sm font-medium border-b-2 transition ${
                      activo
                        ? 'border-brand-600 text-brand-700'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          )}
        </header>
        <main className="max-w-6xl mx-auto px-4 py-6 print:p-0 print:max-w-none">{children}</main>
      </div>
    </div>
  )
}
