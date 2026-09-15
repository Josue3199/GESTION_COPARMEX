import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { AREAS, slugify } from '../data/comisiones'
import Layout from '../components/Layout'

const VACIO = { nombreComision: '', area: AREAS[0], presidenteCargo: 'Presidente', presidenteNombre: '' }

// Módulo para crear/editar/borrar "ramas" (comisiones o especialidades) como
// entidades propias, separadas de asignar un presidente a ellas. Antes las
// 25 comisiones solo existían por el botón de "inicializar" o editando
// Firestore a mano; si alguien borraba una por error, no había forma de
// recrearla desde la app. Ahora sí.
export default function AdminRamas() {
  const [comisiones, setComisiones] = useState([])
  const [autorizados, setAutorizados] = useState([])
  const [cargando, setCargando] = useState(true)
  const [editandoId, setEditandoId] = useState(null) // null = creando una nueva
  const [form, setForm] = useState(VACIO)
  const [areaPersonalizada, setAreaPersonalizada] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')

  const cargar = async () => {
    setCargando(true)
    setError('')
    try {
      const [comisionesSnap, autorizadosSnap] = await Promise.all([
        getDocs(collection(db, 'comisiones')),
        getDocs(collection(db, 'presidentesAutorizados')),
      ])
      setComisiones(
        comisionesSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => a.area.localeCompare(b.area) || a.nombreComision.localeCompare(b.nombreComision))
      )
      setAutorizados(autorizadosSnap.docs.map((d) => ({ correo: d.id, ...d.data() })))
    } catch (err) {
      setError(`No se pudo cargar la información (${err.code || err.message}).`)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  const areasExistentes = useMemo(
    () => Array.from(new Set([...AREAS, ...comisiones.map((c) => c.area)])).sort(),
    [comisiones]
  )

  const accesosDe = (comisionId) => autorizados.filter((a) => a.comisionId === comisionId)

  const limpiarForm = () => {
    setEditandoId(null)
    setForm(VACIO)
    setAreaPersonalizada(false)
    setError('')
  }

  const editar = (c) => {
    setEditandoId(c.id)
    setForm({
      nombreComision: c.nombreComision,
      area: c.area,
      presidenteCargo: c.presidenteCargo || 'Presidente',
      presidenteNombre: c.presidenteNombre || '',
    })
    setAreaPersonalizada(!areasExistentes.includes(c.area))
    setMensaje('')
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMensaje('')
    const nombre = form.nombreComision.trim()
    const area = form.area.trim()
    if (!nombre || !area) return

    setGuardando(true)
    try {
      if (editandoId) {
        // Solo actualiza los datos de la rama; el id (slug) no cambia aunque
        // se le corrija el nombre, para no romper accesos ya autorizados.
        await updateDoc(doc(db, 'comisiones', editandoId), {
          nombreComision: nombre,
          area,
          presidenteCargo: form.presidenteCargo.trim() || 'Presidente',
          presidenteNombre: form.presidenteNombre.trim(),
        })
        setMensaje(`"${nombre}" se actualizó correctamente.`)
      } else {
        const id = slugify(nombre)
        const existente = await getDoc(doc(db, 'comisiones', id))
        if (existente.exists()) {
          setError('Ya existe una rama con ese nombre (o un nombre muy parecido). Usa otro nombre o edita la existente abajo.')
          setGuardando(false)
          return
        }
        await setDoc(doc(db, 'comisiones', id), {
          nombreComision: nombre,
          area,
          presidenteCargo: form.presidenteCargo.trim() || 'Presidente',
          presidenteNombre: form.presidenteNombre.trim(),
          estado: 'pendiente',
          plan: null,
        })
        setMensaje(`"${nombre}" se creó correctamente. Ya puedes autorizar un correo para ella en "Accesos".`)
      }
      limpiarForm()
      await cargar()
    } catch (err) {
      setError(`No se pudo guardar (${err.code || err.message}).`)
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async (c) => {
    const accesos = accesosDe(c.id)
    const advertenciaAccesos = accesos.length
      ? `\n\nOjo: hay ${accesos.length} correo(s) autorizado(s) para esta rama (${accesos.map((a) => a.correo).join(', ')}). Si la borras, esos accesos van a dejar de funcionar hasta que los vuelvas a asignar a otra rama desde "Accesos".`
      : ''
    const confirmar = window.confirm(
      `¿Seguro que quieres eliminar "${c.nombreComision}"? Esto borra también su plan de trabajo y su historial. Esta acción no se puede deshacer.${advertenciaAccesos}`
    )
    if (!confirmar) return
    try {
      await deleteDoc(doc(db, 'comisiones', c.id))
      await cargar()
    } catch (err) {
      setError(`No se pudo eliminar (${err.code || err.message}).`)
    }
  }

  return (
    <Layout titulo="Ramas / especialidades">
      <Link to="/admin" className="text-sm text-brand-600 hover:underline mb-4 inline-block">
        ← Volver al panel
      </Link>

      <div className="bg-brand-50 border border-brand-100 text-brand-700 text-sm rounded-md p-3 mb-6">
        Aquí creas y editas las comisiones/ramas en sí (su nombre y área). Esto es un paso
        separado de autorizar a la persona que la va a presidir: primero creas la rama aquí,
        luego vas a "Accesos" y le asignas el correo de Gmail de quien la va a presidir.
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md p-3 mb-6">{error}</div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 h-fit">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-800">
              {editandoId ? 'Editar rama' : 'Crear nueva rama'}
            </h2>
            {editandoId && (
              <button type="button" onClick={limpiarForm} className="text-xs text-slate-500 hover:underline">
                Cancelar edición
              </button>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Nombre de la rama/comisión</label>
            <input
              required
              className="input"
              placeholder="Ej. Innovación Tecnológica"
              value={form.nombreComision}
              onChange={(e) => setForm((f) => ({ ...f, nombreComision: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Área</label>
            {!areaPersonalizada ? (
              <select
                className="input"
                value={form.area}
                onChange={(e) =>
                  e.target.value === '__nueva__'
                    ? (setAreaPersonalizada(true), setForm((f) => ({ ...f, area: '' })))
                    : setForm((f) => ({ ...f, area: e.target.value }))
                }
              >
                {areasExistentes.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
                <option value="__nueva__">+ Nueva área…</option>
              </select>
            ) : (
              <div className="flex gap-2">
                <input
                  required
                  autoFocus
                  className="input"
                  placeholder="Nombre de la nueva área"
                  value={form.area}
                  onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={() => { setAreaPersonalizada(false); setForm((f) => ({ ...f, area: areasExistentes[0] })) }}
                  className="text-xs text-slate-500 px-2 whitespace-nowrap"
                >
                  Usar lista
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Cargo del titular</label>
            <select
              className="input"
              value={form.presidenteCargo}
              onChange={(e) => setForm((f) => ({ ...f, presidenteCargo: e.target.value }))}
            >
              <option value="Presidente">Presidente</option>
              <option value="Presidenta">Presidenta</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Nombre de referencia (opcional)
            </label>
            <input
              className="input"
              placeholder="Se puede dejar en blanco y llenar después"
              value={form.presidenteNombre}
              onChange={(e) => setForm((f) => ({ ...f, presidenteNombre: e.target.value }))}
            />
            <p className="text-xs text-slate-400 mt-1">
              Es solo una etiqueta que se muestra en el panel; no vincula ningún acceso. Para que
              alguien pueda entrar y llenar el plan, autorízala en "Accesos".
            </p>
          </div>

          {mensaje && <p className="text-sm text-emerald-600">{mensaje}</p>}

          <button
            type="submit"
            disabled={guardando}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2 rounded-md transition disabled:opacity-60"
          >
            {guardando ? 'Guardando…' : editandoId ? 'Guardar cambios' : 'Crear rama'}
          </button>
        </form>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-bold text-slate-800 mb-4">Ramas existentes ({comisiones.length})</h2>
          {cargando ? (
            <p className="text-slate-500 text-sm">Cargando…</p>
          ) : comisiones.length === 0 ? (
            <p className="text-slate-500 text-sm">Todavía no hay ninguna rama creada.</p>
          ) : (
            <ul className="divide-y divide-slate-100 max-h-[560px] overflow-y-auto">
              {comisiones.map((c) => (
                <li key={c.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{c.nombreComision}</p>
                    <p className="text-xs text-slate-500">{c.area}</p>
                    <p className="text-xs text-slate-400">
                      {accesosDe(c.id).length
                        ? `${accesosDe(c.id).length} acceso(s) asignado(s)`
                        : 'Sin acceso asignado todavía'}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => editar(c)}
                      className="text-xs font-medium text-brand-600 hover:underline px-2"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => eliminar(c)}
                      className="text-xs font-medium text-rose-600 hover:underline px-2"
                    >
                      Eliminar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Layout>
  )
}
