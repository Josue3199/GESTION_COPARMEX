import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth'
import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore'
import { db, secondaryAuth } from '../firebase/config'
import Layout from '../components/Layout'

const ERRORES = {
  'auth/email-already-in-use': 'Ese correo ya tiene una cuenta creada.',
  'auth/invalid-email': 'El correo no es válido.',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
}

export default function AdminPresidentes() {
  const [comisiones, setComisiones] = useState([])
  const [presidentes, setPresidentes] = useState([])
  const [cargando, setCargando] = useState(true)

  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [comisionId, setComisionId] = useState('')
  const [creando, setCreando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')

  const cargar = async () => {
    setCargando(true)
    const [comisionesSnap, presidentesSnap] = await Promise.all([
      getDocs(collection(db, 'comisiones')),
      getDocs(query(collection(db, 'usuarios'), where('rol', '==', 'presidente'))),
    ])
    const listaComisiones = comisionesSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => a.nombreComision.localeCompare(b.nombreComision))
    setComisiones(listaComisiones)
    setPresidentes(presidentesSnap.docs.map((d) => ({ id: d.id, ...d.data() })))
    if (listaComisiones.length && !comisionId) setComisionId(listaComisiones[0].id)
    setCargando(false)
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const comisionesConCuenta = new Set(presidentes.map((p) => p.comisionId))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMensaje('')
    setCreando(true)
    try {
      const cred = await createUserWithEmailAndPassword(secondaryAuth, correo, password)
      await setDoc(doc(db, 'usuarios', cred.user.uid), {
        rol: 'presidente',
        comisionId,
        nombre,
      })
      await signOut(secondaryAuth)
      setMensaje(`Cuenta creada para ${nombre}. Ya puede iniciar sesión con ese correo y contraseña.`)
      setNombre('')
      setCorreo('')
      setPassword('')
      await cargar()
    } catch (err) {
      setError(ERRORES[err.code] || 'No se pudo crear la cuenta. Intenta de nuevo.')
    } finally {
      setCreando(false)
    }
  }

  return (
    <Layout titulo="Presidentes de comisión">
      <Link to="/admin" className="text-sm text-brand-600 hover:underline mb-4 inline-block">
        ← Volver al panel
      </Link>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-bold text-slate-800 mb-4">Crear cuenta de presidente</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Nombre completo</label>
              <input required className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Correo</label>
              <input
                required
                type="email"
                className="input"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Contraseña temporal (mínimo 6 caracteres)
              </label>
              <input
                required
                minLength={6}
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Comisión a asignar</label>
              <select
                required
                className="input"
                value={comisionId}
                onChange={(e) => setComisionId(e.target.value)}
              >
                {comisiones.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombreComision}
                    {comisionesConCuenta.has(c.id) ? ' (ya tiene cuenta)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {mensaje && <p className="text-sm text-emerald-600">{mensaje}</p>}

            <button
              type="submit"
              disabled={creando || cargando || !comisiones.length}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2 rounded-md transition disabled:opacity-60"
            >
              {creando ? 'Creando…' : 'Crear cuenta'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-bold text-slate-800 mb-4">Cuentas ya creadas</h2>
          {cargando ? (
            <p className="text-slate-500 text-sm">Cargando…</p>
          ) : presidentes.length === 0 ? (
            <p className="text-slate-500 text-sm">Todavía no has creado ninguna cuenta de presidente.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {presidentes.map((p) => {
                const com = comisiones.find((c) => c.id === p.comisionId)
                return (
                  <li key={p.id} className="py-2">
                    <p className="text-sm font-medium text-slate-800">{p.nombre}</p>
                    <p className="text-xs text-slate-500">{com?.nombreComision || p.comisionId}</p>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </Layout>
  )
}
