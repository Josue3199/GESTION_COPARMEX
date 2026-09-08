import { useEffect, useMemo, useState } from 'react'
import { collection, doc, getDoc, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { ESTADOS, CAMPOS_PLAN_PARA_AVANCE } from '../data/comisiones'
import Layout from '../components/Layout'
import Comentarios from '../components/Comentarios'

export default function MiAvance() {
  const { perfil } = useAuth()
  const [comision, setComision] = useState(null)
  const [historial, setHistorial] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const cargar = async () => {
      if (!perfil?.comisionId) return
      const [snap, historialSnap] = await Promise.all([
        getDoc(doc(db, 'comisiones', perfil.comisionId)),
        getDocs(query(collection(db, 'comisiones', perfil.comisionId, 'historial'), orderBy('fecha', 'desc'))),
      ])
      if (snap.exists()) setComision({ id: snap.id, ...snap.data() })
      setHistorial(historialSnap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setCargando(false)
    }
    cargar()
  }, [perfil])

  const avance = useMemo(() => {
    if (!comision?.plan) return 0
    const llenos = CAMPOS_PLAN_PARA_AVANCE.filter((campo) => (comision.plan[campo] || '').trim().length > 0).length
    const actividadesLlenas = (comision.plan.actividades || []).some((a) => a.actividad?.trim())
    const total = CAMPOS_PLAN_PARA_AVANCE.length + 1
    const completos = llenos + (actividadesLlenas ? 1 : 0)
    return Math.round((completos / total) * 100)
  }, [comision])

  if (cargando) return <Layout titulo="Mi avance"><p>Cargando…</p></Layout>
  if (!comision)
    return (
      <Layout titulo="Mi avance">
        <p className="text-slate-500">
          Tu cuenta no tiene una comisión asignada todavía. Pide a la administradora que la vincule.
        </p>
      </Layout>
    )

  const estado = ESTADOS[comision.estado] || ESTADOS.pendiente

  return (
    <Layout titulo="Mi avance">
      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Estado actual</p>
          <span className={`text-sm font-semibold px-2.5 py-1 rounded-full ${estado.color}`}>{estado.texto}</span>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Avance del plan</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-brand-600" style={{ width: `${avance}%` }} />
            </div>
            <span className="text-sm font-semibold text-slate-700">{avance}%</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Última actualización</p>
          <p className="text-sm font-medium text-slate-700">
            {comision.actualizadoEn ? new Date(comision.actualizadoEn).toLocaleString('es-MX') : 'Aún sin guardar'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h2 className="font-bold text-slate-800 mb-3">Historial de mi plan</h2>
        {historial.length === 0 ? (
          <p className="text-sm text-slate-500">Todavía no hay movimientos guardados.</p>
        ) : (
          <ul className="space-y-2">
            {historial.map((h) => {
              const e = ESTADOS[h.estado] || ESTADOS.pendiente
              return (
                <li key={h.id} className="flex items-center gap-3 text-sm">
                  <span className={`h-2.5 w-2.5 rounded-full ${e.dot}`} />
                  <span className="text-slate-600">{new Date(h.fecha).toLocaleString('es-MX')}</span>
                  <span className="font-medium text-slate-800">→ {e.texto}</span>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <Comentarios comisionId={comision.id} />
    </Layout>
  )
}
