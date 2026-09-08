import { useEffect, useState } from 'react'
import { addDoc, collection, getDocs, orderBy, query, updateDoc, doc as fsDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'

// Hilo de "notas" sobre un plan de trabajo. NO modifica el plan original:
// se guarda como una subcolección aparte (`comisiones/{id}/comentarios`).
// Cuando alguien distinto del dueño del plan agrega una nota, queda marcada
// como no leída para notificar al propietario (se ve como "Nuevo" en su
// dashboard hasta que la abre).
export default function Comentarios({ comisionId, botonFlotante = false }) {
  const { user, perfil } = useAuth()
  const [comentarios, setComentarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [texto, setTexto] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const esPropietario = perfil?.rol === 'presidente' && perfil?.comisionId === comisionId

  const cargar = async () => {
    setCargando(true)
    const snap = await getDocs(
      query(collection(db, 'comisiones', comisionId, 'comentarios'), orderBy('fecha', 'desc'))
    )
    const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    setComentarios(lista)
    setCargando(false)

    // El propietario marca como leídas las notas de otras personas al abrir el hilo.
    if (esPropietario) {
      const noLeidas = lista.filter((c) => c.autorUid !== user.uid && c.leido === false)
      noLeidas.forEach((c) => {
        updateDoc(fsDoc(db, 'comisiones', comisionId, 'comentarios', c.id), { leido: true })
      })
    }
  }

  useEffect(() => {
    if (comisionId) cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comisionId])

  const enviar = async (e) => {
    e.preventDefault()
    if (!texto.trim()) return
    setEnviando(true)
    await addDoc(collection(db, 'comisiones', comisionId, 'comentarios'), {
      texto: texto.trim(),
      autorUid: user.uid,
      autorNombre: perfil?.nombre || perfil?.rol,
      autorRol: perfil?.rol,
      fecha: new Date().toISOString(),
      leido: false,
    })
    setTexto('')
    setMostrarForm(false)
    setEnviando(false)
    await cargar()
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-slate-800">Notas y comentarios</h3>
        {!mostrarForm && (
          <button
            onClick={() => setMostrarForm(true)}
            className={`text-sm font-medium px-3 py-1.5 rounded-md transition ${
              botonFlotante
                ? 'bg-brand-600 hover:bg-brand-700 text-white'
                : 'text-brand-600 hover:underline'
            }`}
          >
            + Añadir nota
          </button>
        )}
      </div>

      {mostrarForm && (
        <form onSubmit={enviar} className="mb-4 space-y-2">
          <textarea
            className="input"
            rows={3}
            placeholder="Escribe una nota para quien lleva este plan…"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={enviando}
              className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-1.5 rounded-md transition disabled:opacity-60"
            >
              {enviando ? 'Enviando…' : 'Enviar nota'}
            </button>
            <button
              type="button"
              onClick={() => { setMostrarForm(false); setTexto('') }}
              className="text-sm text-slate-500 px-3 py-1.5"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {cargando ? (
        <p className="text-sm text-slate-500">Cargando notas…</p>
      ) : comentarios.length === 0 ? (
        <p className="text-sm text-slate-500">Todavía no hay notas en este plan.</p>
      ) : (
        <ul className="space-y-3">
          {comentarios.map((c) => (
            <li key={c.id} className="border border-slate-100 rounded-md p-3 bg-slate-50">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold text-slate-700">
                  {c.autorNombre} <span className="text-xs font-normal text-slate-400">· {c.autorRol}</span>
                </p>
                <p className="text-xs text-slate-400">{new Date(c.fecha).toLocaleString('es-MX')}</p>
              </div>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{c.texto}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
