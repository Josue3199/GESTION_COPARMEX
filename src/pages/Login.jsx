import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import logoCoparmex from '../assets/logo-coparmex.jpg'

export default function Login() {
  const { loginConGoogle, logout, noAutorizado, user } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const handleGoogle = async () => {
    setError('')
    setCargando(true)
    try {
      await loginConGoogle()
      navigate('/')
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('No se pudo iniciar sesión con Google. Intenta de nuevo.')
      }
    } finally {
      setCargando(false)
    }
  }

  const handleCambiarCuenta = async () => {
    await logout()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex justify-center mb-5">
          <img src={logoCoparmex} alt="COPARMEX" className="h-20 w-auto object-contain" />
        </div>

        <p className="text-xs uppercase tracking-wide text-brand-600 font-semibold mb-1 text-center">
          Comisiones de Trabajo
        </p>
        <h1 className="text-xl font-bold text-slate-800 mb-6 text-center">Iniciar sesión</h1>

        {user && noAutorizado ? (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-md p-3">
              Entraste con <span className="font-semibold">{user.email}</span>, pero ese correo
              todavía no ha sido autorizado. Pide a la administradora que lo dé de alta como
              presidente de una comisión, o intenta con otra cuenta de Google.
            </div>
            <button
              onClick={handleCambiarCuenta}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded-md transition"
            >
              Probar con otra cuenta
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-500 text-center mb-5">
              Entra con la cuenta de Google que la administradora registró para ti.
            </p>

            {error && <p className="text-sm text-red-600 mb-3 text-center">{error}</p>}

            <button
              onClick={handleGoogle}
              disabled={cargando}
              className="w-full flex items-center justify-center gap-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium py-2.5 rounded-md transition disabled:opacity-60"
            >
              <svg viewBox="0 0 48 48" className="h-5 w-5">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.4C29.6 35.4 27 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.6 5.1C9.5 39.6 16.2 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.6l6.6 5.4C41.9 35.8 44 30.3 44 24c0-1.3-.1-2.7-.4-3.5z"/>
              </svg>
              {cargando ? 'Entrando…' : 'Continuar con Google'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
