import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, doc, getDocs, writeBatch } from 'firebase/firestore'
import { db } from '../firebase/config'
import { AREAS, SEED_COMISIONES, ESTADOS } from '../data/comisiones'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'

const ICONOS = {
  total: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 7h8M8 11h8M8 15h5" />
    </svg>
  ),
  pendiente: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4l2.5 2.5" />
    </svg>
  ),
  borrador: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h4l10.5-10.5a2 2 0 0 0-4-4L4 16v4Z" />
      <path d="M13 6l4 4" />
    </svg>
  ),
  en_revision: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  aprobado: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9.5" />
    </svg>
  ),
  rechazado: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5l5 5M14.5 9.5l-5 5" />
    </svg>
  ),
}

const ICONO_TONO = {
  total: 'bg-slate-100 text-slate-600',
  pendiente: 'bg-red-100 text-red-600',
  borrador: 'bg-slate-100 text-slate-500',
  en_revision: 'bg-amber-100 text-amber-600',
  aprobado: 'bg-emerald-100 text-emerald-600',
  rechazado: 'bg-rose-100 text-rose-600',
}

export default function AdminDashboard() {
  const { perfil } = useAuth()
  const [comisiones, setComisiones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtroArea, setFiltroArea] = useState('todas')
  const [filtroEstado, setFiltroEstado] = useState(null)
  const [sembrando, setSembrando] = useState(false)

  const cargar = async () => {
    setCargando(true)
    const snap = await getDocs(collection(db, 'comisiones'))
    setComisiones(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  const inicializarDatos = async () => {
    setSembrando(true)
    const batch = writeBatch(db)
    SEED_COMISIONES.forEach((c) => {
      const { id, ...data } = c
      batch.set(doc(db, 'comisiones', id), data, { merge: true })
    })
    await batch.commit()
    await cargar()
    setSembrando(false)
  }

  const stats = useMemo(() => {
    const total = comisiones.length
    const porEstado = comisiones.reduce((acc, c) => {
      acc[c.estado] = (acc[c.estado] || 0) + 1
      return acc
    }, {})
    return { total, ...porEstado }
  }, [comisiones])

  const avanceGeneral = stats.total ? Math.round(((stats.aprobado || 0) / stats.total) * 100) : 0

  const toggleEstado = (estado) => setFiltroEstado((actual) => (actual === estado ? null : estado))

  const areasVisibles = filtroArea === 'todas' ? AREAS : [filtroArea]

  const porArea = (area) =>
    comisiones
      .filter((c) => c.area === area)
      .filter((c) => !filtroEstado || c.estado === filtroEstado)
      .sort((a, b) => a.nombreComision.localeCompare(b.nombreComision))

  return (
    <Layout titulo="Panel de administración">
      {perfil?.rol === 'admin' && (
        <div className="flex justify-end mb-4">
          <Link
            to="/admin/presidentes"
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            Gestionar accesos y roles →
          </Link>
        </div>
      )}

      {cargando ? (
        <p className="text-slate-500">Cargando comisiones…</p>
      ) : comisiones.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center">
          <p className="text-slate-600 mb-4">
            Aún no hay comisiones cargadas en Firestore.
          </p>
          <button
            onClick={inicializarDatos}
            disabled={sembrando}
            className="bg-brand-600 hover:bg-brand-700 text-white font-medium px-4 py-2 rounded-md transition disabled:opacity-60"
          >
            {sembrando ? 'Cargando…' : 'Inicializar comisiones (25)'}
          </button>
        </div>
      ) : (
        <>
          {/* Resumen general: de un vistazo, qué tan avanzado va todo. */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-700 mb-1">Avance general de planes aprobados</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all"
                    style={{ width: `${avanceGeneral}%` }}
                  />
                </div>
                <span className="text-lg font-bold text-slate-800 w-14 text-right">{avanceGeneral}%</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 sm:text-right sm:w-40">
              {stats.aprobado || 0} de {stats.total} comisiones con plan aprobado
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <StatCard
              icono="total"
              label="Total"
              value={stats.total}
              activo={filtroEstado === null}
              onClick={() => setFiltroEstado(null)}
            />
            {['pendiente', 'borrador', 'en_revision', 'aprobado', 'rechazado'].map((e) => (
              <StatCard
                key={e}
                icono={e}
                label={ESTADOS[e].texto}
                value={stats[e] || 0}
                activo={filtroEstado === e}
                onClick={() => toggleEstado(e)}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-6">
            <button
              onClick={() => setFiltroArea('todas')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                filtroArea === 'todas'
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              Todas las áreas
            </button>
            {AREAS.map((a) => (
              <button
                key={a}
                onClick={() => setFiltroArea(a)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                  filtroArea === a
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {a}
              </button>
            ))}
            {filtroEstado && (
              <button
                onClick={() => setFiltroEstado(null)}
                className="px-3 py-1.5 rounded-full text-sm font-medium border border-dashed border-slate-300 text-slate-500 hover:bg-slate-50"
              >
                Quitar filtro "{ESTADOS[filtroEstado].texto}" ✕
              </button>
            )}
          </div>

          {/* Agrupado por área, con espacio entre tarjetas en vez de una
              sola lista apretada: cada área es su propio bloque plegable. */}
          <div className="space-y-4">
            {areasVisibles.map((area) => {
              const items = porArea(area)
              if (items.length === 0) return null
              return (
                <details key={area} open className="bg-white rounded-xl border border-slate-200 overflow-hidden group">
                  <summary className="cursor-pointer list-none px-5 py-3 flex items-center justify-between hover:bg-slate-50">
                    <span className="flex items-center gap-2">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4 text-slate-400 transition-transform duration-200 group-open:rotate-90"
                      >
                        <path d="M9 6l6 6-6 6" />
                      </svg>
                      <span className="font-semibold text-slate-800">{area}</span>
                    </span>
                    <span className="text-xs text-slate-400">{items.length} comisiones</span>
                  </summary>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 pt-1 border-t border-slate-100">
                    {items.map((c) => {
                      const estado = ESTADOS[c.estado] || ESTADOS.pendiente
                      return (
                        <Link
                          key={c.id}
                          to={`/admin/comision/${c.id}`}
                          className="border border-slate-200 rounded-lg p-3 hover:border-brand-400 hover:shadow-sm transition flex flex-col gap-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-slate-800 text-sm leading-snug">{c.nombreComision}</p>
                            <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${estado.color}`}>
                              {estado.texto}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">{c.presidenteNombre}</p>
                        </Link>
                      )
                    })}
                  </div>
                </details>
              )
            })}
            {areasVisibles.every((area) => porArea(area).length === 0) && (
              <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center text-slate-500 text-sm">
                No hay comisiones que coincidan con este filtro.
              </div>
            )}
          </div>
        </>
      )}
    </Layout>
  )
}

function StatCard({ icono, label, value, activo, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`text-left bg-white rounded-xl border p-4 transition flex flex-col gap-2 ${
        activo ? 'border-brand-500 ring-2 ring-brand-100 shadow-sm' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      <span className={`h-8 w-8 rounded-lg flex items-center justify-center ${ICONO_TONO[icono]}`}>
        <span className="h-4.5 w-4.5 block" style={{ width: 18, height: 18 }}>{ICONOS[icono]}</span>
      </span>
      <p className="text-2xl font-bold text-slate-800 leading-none">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </button>
  )
}
