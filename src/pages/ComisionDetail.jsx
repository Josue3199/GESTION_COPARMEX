import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import Layout from '../components/Layout'
import PlanVista from '../components/PlanVista'
import Comentarios from '../components/Comentarios'

export default function ComisionDetail() {
  const { id } = useParams()
  const [comision, setComision] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [actualizando, setActualizando] = useState(false)

  useEffect(() => {
    const cargar = async () => {
      const snap = await getDoc(doc(db, 'comisiones', id))
      if (snap.exists()) setComision({ id: snap.id, ...snap.data() })
      setCargando(false)
    }
    cargar()
  }, [id])

  const cambiarEstado = async (nuevoEstado) => {
    setActualizando(true)
    await updateDoc(doc(db, 'comisiones', id), { estado: nuevoEstado })
    setComision((c) => ({ ...c, estado: nuevoEstado }))
    setActualizando(false)
  }

  if (cargando) return <Layout titulo="Cargando…"><p>Cargando…</p></Layout>
  if (!comision) return <Layout titulo="No encontrada"><p>La comisión no existe.</p></Layout>

  const estado = comision.estado

  return (
    <Layout titulo={comision.nombreComision}>
      <Link to="/admin" className="text-sm text-brand-600 hover:underline mb-4 inline-block print:hidden">
        ← Volver al panel
      </Link>

      <PlanVista
        comision={comision}
        acciones={
          comision.plan && (
            <>
              {estado !== 'aprobado' && (
                <button
                  disabled={actualizando}
                  onClick={() => cambiarEstado('aprobado')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-md transition disabled:opacity-60"
                >
                  Aprobar plan
                </button>
              )}
              {estado !== 'rechazado' && (
                <button
                  disabled={actualizando}
                  onClick={() => cambiarEstado('rechazado')}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium px-4 py-2 rounded-md transition disabled:opacity-60"
                >
                  Rechazar plan
                </button>
              )}
              {estado !== 'en_revision' && (
                <button
                  disabled={actualizando}
                  onClick={() => cambiarEstado('en_revision')}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-medium px-4 py-2 rounded-md transition disabled:opacity-60"
                >
                  Mandar a validación de nuevo
                </button>
              )}
            </>
          )
        }
      />

      {comision.plan && (
        <div className="mt-6 print:hidden">
          <Comentarios comisionId={comision.id} />
        </div>
      )}
    </Layout>
  )
}
