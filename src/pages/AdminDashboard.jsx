import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, doc, getDocs, writeBatch } from 'firebase/firestore'
import { db } from '../firebase/config'
import { AREAS, SEED_COMISIONES } from '../data/comisiones'
import Layout from '../components/Layout'

const ESTADO_LABEL = {
  pendiente: { texto: 'Pendiente', color: 'bg-red-100 text-red-700' },
  borrador: { texto: 'Borrador', color: 'bg-slate-100 text-slate-600' },
  en_revision: { texto: 'En revisión', color: 'bg-amber-100 text-amber-700' },
  aprobado: { texto: 'Aprobado', color: 'bg-emerald-100 text-emerald-700' },
}

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

  const visibles = comisiones
    .filter((c) => filtroArea === 'todas' || c.area === filtroArea)
    .sort((a, b) => a.area.localeCompare(b.area) || a.nombreComision.localeCompare(b.nombreComision))

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
            <StatCard label="Pendientes" value={stats.pendiente || 0} tone="red" />
            <StatCard label="Borrador" value={stats.borrador || 0} tone="slate" />
            <StatCard label="En revisión" value={stats.en_revision || 0} tone="amber" />
            <StatCard label="Aprobados" value={stats.aprobado || 0} tone="emerald" />
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <button
              onClick={() => setFiltroArea('todas')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border ${
                filtroArea === 'todas'
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white text-slate-600 border-slate-300'
              }`}
            >
              Todas las áreas
            </button>
            {AREAS.map((a) => (
              <button
                key={a}
                onClick={() => setFiltroArea(a)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border ${
                  filtroArea === a
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-slate-600 border-slate-300'
                }`}
              >
                {a}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
            {visibles.map((c) => {
              const estado = ESTADO_LABEL[c.estado] || ESTADO_LABEL.pendiente
              return (
                <Link
                  key={c.id}
                  to={`/admin/comision/${c.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition"
                >
                  <div>
                    <p className="font-medium text-slate-800">{c.nombreComision}</p>
                    <p className="text-sm text-slate-500">
                      {c.presidenteNombre} · {c.area}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${estado.color}`}>
                    {estado.texto}
                  </span>
                </Link>
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
