import { useEffect, useMemo, useState } from 'react'
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'

const CAMPOS = [
  { key: 'nombreDirectorio', label: 'Nombre para mostrar', placeholder: 'Nombre completo' },
  { key: 'correoContacto', label: 'Correo de contacto', placeholder: 'correo@empresa.com', type: 'email' },
  { key: 'telefono', label: 'Teléfono', placeholder: '55 1234 5678', type: 'tel' },
  { key: 'empresa', label: 'Empresa / organización', placeholder: 'Nombre de la empresa' },
  { key: 'puesto', label: 'Puesto profesional', placeholder: 'Dirección general, fundador…' },
  { key: 'linkedin', label: 'LinkedIn (opcional)', placeholder: 'https://linkedin.com/in/…', type: 'url' },
]

const limpiar = (v = '') => String(v ?? '').trim()
const csvCell = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`

export default function Directorio() {
  const { user, perfil } = useAuth()
  const [presidentes, setPresidentes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroArea, setFiltroArea] = useState('todas')
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({})
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')

  const esAdmin = perfil?.rol === 'admin' || perfil?.rol === 'directora'
  const miCorreo = (user?.email || perfil?.correo || '').toLowerCase()

  const cargar = async () => {
    setCargando(true)
    setError('')
    try {
      const [autSnap, comSnap] = await Promise.all([
        getDocs(collection(db, 'presidentesAutorizados')),
        getDocs(collection(db, 'comisiones')),
      ])
      const coms = comSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
      const porId = Object.fromEntries(coms.map((c) => [c.id, c]))
      const lista = autSnap.docs
        .map((d) => {
          const a = d.data()
          const com = porId[a.comisionId] || {}
          return {
            id: d.id,
            ...a,
            correoLogin: d.id,
            nombreMostrar: limpiar(a.nombreDirectorio || a.nombre || 'Presidente de comisión'),
            correoMostrar: limpiar(a.correoContacto || d.id),
            comision: com.nombreComision || 'Comisión por confirmar',
            area: com.area || 'Área por confirmar',
          }
        })
        .filter((p) => (p.rol || 'presidente') === 'presidente')
        .sort((a, b) => a.nombreMostrar.localeCompare(b.nombreMostrar, 'es'))
      setPresidentes(lista)
    } catch (e) {
      console.error(e)
      setError('No se pudo cargar el directorio. Verifica la conexión y las reglas de Firestore.')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const areas = useMemo(() => [...new Set(presidentes.map((p) => p.area).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')), [presidentes])
  const visibles = useMemo(() => presidentes.filter((p) => {
    const texto = `${p.nombreMostrar} ${p.comision} ${p.area} ${p.correoMostrar} ${p.telefono || ''} ${p.empresa || ''} ${p.puesto || ''}`.toLowerCase()
    return texto.includes(busqueda.toLowerCase()) && (filtroArea === 'todas' || p.area === filtroArea)
  }), [presidentes, busqueda, filtroArea])

  const abrirEdicion = (p) => {
    setEditando(p)
    setMensaje('')
    setError('')
    setForm({
      nombreDirectorio: p.nombreDirectorio || p.nombre || '',
      correoContacto: p.correoContacto || p.id,
      telefono: p.telefono || '',
      empresa: p.empresa || '',
      puesto: p.puesto || '',
      linkedin: p.linkedin || '',
    })
  }

  const guardar = async (e) => {
    e.preventDefault()
    if (!editando) return
    setGuardando(true)
    setError('')
    setMensaje('')
    try {
      const actual = editando.id.toLowerCase() === miCorreo
      if (!esAdmin && !actual) throw new Error('Solo puedes modificar tu propia información de contacto.')
      if (form.correoContacto && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correoContacto.trim())) {
        throw new Error('Escribe un correo de contacto válido.')
      }
      const cambios = Object.fromEntries(CAMPOS.map(({ key }) => [key, limpiar(form[key])]))
      cambios.actualizadoEn = new Date().toISOString()
      await updateDoc(doc(db, 'presidentesAutorizados', editando.id), cambios)
      setMensaje('Información guardada y actualizada para todos los usuarios del directorio.')
      await cargar()
      setEditando(null)
    } catch (e2) {
      setError(e2.message || 'No se pudo guardar la información. Revisa los permisos de Firestore.')
    } finally {
      setGuardando(false)
    }
  }

  const descargarExcel = () => {
    const filas = [
      ['Nombre', 'Cargo', 'Comisión', 'Área', 'Correo de contacto', 'Teléfono', 'Empresa / organización', 'Puesto profesional', 'LinkedIn'],
      ...visibles.map((p) => [p.nombreMostrar, p.cargo || 'Presidente', p.comision, p.area, p.correoMostrar, p.telefono || '', p.empresa || '', p.puesto || '', p.linkedin || '']),
    ]
    const contenido = '\ufeff' + filas.map((f) => f.map(csvCell).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([contenido], { type: 'text/csv;charset=utf-8;' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'Directorio_Presidentes_COPARMEX.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const descargarPdf = () => window.print()

  return (
    <Layout titulo="Directorio de presidentes">
      <style>{`@media print { @page { size: landscape; margin: 12mm; } body { background: white !important; } .no-print { display: none !important; } .directorio-grid { display: grid !important; grid-template-columns: repeat(2,minmax(0,1fr)) !important; gap: 8px !important; } .directorio-card { break-inside: avoid; box-shadow: none !important; border: 1px solid #cbd5e1 !important; } main { max-width: none !important; padding: 0 !important; } }`}</style>
      <section className="mb-6 rounded-2xl bg-gradient-to-r from-blue-950 via-blue-900 to-blue-700 p-6 text-white shadow-sm print:bg-white print:text-slate-900 print:border print:border-slate-300">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <p className="text-xs uppercase tracking-[.2em] text-blue-200 print:text-slate-500">COPARMEX · Comisiones de trabajo</p>
            <h2 className="mt-2 text-2xl md:text-3xl font-bold">Directorio de presidentes</h2>
            <p className="mt-2 max-w-2xl text-sm text-blue-100 print:text-slate-600">Encuentra los datos de contacto de los presidentes, conecta con otras comisiones y mantén la información actualizada.</p>
          </div>
          <div className="no-print flex flex-wrap gap-2">
            <button onClick={descargarExcel} className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-blue-950 hover:bg-blue-50">▦ Descargar Excel</button>
            <button onClick={descargarPdf} className="rounded-lg border border-white/40 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20">▤ Descargar PDF</button>
          </div>
        </div>
      </section>

      <div className="no-print mb-5 grid gap-3 md:grid-cols-[1fr_260px]">
        <label className="relative block">
          <span className="sr-only">Buscar presidente</span>
          <span className="absolute left-3 top-2.5 text-slate-400">⌕</span>
          <input className="input !rounded-xl !py-2.5 !pl-9" placeholder="Buscar por nombre, comisión, área o empresa…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </label>
        <select className="input !rounded-xl !py-2.5" value={filtroArea} onChange={(e) => setFiltroArea(e.target.value)}>
          <option value="todas">Todas las áreas</option>
          {areas.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="mb-4 flex items-center justify-between text-sm text-slate-500">
        <span>{cargando ? 'Cargando directorio…' : `${visibles.length} ${visibles.length === 1 ? 'presidente' : 'presidentes'}`}</span>
        <span className="hidden sm:inline">Los cambios guardados se reflejan para todos los usuarios.</span>
      </div>

      {cargando ? <div className="rounded-xl border bg-white p-8 text-center text-slate-500">Cargando contactos…</div> : visibles.length === 0 ? <div className="rounded-xl border border-dashed bg-white p-10 text-center text-slate-500">No hay contactos que coincidan con la búsqueda.</div> : (
        <div className="directorio-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibles.map((p) => {
            const puedeEditar = esAdmin || p.id.toLowerCase() === miCorreo
            const iniciales = p.nombreMostrar.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase()
            return <article key={p.id} className="directorio-card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-900 ring-4 ring-blue-50">{iniciales || 'CP'}</div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold leading-snug text-slate-900">{p.nombreMostrar}</h3>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-blue-700">{p.cargo || 'Presidente'}</p>
                </div>
                {puedeEditar && <button className="no-print rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-700" onClick={() => abrirEdicion(p)}>✎ Editar</button>}
              </div>
              <div className="mt-4 rounded-xl bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-800">{p.comision}</p>
                <p className="mt-1 text-xs text-slate-500">Área · {p.area}</p>
                {p.empresa && <p className="mt-2 text-sm text-slate-600">{p.empresa}{p.puesto ? ` · ${p.puesto}` : ''}</p>}
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <a className="flex min-w-0 items-center gap-2 break-all text-blue-700 hover:underline" href={`mailto:${p.correoMostrar}`}><span aria-hidden="true">✉</span><span>{p.correoMostrar}</span></a>
                {p.telefono ? <a className="flex items-center gap-2 text-slate-700 hover:text-blue-700" href={`tel:${p.telefono.replace(/[^+\d]/g, '')}`}><span aria-hidden="true">☎</span>{p.telefono}</a> : <p className="text-xs text-slate-400">Teléfono no registrado</p>}
                {p.linkedin && <a className="inline-flex text-xs text-blue-700 hover:underline" href={p.linkedin} target="_blank" rel="noreferrer">Ver perfil de LinkedIn ↗</a>}
              </div>
              <div className="no-print mt-4 flex gap-2 border-t border-slate-100 pt-4">
                <a href={`mailto:${p.correoMostrar}`} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">✉ Correo</a>
                {p.telefono ? <a href={`tel:${p.telefono.replace(/[^+\d]/g, '')}`} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">☎ Llamar</a> : <button disabled className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-400">☎ Sin teléfono</button>}
              </div>
            </article>
          })}
        </div>
      )}

      {editando && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="editar-directorio-titulo">
          <form onSubmit={guardar} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div><p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Directorio COPARMEX</p><h2 id="editar-directorio-titulo" className="mt-1 text-xl font-bold text-slate-900">Editar información de contacto</h2><p className="mt-1 text-sm text-slate-500">{editando.nombreMostrar} · {editando.comision}</p></div>
              <button type="button" onClick={() => setEditando(null)} className="rounded-lg px-3 py-1 text-xl text-slate-500 hover:bg-slate-100" aria-label="Cerrar">×</button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {CAMPOS.map((campo) => <label key={campo.key} className={campo.key === 'linkedin' ? 'sm:col-span-2' : ''}><span className="mb-1 block text-sm font-medium text-slate-700">{campo.label}</span><input className="input" type={campo.type || 'text'} placeholder={campo.placeholder} value={form[campo.key] || ''} onChange={(e) => setForm((prev) => ({ ...prev, [campo.key]: e.target.value }))} /></label>)}
            </div>
            <p className="mt-4 rounded-lg bg-blue-50 p-3 text-xs leading-relaxed text-blue-800">La información guardada se comparte con todos los usuarios del directorio. El correo de inicio de sesión y la comisión asignada no se modifican desde este formulario.</p>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setEditando(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancelar</button><button disabled={guardando} type="submit" className="rounded-lg bg-blue-700 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">{guardando ? 'Guardando…' : 'Guardar cambios'}</button></div>
          </form>
        </div>
      )}
    </Layout>
  )
}
