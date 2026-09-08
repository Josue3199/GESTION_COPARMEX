import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, doc, getDocs, setDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import Layout from '../components/Layout'

export default function AdminPresidentes() {
  const [comisiones, setComisiones] = useState([])
  const [autorizados, setAutorizados] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)

  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [comisionId, setComisionId] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')

  const cargar = async () => {
    setCargando(true)
    const [comisionesSnap, autorizadosSnap, usuariosSnap] = await Promise.all([
      getDocs(collection(db, 'comisiones')),
      getDocs(collection(db, 'presidentesAutorizados')),
      getDocs(collection(db, 'usuarios')),
    ])
    const listaComisiones = comisionesSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => a.nombreComision.localeCompare(b.nombreComision))
    setComisiones(listaComisiones)
    setAutorizados(autorizadosSnap.docs.map((d) => ({ correo: d.id, ...d.data() })))
    setUsuarios(usuariosSnap.docs.map((d) => ({ id: d.id, ...d.data() })))
    if (listaComisiones.length && !comisionId) setComisionId(listaComisiones[0].id)
    setCargando(false)
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const yaInicioSesion = (correoAutorizado) =>
    usuarios.some((u) => (u.correo || '').toLowerCase() === correoAutorizado)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMensaje('')
    const correoLimpio = correo.trim().toLowerCase()
    if (!correoLimpio) return
    setGuardando(true)
    try {
      await setDoc(doc(db, 'presidentesAutorizados', correoLimpio), {
        nombre: nombre.trim(),
        comisionId,
      })
      setMensaje(
        `Listo: ${correoLimpio} ya puede entrar con Google y quedará como presidente de la comisión seleccionada.`
      )
      setNombre('')
      setCorreo('')
      await cargar()
    } catch (err) {
      setError('No se pudo guardar la autorización. Intenta de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Layout titulo="Presidentes de comisión">
      <Link to="/admin" className="text-sm text-brand-600 hover:underline mb-4 inline-block">
        ← Volver al panel
      </Link>

      <div className="bg-brand-50 border border-brand-100 text-brand-700 text-sm rounded-md p-3 mb-6">
        Los presidentes no tienen correo institucional, así que el acceso es con su cuenta de
        Gmail personal: aquí solo registras qué correo de Google corresponde a cada comisión. La
        primera vez que esa persona entre a la app con "Continuar con Google", el sistema le
        asigna automáticamente esa comisión — no se crea ninguna contraseña.
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-bold text-slate-800 mb-4">Autorizar presidente</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Nombre completo</label>
              <input required className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Correo de Gmail (con el que iniciará sesión)
              </label>
              <input
                required
                type="email"
                className="input"
                placeholder="nombre@gmail.com"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
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
                  </option>
                ))}
              </select>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {mensaje && <p className="text-sm text-emerald-600">{mensaje}</p>}

            <button
              type="submit"
              disabled={guardando || cargando || !comisiones.length}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2 rounded-md transition disabled:opacity-60"
            >
              {guardando ? 'Guardando…' : 'Autorizar correo'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-bold text-slate-800 mb-4">Correos autorizados</h2>
          {cargando ? (
            <p className="text-slate-500 text-sm">Cargando…</p>
          ) : autorizados.length === 0 ? (
            <p className="text-slate-500 text-sm">Todavía no has autorizado ningún correo.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {autorizados.map((a) => {
                const com = comisiones.find((c) => c.id === a.comisionId)
                const activo = yaInicioSesion(a.correo)
                return (
                  <li key={a.correo} className="py-2 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{a.nombre}</p>
                      <p className="text-xs text-slate-500">{a.correo}</p>
                      <p className="text-xs text-slate-500">{com?.nombreComision || a.comisionId}</p>
                    </div>
                    <span
                      className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {activo ? 'Ya inició sesión' : 'Pendiente de entrar'}
                    </span>
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
