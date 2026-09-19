import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { addDoc, collection, deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { PLAN_VACIO, ESTADOS } from '../data/comisiones'
import Layout from '../components/Layout'
import AutoTextarea from '../components/AutoTextarea'
import { leerBorradorLocal, guardarBorradorLocal, borrarBorradorLocal } from '../utils/borradorLocal'

const borradorRef = (comisionId) => doc(db, 'comisiones', comisionId, 'borrador', 'actual')

export default function EditorPlan() {
  const { perfil } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const modo = location.state?.modo // 'nuevo' | 'borrador' | undefined

  const [comision, setComision] = useState(null)
  const [plan, setPlan] = useState(PLAN_VACIO)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [ultimoGuardado, setUltimoGuardado] = useState(null)

  // Referencias para el autoguardado con debounce (no dispara en el primer
  // render, solo cuando la persona realmente edita algo).
  const primerRender = useRef(true)
  const debounceRef = useRef(null)
  const planActualRef = useRef(plan)
  planActualRef.current = plan
  // Evita que el guardado-al-salir resucite el borrador justo después de
  // limpiarlo o enviarlo (ambas acciones desmontan esta pantalla).
  const yaResueltoRef = useRef(false)

  useEffect(() => {
    const cargar = async () => {
      if (!perfil?.comisionId) return
      const snap = await getDoc(doc(db, 'comisiones', perfil.comisionId))
      if (snap.exists()) setComision({ id: snap.id, ...snap.data() })

      if (modo === 'nuevo') {
        borrarBorradorLocal(perfil.comisionId)
        setPlan(PLAN_VACIO)
      } else {
        // La copia local (guardada al instante en cada tecleo) es más
        // confiable que la de Firestore para recuperar exactamente lo
        // último que se escribió, así que se prefiere si existe.
        const local = leerBorradorLocal(perfil.comisionId)
        const bSnap = await getDoc(borradorRef(perfil.comisionId))
        const remoto = bSnap.exists() ? bSnap.data() : null

        const masReciente =
          local && (!remoto || new Date(local.actualizadoEn) >= new Date(remoto.actualizadoEn))
            ? local
            : remoto

        if (masReciente) {
          setPlan(masReciente.plan)
          setUltimoGuardado(masReciente.actualizadoEn)
        } else {
          setPlan(PLAN_VACIO)
        }
      }
      setCargando(false)
    }
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil, modo])

  const guardarBorrador = async (silencioso = false) => {
    if (!comision) return
    if (!silencioso) setGuardando(true)
    const fecha = new Date().toISOString()
    try {
      await setDoc(borradorRef(comision.id), { plan: planActualRef.current, actualizadoEn: fecha })
      await updateDoc(doc(db, 'comisiones', comision.id), {
        tieneBorrador: true,
        borradorActualizadoEn: fecha,
      })
      setUltimoGuardado(fecha)
      if (!silencioso) setMensaje('Cambios guardados.')
    } catch (err) {
      if (!silencioso) setMensaje('No se pudo guardar. Revisa tu conexión e intenta de nuevo.')
    } finally {
      if (!silencioso) setGuardando(false)
    }
  }

  // Copia local instantánea: se guarda en cada cambio (sin esperar los 2s
  // del autoguardado a Firestore), para que ni un cierre inmediato de la
  // pestaña pierda lo que se llevaba escrito.
  useEffect(() => {
    if (cargando || !comision) return
    guardarBorradorLocal(comision.id, plan, new Date().toISOString())
  }, [plan, cargando, comision])

  // Autoguardado: 2s después de que la persona deja de escribir, y también
  // al salir de esta pantalla (cambiar de página, cerrar sesión, etc.), para
  // que nunca se pierda lo que llevaba avanzado.
  useEffect(() => {
    if (primerRender.current) {
      primerRender.current = false
      return
    }
    if (!comision) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => guardarBorrador(true), 2000)
    return () => clearTimeout(debounceRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan])

  useEffect(() => {
    return () => {
      if (comision && !yaResueltoRef.current) guardarBorrador(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comision])

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

  const limpiarPlan = () => {
    if (!window.confirm('¿Seguro que quieres limpiar el formulario? Se borrará todo lo escrito, incluyendo la copia guardada en este navegador.')) return
    setPlan(PLAN_VACIO)
    borrarBorradorLocal(comision.id)
    setMensaje('Formulario limpiado. No olvides guardar o enviar cuando termines.')
  }

  const enviar = async () => {
    setEnviando(true)
    setMensaje('')
    const fecha = new Date().toISOString()
    try {
      await updateDoc(doc(db, 'comisiones', comision.id), {
        plan,
        estado: 'en_revision',
        actualizadoEn: fecha,
        tieneBorrador: false,
      })
      await addDoc(collection(db, 'comisiones', comision.id, 'historial'), {
        estado: 'en_revision',
        fecha,
        autorNombre: perfil?.nombre || 'Presidente',
        plan, // guardamos una copia del plan enviado para "Mis planes"
      })
      // Se borra el borrador de trabajo (remoto y local): la próxima vez
      // que abran "Generar nuevo plan" el formulario aparece en blanco.
      yaResueltoRef.current = true
      await deleteDoc(borradorRef(comision.id)).catch(() => {})
      borrarBorradorLocal(comision.id)
      navigate('/mi-comision', { state: { enviado: true } })
    } catch (err) {
      setMensaje('No se pudo enviar el plan. Intenta de nuevo.')
      setEnviando(false)
    }
  }

  if (cargando) return <Layout titulo="Cargando…"><p>Cargando…</p></Layout>
  if (!comision)
    return (
      <Layout titulo="Sin comisión asignada">
        <p className="text-slate-500">
          Tu cuenta no tiene una comisión asignada todavía. Pide al administrador del sistema que
          la vincule.
        </p>
      </Layout>
    )

  const estado = ESTADOS[comision.estado] || ESTADOS.pendiente

  return (
    <Layout titulo={comision.nombreComision}>
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{comision.area}</p>
          <p className="text-sm text-slate-600">
            {comision.presidenteCargo}: {comision.presidenteNombre}
          </p>
          <span className={`text-xs mt-2 inline-block px-2.5 py-1 rounded-full font-semibold ${estado.color}`}>
            Estado oficial: {estado.texto}
          </span>
        </div>
        <p className="text-xs text-slate-400">
          {ultimoGuardado ? `Borrador guardado: ${new Date(ultimoGuardado).toLocaleString('es-MX')}` : 'Sin guardar todavía'}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-800">Plan de trabajo</h2>
          <button
            type="button"
            onClick={limpiarPlan}
            className="text-sm font-medium text-slate-500 hover:text-rose-600 border border-slate-300 hover:border-rose-300 px-3 py-1.5 rounded-md transition"
          >
            🧹 Limpiar plan
          </button>
        </div>

        <Campo label="1. Objetivo general">
          <AutoTextarea
            label="1. Objetivo general"
            value={plan.objetivoGeneral}
            onChange={(e) => actualizarCampo('objetivoGeneral', e.target.value)}
          />
        </Campo>

        <Campo label="2. Objetivos específicos">
          <AutoTextarea
            label="2. Objetivos específicos"
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
          <AutoTextarea label="4. Metas" value={plan.metas}
            onChange={(e) => actualizarCampo('metas', e.target.value)} />
        </Campo>

        <Campo label="5. Recursos necesarios">
          <AutoTextarea label="5. Recursos necesarios" value={plan.recursos}
            onChange={(e) => actualizarCampo('recursos', e.target.value)} />
        </Campo>

        <Campo label="6. Observaciones">
          <AutoTextarea label="6. Observaciones" value={plan.observaciones}
            onChange={(e) => actualizarCampo('observaciones', e.target.value)} />
        </Campo>

        {mensaje && <p className="text-sm text-emerald-600">{mensaje}</p>}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            disabled={guardando}
            onClick={() => guardarBorrador(false)}
            className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-medium px-4 py-2 rounded-md transition disabled:opacity-60"
          >
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
          <button
            disabled={enviando}
            onClick={enviar}
            className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-md transition disabled:opacity-60"
          >
            {enviando ? 'Enviando…' : 'Enviar para revisión'}
          </button>
        </div>
        <p className="text-xs text-slate-400">
          Tus cambios se guardan solos mientras escribes. Al enviar, este borrador se limpia para
          que la próxima vez que generes un plan nuevo el formulario aparezca en blanco.
        </p>
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
