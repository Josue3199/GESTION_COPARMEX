import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, doc, getDocs, writeBatch } from 'firebase/firestore'
import { db } from '../firebase/config'
import { AREAS, SEED_COMISIONES, ESTADOS } from '../data/comisiones'
import Layout from '../components/Layout'

export default function AdminDashboard() {
  const [comisiones, setComisiones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtroArea, setFiltroArea] = useState('todas')
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

  const areasVisibles = filtroArea === 'todas' ? AREAS : [filtroArea]

  const porArea = (area) =>
    comisiones
      .filter((c) => c.area === area)
      .sort((a, b) => a.nombreComision.localeCompare(b.nombreComision))

  return (
    <Layout titulo="Panel de administración">
      <div className="flex justify-end mb-4">
        <Link
          to="/admin/presidentes"
          className="text-sm font-medium text-brand-600 hover:underline"
        >
          Gestionar presidentes →
        </Link>
      </div>

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
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            <StatCard label="Total" value={stats.total} />
            <StatCard label="Pendientes" value={stats.pendiente || 0} />
            <StatCard label="En revisión" value={stats.en_revision || 0} />
            <StatCard label="Aprobados" value={stats.aprobado || 0} />
            <StatCard label="Rechazados" value={stats.rechazado || 0} />
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
                    <span className="font-semibold text-slate-800">{area}</span>
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
          </div>
        </>
      )}
    </Layout>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
  )
}
