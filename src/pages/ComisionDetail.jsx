import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { addDoc, collection, doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import PlanVista from '../components/PlanVista'
import Comentarios from '../components/Comentarios'

export default function ComisionDetail() {
  const { id } = useParams()
  const { perfil } = useAuth()
  const [comision, setComision] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [actualizando, setActualizando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const cargar = async () => {
      try {
        const snap = await getDoc(doc(db, 'comisiones', id))
        if (snap.exists()) setComision({ id: snap.id, ...snap.data() })
      } catch (err) {
        console.error('Error cargando la comisión:', err)
        setError('No se pudo cargar la comisión. Revisa tu conexión e intenta de nuevo.')
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [id])

  const cambiarEstado = async (nuevoEstado) => {
    setActualizando(true)
    setError('')
    const fecha = new Date().toISOString()
    try {
      await updateDoc(doc(db, 'comisiones', id), { estado: nuevoEstado, actualizadoEn: fecha })
      // Se deja constancia en el historial (sin copia del plan: ya existe
      // la del envío) para que el presidente vea aprobaciones y rechazos
      // en "Mi avance".
      await addDoc(collection(db, 'comisiones', id, 'historial'), {
        estado: nuevoEstado,
        fecha,
        autorNombre: perfil?.nombre || perfil?.rol || 'Administración',
      })
      setComision((c) => ({ ...c, estado: nuevoEstado, actualizadoEn: fecha }))
    } catch (err) {
      console.error('Error cambiando estado:', err)
      setError('No se pudo cambiar el estado. Intenta de nuevo.')
    } finally {
      setActualizando(false)
    }
  }

  if (cargando) return <Layout titulo="Cargando…"><p>Cargando…</p></Layout>
  if (error && !comision) return <Layout titulo="Error"><p className="text-red-600 text-sm">{error}</p></Layout>
  if (!comision) return <Layout titulo="No encontrada"><p>La comisión no existe.</p></Layout>

  const estado = comision.estado

  return (
    <Layout titulo={comision.nombreComision}>
      <Link to="/admin" className="text-sm text-brand-600 hover:underline mb-4 inline-block print:hidden">
        ← Volver al panel
      </Link>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md p-3 mb-4 print:hidden">
          {error}
        </div>
      )}

      {comision.tieneBorrador && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-md p-3 mb-4 print:hidden">
          ✎ Esta persona tiene un plan sin enviar a medio llenar
          {comision.borradorActualizadoEn &&
            ` (última edición: ${new Date(comision.borradorActualizadoEn).toLocaleString('es-MX')})`}
          . Lo que ves abajo es el último plan oficial, no ese borrador.
        </div>
      )}

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
