import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, doc, getDocs, setDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import Layout from '../components/Layout'

const ROL_LABEL = {
  presidente: 'Presidente de comisión',
  directora: 'Directora',
}

export default function AdminPresidentes() {
  const [comisiones, setComisiones] = useState([])
  const [autorizados, setAutorizados] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)

  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [rol, setRol] = useState('presidente')
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
        rol,
        ...(rol === 'presidente' ? { comisionId } : {}),
      })
      setMensaje(
        `Listo: ${correoLimpio} ya puede entrar con Google como ${ROL_LABEL[rol].toLowerCase()}.`
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
    <Layout titulo="Accesos y roles">
      <Link to="/admin" className="text-sm text-brand-600 hover:underline mb-4 inline-block">
        ← Volver al panel
      </Link>

      <div className="bg-brand-50 border border-brand-100 text-brand-700 text-sm rounded-md p-3 mb-6">
        Solo el <strong>admin</strong> puede activar accesos nuevos. La directora puede
        aprobar/rechazar planes y ver todo el panel, pero no puede dar de alta correos aquí.
        Como nadie tiene correo institucional, el acceso es con Gmail personal: registra aquí qué
        correo corresponde a cada rol y, la primera vez que esa persona entre con "Continuar con
        Google", el sistema le asigna ese rol automáticamente — sin contraseñas.
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-bold text-slate-800 mb-4">Activar un acceso</h2>
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
              <label className="block text-sm font-medium text-slate-600 mb-1">Rol</label>
              <select required className="input" value={rol} onChange={(e) => setRol(e.target.value)}>
                <option value="presidente">Presidente de comisión</option>
                <option value="directora">Directora</option>
              </select>
            </div>
            {rol === 'presidente' && (
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
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}
            {mensaje && <p className="text-sm text-emerald-600">{mensaje}</p>}

            <button
              type="submit"
              disabled={guardando || cargando || (rol === 'presidente' && !comisiones.length)}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2 rounded-md transition disabled:opacity-60"
            >
              {guardando ? 'Guardando…' : 'Activar acceso'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-bold text-slate-800 mb-4">Accesos activados</h2>
          {cargando ? (
            <p className="text-slate-500 text-sm">Cargando…</p>
          ) : autorizados.length === 0 ? (
            <p className="text-slate-500 text-sm">Todavía no has activado ningún acceso.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {autorizados.map((a) => {
                const com = comisiones.find((c) => c.id === a.comisionId)
                const activo = yaInicioSesion(a.correo)
                const rolAutorizado = a.rol || 'presidente'
                return (
                  <li key={a.correo} className="py-2 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{a.nombre}</p>
                      <p className="text-xs text-slate-500">{a.correo}</p>
                      <p className="text-xs text-slate-500">
                        {ROL_LABEL[rolAutorizado]}
                        {rolAutorizado === 'presidente' && ` · ${com?.nombreComision || a.comisionId}`}
                      </p>
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
