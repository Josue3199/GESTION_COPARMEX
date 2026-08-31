import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import logoCoparmex from '../assets/logo-coparmex.jpg'

export default function Layout({ children, titulo }) {
  const { perfil, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <div
        className="fixed inset-0 bg-no-repeat bg-center bg-contain opacity-[0.06] pointer-events-none"
        style={{ backgroundImage: `url(${logoCoparmex})`, backgroundSize: 'min(60vw, 520px)' }}
        aria-hidden="true"
      />

      <div className="relative z-[1]">
        <header className="bg-white/90 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10">
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
        </header>
        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
      </div>
    </div>
  )
}
