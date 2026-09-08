import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase/config'
import { AREAS, ESTADOS } from '../data/comisiones'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'

// Listado, solo para presidentes, de TODAS las comisiones: cualquier
// presidente puede consultar el plan de trabajo de cualquier otra comisión
// (solo lectura, en la vista tipo documento de VerPlanComision).
export default function PlanesPresidentes() {
  const { perfil } = useAuth()
  const [comisiones, setComisiones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtroArea, setFiltroArea] = useState('todas')

  useEffect(() => {
    const cargar = async () => {
      const snap = await getDocs(collection(db, 'comisiones'))
      setComisiones(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setCargando(false)
    }
    cargar()
  }, [])

  const visibles = comisiones
    .filter((c) => filtroArea === 'todas' || c.area === filtroArea)
    .sort((a, b) => a.area.localeCompare(b.area) || a.nombreComision.localeCompare(b.nombreComision))

  return (
    <Layout titulo="Planes de todas las comisiones">
      <p className="text-sm text-slate-500 mb-4">
        Consulta el plan de trabajo de cualquier comisión y, si quieres, déjale una nota.
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-4">
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

      {cargando ? (
        <p className="text-slate-500">Cargando comisiones…</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visibles.map((c) => {
            const estado = ESTADOS[c.estado] || ESTADOS.pendiente
            const esLaMia = c.id === perfil?.comisionId
            return (
              <Link
                key={c.id}
                to={`/comisiones/${c.id}`}
                className="bg-white border border-slate-200 rounded-lg p-4 hover:border-brand-400 hover:shadow-sm transition flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-slate-800 text-sm leading-snug">
                    {c.nombreComision} {esLaMia && <span className="text-brand-600">(mía)</span>}
                  </p>
                  <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${estado.color}`}>
                    {estado.texto}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{c.presidenteNombre}</p>
                <p className="text-xs text-slate-400">{c.area}</p>
              </Link>
            )
          })}
        </div>
      )}
    </Layout>
  )
}
