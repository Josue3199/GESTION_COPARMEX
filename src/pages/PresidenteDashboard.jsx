import { useEffect, useState } from 'react'
import { addDoc, collection, doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { PLAN_VACIO, ESTADOS } from '../data/comisiones'
import Layout from '../components/Layout'

export default function PresidenteDashboard() {
  const { perfil } = useAuth()
  const [comision, setComision] = useState(null)
  const [plan, setPlan] = useState(PLAN_VACIO)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    const cargar = async () => {
      if (!perfil?.comisionId) return
      const snap = await getDoc(doc(db, 'comisiones', perfil.comisionId))
      if (snap.exists()) {
        const data = snap.data()
        setComision({ id: snap.id, ...data })
        if (data.plan) setPlan(data.plan)
      }
      setCargando(false)
    }
    cargar()
  }, [perfil])

  const actualizarCampo = (campo, valor) => setPlan((p) => ({ ...p, [campo]: valor }))

  const actualizarActividad = (i, campo, valor) => {
    setPlan((p) => {
      const actividades = [...p.actividades]
      actividades[i] = { ...actividades[i], [campo]: valor }
      return { ...p, actividades }
    })
  }

  const agregarActividad = () =>
    setPlan((p) => ({
      ...p,
      actividades: [...p.actividades, { actividad: '', objetivo: '', responsable: '', fecha: '', indicador: '' }],
    }))

  const quitarActividad = (i) =>
    setPlan((p) => ({ ...p, actividades: p.actividades.filter((_, idx) => idx !== i) }))

  const guardar = async (nuevoEstado) => {
    setGuardando(true)
    setMensaje('')
    const fecha = new Date().toISOString()
    await updateDoc(doc(db, 'comisiones', comision.id), {
      plan,
      estado: nuevoEstado,
      actualizadoEn: fecha,
    })
    // Registro en el historial del plan (se ve en "Mi avance").
    await addDoc(collection(db, 'comisiones', comision.id, 'historial'), {
      estado: nuevoEstado,
      fecha,
      autorNombre: perfil?.nombre || 'Presidente',
    })
    setComision((c) => ({ ...c, estado: nuevoEstado }))
    setMensaje(nuevoEstado === 'en_revision' ? 'Plan enviado para revisión.' : 'Borrador guardado.')
    setGuardando(false)
  }

  if (cargando) return <Layout titulo="Cargando…"><p>Cargando…</p></Layout>
  if (!comision)
    return (
      <Layout titulo="Sin comisión asignada">
        <p className="text-slate-500">
          Tu cuenta no tiene una comisión asignada todavía. Pide a la administradora que la vincule.
        </p>
      </Layout>
    )

  const estado = ESTADOS[comision.estado] || ESTADOS.pendiente

  return (
    <Layout titulo={comision.nombreComision}>
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
        <p className="text-sm text-slate-500">{comision.area}</p>
        <p className="text-sm text-slate-600">
          {comision.presidenteCargo}: {comision.presidenteNombre}
        </p>
        <span className={`text-xs mt-2 inline-block px-2.5 py-1 rounded-full font-semibold ${estado.color}`}>
          Estado actual: {estado.texto}
        </span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
        <h2 className="font-bold text-slate-800">Plan de trabajo</h2>

        <Campo label="1. Objetivo general">
          <textarea
            className="input"
            rows={2}
            value={plan.objetivoGeneral}
            onChange={(e) => actualizarCampo('objetivoGeneral', e.target.value)}
          />
        </Campo>

        <Campo label="2. Objetivos específicos">
          <textarea
            className="input"
            rows={2}
            value={plan.objetivosEspecificos}
            onChange={(e) => actualizarCampo('objetivosEspecificos', e.target.value)}
          />
        </Campo>

        <div>
          <p className="text-sm font-medium text-slate-600 mb-2">3. Actividades / proyectos</p>
          <div className="space-y-3">
            {plan.actividades.map((a, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-start border border-slate-200 rounded-md p-3">
                <input className="input" placeholder="Actividad" value={a.actividad}
                  onChange={(e) => actualizarActividad(i, 'actividad', e.target.value)} />
                <input className="input" placeholder="Objetivo" value={a.objetivo}
                  onChange={(e) => actualizarActividad(i, 'objetivo', e.target.value)} />
                <input className="input" placeholder="Responsable" value={a.responsable}
                  onChange={(e) => actualizarActividad(i, 'responsable', e.target.value)} />
                <input className="input" placeholder="Fecha" value={a.fecha}
                  onChange={(e) => actualizarActividad(i, 'fecha', e.target.value)} />
                <div className="flex gap-1">
                  <input className="input" placeholder="Indicador" value={a.indicador}
                    onChange={(e) => actualizarActividad(i, 'indicador', e.target.value)} />
                  <button
                    type="button"
                    onClick={() => quitarActividad(i)}
                    className="text-red-500 text-xs px-2"
                    title="Quitar"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={agregarActividad}
            className="mt-2 text-sm text-brand-600 hover:underline"
          >
            + Agregar actividad
          </button>
        </div>

        <Campo label="4. Metas">
          <textarea className="input" rows={2} value={plan.metas}
            onChange={(e) => actualizarCampo('metas', e.target.value)} />
        </Campo>

        <Campo label="5. Recursos necesarios">
          <textarea className="input" rows={2} value={plan.recursos}
            onChange={(e) => actualizarCampo('recursos', e.target.value)} />
        </Campo>

        <Campo label="6. Observaciones">
          <textarea className="input" rows={2} value={plan.observaciones}
            onChange={(e) => actualizarCampo('observaciones', e.target.value)} />
        </Campo>

        {mensaje && <p className="text-sm text-emerald-600">{mensaje}</p>}

        <div className="flex gap-3 pt-2">
          <button
            disabled={guardando}
            onClick={() => guardar('borrador')}
            className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-medium px-4 py-2 rounded-md transition disabled:opacity-60"
          >
            Guardar borrador
          </button>
          <button
            disabled={guardando}
            onClick={() => guardar('en_revision')}
            className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-md transition disabled:opacity-60"
          >
            Enviar para revisión
          </button>
        </div>
      </div>
    </Layout>
  )
}

function Campo({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  )
}
