import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, doc, getDoc, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { ESTADOS } from '../data/comisiones'
import Layout from '../components/Layout'
import PlanVista from '../components/PlanVista'

// Historial de planes que el presidente ya envió (con una copia de cada
// versión), para que pueda consultarlos sin que se mezclen con el borrador
// que esté editando en ese momento.
export default function MisPlanes() {
  const { perfil } = useAuth()
  const [comision, setComision] = useState(null)
  const [historial, setHistorial] = useState([])
  const [cargando, setCargando] = useState(true)
  const [abierto, setAbierto] = useState(null)

  useEffect(() => {
    const cargar = async () => {
      if (!perfil?.comisionId) return
      const [snap, historialSnap] = await Promise.all([
        getDoc(doc(db, 'comisiones', perfil.comisionId)),
        getDocs(query(collection(db, 'comisiones', perfil.comisionId, 'historial'), orderBy('fecha', 'desc'))),
      ])
      if (snap.exists()) setComision({ id: snap.id, ...snap.data() })
      setHistorial(historialSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((h) => h.plan))
      setCargando(false)
    }
    cargar()
  }, [perfil])

  return (
    <Layout titulo="Mis planes enviados">
      <Link to="/mi-comision" className="text-sm text-brand-600 hover:underline mb-4 inline-block">
        ← Volver
      </Link>

      {cargando ? (
        <p className="text-slate-500">Cargando…</p>
      ) : historial.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center text-slate-500">
          Todavía no has enviado ningún plan. Cuando envíes uno para revisión, va a aparecer aquí.
        </div>
      ) : (
        <ul className="space-y-3">
          {historial.map((h) => {
            const estado = ESTADOS[h.estado] || ESTADOS.pendiente
            const estaAbierto = abierto === h.id
            return (
              <li key={h.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setAbierto(estaAbierto ? null : h.id)}
                  className="w-full flex items-center justify-between gap-2 px-5 py-3 hover:bg-slate-50 text-left"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      Enviado el {new Date(h.fecha).toLocaleString('es-MX')}
                    </p>
                    <p className="text-xs text-slate-500">Por {h.autorNombre}</p>
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${estado.color}`}>
                    {estado.texto}
                  </span>
                </button>
                {estaAbierto && comision && (
                  <div className="p-4 border-t border-slate-100">
                    <PlanVista comision={{ ...comision, plan: h.plan, estado: h.estado }} />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Layout>
  )
}
