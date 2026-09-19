import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { deleteDoc, doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { ESTADOS } from '../data/comisiones'
import Layout from '../components/Layout'
import { leerBorradorLocal, borrarBorradorLocal } from '../utils/borradorLocal'

// Punto de entrada del presidente: en vez de aventarlo directo a un
// formulario (que antes se quedaba con datos de un plan anterior), aquí
// elige qué quiere hacer. El formulario real vive en EditorPlan.jsx.
export default function PresidenteDashboard() {
  const { perfil } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [comision, setComision] = useState(null)
  const [borrador, setBorrador] = useState(null)
  const [cargando, setCargando] = useState(true)

  const cargar = async () => {
    if (!perfil?.comisionId) return
    setCargando(true)
    const [snap, bSnap] = await Promise.all([
      getDoc(doc(db, 'comisiones', perfil.comisionId)),
      getDoc(doc(db, 'comisiones', perfil.comisionId, 'borrador', 'actual')),
    ])
    if (snap.exists()) setComision({ id: snap.id, ...snap.data() })

    // La copia local (guardada al instante en cada tecleo) puede llevar
    // más avance que la de Firestore si hubo un cierre justo antes de que
    // el autoguardado remoto alcanzara a correr; se usa la más reciente.
    const local = perfil.comisionId ? leerBorradorLocal(perfil.comisionId) : null
    const remoto = bSnap.exists() ? bSnap.data() : null
    const masReciente =
      local && (!remoto || new Date(local.actualizadoEn) >= new Date(remoto.actualizadoEn)) ? local : remoto
    setBorrador(masReciente)
    setCargando(false)
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil])

  const continuarBorrador = () => navigate('/mi-comision/editar', { state: { modo: 'borrador' } })

  const generarNuevo = async () => {
    if (borrador) {
      const confirmar = window.confirm(
        'Ya tienes un borrador sin enviar. Si generas un plan nuevo, ese borrador se va a borrar.\n\n¿Seguro que quieres continuar?'
      )
      if (!confirmar) return
      await deleteDoc(doc(db, 'comisiones', comision.id, 'borrador', 'actual')).catch(() => {})
      await updateDoc(doc(db, 'comisiones', comision.id), { tieneBorrador: false }).catch(() => {})
      borrarBorradorLocal(comision.id)
    }
    navigate('/mi-comision/editar', { state: { modo: 'nuevo' } })
  }

  if (cargando) return <Layout titulo="Mi plan"><p>Cargando…</p></Layout>
  if (!comision)
    return (
      <Layout titulo="Mi plan">
        <p className="text-slate-500">
          Tu cuenta no tiene una comisión asignada todavía. Pide al administrador del sistema que
          la vincule.
        </p>
      </Layout>
    )

  const estado = ESTADOS[comision.estado] || ESTADOS.pendiente

  return (
    <Layout titulo={comision.nombreComision}>
      {location.state?.enviado && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-md p-3 mb-4">
          ✓ Tu plan se envió para revisión correctamente.
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <p className="text-sm text-slate-500">{comision.area}</p>
        <p className="text-sm text-slate-600">
          {comision.presidenteCargo}: {comision.presidenteNombre}
        </p>
        <span className={`text-xs mt-2 inline-block px-2.5 py-1 rounded-full font-semibold ${estado.color}`}>
          Estado oficial del plan: {estado.texto}
        </span>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <button
          onClick={continuarBorrador}
          disabled={!borrador}
          className={`text-left bg-white rounded-xl border p-5 transition ${
            borrador ? 'border-amber-300 hover:shadow-md hover:border-amber-400' : 'border-slate-200 opacity-50 cursor-not-allowed'
          }`}
        >
          <p className="text-2xl mb-2">📝</p>
          <p className="font-bold text-slate-800 mb-1">Consultar borrador</p>
          <p className="text-xs text-slate-500">
            {borrador
              ? `Tienes un plan sin enviar. Última edición: ${new Date(borrador.actualizadoEn).toLocaleString('es-MX')}`
              : 'No tienes ningún borrador guardado por ahora.'}
          </p>
        </button>

        <button
          onClick={() => navigate('/mi-comision/historial')}
          className="text-left bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-slate-300 transition"
        >
          <p className="text-2xl mb-2">📚</p>
          <p className="font-bold text-slate-800 mb-1">Consultar mis planes</p>
          <p className="text-xs text-slate-500">Revisa los planes que ya has enviado y sus comentarios.</p>
        </button>

        <button
          onClick={generarNuevo}
          className="text-left bg-white rounded-xl border border-brand-200 p-5 hover:shadow-md hover:border-brand-400 transition"
        >
          <p className="text-2xl mb-2">✨</p>
          <p className="font-bold text-slate-800 mb-1">Generar nuevo plan</p>
          <p className="text-xs text-slate-500">Abre el formulario en blanco para llenar un plan desde cero.</p>
        </button>
      </div>
    </Layout>
  )
}
