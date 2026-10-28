import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { addDoc, collection, deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { PLAN_VACIO, ESTADOS } from '../data/comisiones'
import Layout from '../components/Layout'
import AutoTextarea from '../components/AutoTextarea'
import { usePresidentes } from '../utils/presidentes'
import { leerBorradorLocal, guardarBorradorLocal, borrarBorradorLocal } from '../utils/borradorLocal'

const borradorRef = (comisionId) => doc(db, 'comisiones', comisionId, 'borrador', 'actual')

export default function EditorPlan() {
  const { perfil } = useAuth()
  const { nombreDe, cargoDe } = usePresidentes()
  const location = useLocation()
  const navigate = useNavigate()
  // El modo se lee UNA sola vez al montar ('nuevo' | 'borrador'). Antes se
  // leía de location.state en cada render, y como ese estado sobrevive a un
  // refresh (F5), recargar la página en "nuevo" borraba lo que ya se había
  // escrito.
  const modoInicial = useRef(location.state?.modo)

  const [comision, setComision] = useState(null)
  const [plan, setPlan] = useState(PLAN_VACIO)
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [ultimoGuardado, setUltimoGuardado] = useState(null)

  const debounceRef = useRef(null)
  const planActualRef = useRef(plan)
  planActualRef.current = plan
  // Solo se guarda (local o remoto) si la persona realmente editó algo.
  // Antes, con solo abrir el editor se creaba un "borrador fantasma" que el
  // panel admin contaba como "plan sin enviar".
  const sucioRef = useRef(false)
  // Evita que el guardado-al-salir o un autoguardado en vuelo resuciten el
  // borrador justo después de limpiarlo o enviarlo.
  const yaResueltoRef = useRef(false)

  useEffect(() => {
    let vivo = true
    const cargar = async () => {
      if (!perfil?.comisionId) {
        // Sin comisión asignada: se muestra el aviso en vez de quedarse en "Cargando…".
        setCargando(false)
        return
      }
      try {
        const snap = await getDoc(doc(db, 'comisiones', perfil.comisionId))
        if (!vivo) return
        if (snap.exists()) setComision({ id: snap.id, ...snap.data() })

        if (modoInicial.current === 'nuevo') {
          borrarBorradorLocal(perfil.comisionId)
          setPlan(PLAN_VACIO)
          // Ya se consumió el modo "nuevo": si la persona refresca, debe
          // recuperar su borrador, no empezar en blanco otra vez.
          modoInicial.current = 'borrador'
          navigate(location.pathname, { replace: true, state: { modo: 'borrador' } })
        } else {
          // La copia local (guardada al instante en cada tecleo) es más
          // confiable que la de Firestore para recuperar exactamente lo
          // último que se escribió, así que se prefiere si existe.
          const local = leerBorradorLocal(perfil.comisionId)
          let remoto = null
          try {
            const bSnap = await getDoc(borradorRef(perfil.comisionId))
            remoto = bSnap.exists() ? bSnap.data() : null
          } catch (e) {
            console.error('No se pudo leer el borrador remoto:', e)
          }
          if (!vivo) return

          const masReciente =
            local && (!remoto || new Date(local.actualizadoEn) >= new Date(remoto.actualizadoEn))
              ? local
              : remoto

          if (masReciente?.plan) {
            setPlan(masReciente.plan)
            setUltimoGuardado(masReciente.actualizadoEn)
          } else {
            setPlan(PLAN_VACIO)
          }
        }
      } catch (err) {
        console.error('Error cargando el editor del plan:', err)
        if (vivo) setErrorCarga('No se pudo cargar tu plan. Revisa tu conexión e intenta de nuevo.')
      } finally {
        if (vivo) setCargando(false)
      }
    }
    cargar()
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil])

  const guardarBorrador = async (silencioso = false) => {
    if (!comision || yaResueltoRef.current) return
    if (!silencioso) setGuardando(true)
    const fecha = new Date().toISOString()
    try {
      await setDoc(borradorRef(comision.id), { plan: planActualRef.current, actualizadoEn: fecha })
      await updateDoc(doc(db, 'comisiones', comision.id), {
        tieneBorrador: true,
        borradorActualizadoEn: fecha,
      })
      sucioRef.current = false
      setUltimoGuardado(fecha)
      if (!silencioso) {
        setError('')
        setMensaje('Cambios guardados.')
      }
    } catch (err) {
      console.error('Error guardando borrador:', err)
      if (!silencioso) {
        setMensaje('')
        setError('No se pudo guardar. Revisa tu conexión e intenta de nuevo.')
      }
    } finally {
      if (!silencioso) setGuardando(false)
    }
  }

  // Cualquier edición pasa por aquí: marca el plan como modificado.
  const editarPlan = (fn) => {
    sucioRef.current = true
    setPlan(fn)
  }

  // Copia local instantánea: se guarda en cada cambio (sin esperar los 2s
  // del autoguardado a Firestore), para que ni un cierre inmediato de la
  // pestaña pierda lo que se llevaba escrito. Solo si hubo ediciones.
  useEffect(() => {
    if (cargando || !comision || !sucioRef.current || yaResueltoRef.current) return
    guardarBorradorLocal(comision.id, plan, new Date().toISOString())
  }, [plan, cargando, comision])

  // Autoguardado: 2s después de que la persona deja de escribir.
  useEffect(() => {
    if (cargando || !comision || !sucioRef.current) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => guardarBorrador(true), 2000)
    return () => clearTimeout(debounceRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan])

  // Guardado al salir de esta pantalla (cambiar de página, cerrar sesión,
  // etc.), solo si quedaron cambios sin guardar.
  useEffect(() => {
    return () => {
      if (comision && sucioRef.current && !yaResueltoRef.current) guardarBorrador(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comision])

  const actualizarCampo = (campo, valor) => editarPlan((p) => ({ ...p, [campo]: valor }))

  const actualizarActividad = (i, campo, valor) => {
    editarPlan((p) => {
      const actividades = [...p.actividades]
      actividades[i] = { ...actividades[i], [campo]: valor }
      return { ...p, actividades }
    })
  }

  const agregarActividad = () =>
    editarPlan((p) => ({
      ...p,
      actividades: [...p.actividades, { actividad: '', objetivo: '', responsable: '', fecha: '', indicador: '' }],
    }))

  const quitarActividad = (i) =>
    editarPlan((p) => ({ ...p, actividades: p.actividades.filter((_, idx) => idx !== i) }))

  const limpiarPlan = () => {
    if (!window.confirm('¿Seguro que quieres limpiar el formulario? Se borrará todo lo escrito, incluyendo la copia guardada en este navegador.')) return
    editarPlan(() => PLAN_VACIO)
    setError('')
    setMensaje('Formulario limpiado. No olvides guardar o enviar cuando termines.')
  }

  // Un plan se puede enviar solo si tiene lo mínimo para revisarse.
  const validarParaEnviar = () => {
    if (!plan.objetivoGeneral.trim()) return 'Escribe al menos el objetivo general antes de enviar.'
    if (!plan.actividades.some((a) => a.actividad.trim()))
      return 'Agrega al menos una actividad antes de enviar.'
    return ''
  }

  const enviar = async () => {
    const problema = validarParaEnviar()
    if (problema) {
      setMensaje('')
      setError(problema)
      return
    }

    setEnviando(true)
    setMensaje('')
    setError('')
    // Se frena cualquier autoguardado pendiente o en vuelo: no debe volver a
    // marcar "tieneBorrador" después de enviar.
    clearTimeout(debounceRef.current)
    yaResueltoRef.current = true
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
      await deleteDoc(borradorRef(comision.id)).catch(() => {})
      borrarBorradorLocal(comision.id)
      sucioRef.current = false
      navigate('/mi-comision', { state: { enviado: true } })
    } catch (err) {
      console.error('Error enviando plan:', err)
      yaResueltoRef.current = false
      setError('No se pudo enviar el plan. Intenta de nuevo.')
      setEnviando(false)
    }
  }

  if (cargando) return <Layout titulo="Cargando…"><p>Cargando…</p></Layout>
  if (errorCarga)
    return (
      <Layout titulo="Mi plan">
        <p className="text-red-600 text-sm">{errorCarga}</p>
      </Layout>
    )
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
            {cargoDe(comision.id)}: {nombreDe(comision.id) || perfil?.nombre}
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
        {error && <p className="text-sm text-red-600">{error}</p>}

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
