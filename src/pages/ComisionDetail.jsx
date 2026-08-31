import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import Layout from '../components/Layout'

export default function ComisionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [comision, setComision] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const cargar = async () => {
      const snap = await getDoc(doc(db, 'comisiones', id))
      if (snap.exists()) setComision({ id: snap.id, ...snap.data() })
      setCargando(false)
    }
    cargar()
  }, [id])

  const aprobar = async () => {
    await updateDoc(doc(db, 'comisiones', id), { estado: 'aprobado' })
    setComision((c) => ({ ...c, estado: 'aprobado' }))
  }

  const regresarARevision = async () => {
    await updateDoc(doc(db, 'comisiones', id), { estado: 'en_revision' })
    setComision((c) => ({ ...c, estado: 'en_revision' }))
  }

  if (cargando) return <Layout titulo="Cargando…"><p>Cargando…</p></Layout>
  if (!comision) return <Layout titulo="No encontrada"><p>La comisión no existe.</p></Layout>

  const plan = comision.plan

  return (
    <Layout titulo={comision.nombreComision}>
      <Link to="/admin" className="text-sm text-brand-600 hover:underline mb-4 inline-block">
        ← Volver al panel
      </Link>

      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
        <p className="text-sm text-slate-500">{comision.area}</p>
        <h2 className="text-lg font-bold text-slate-800">{comision.nombreComision}</h2>
        <p className="text-sm text-slate-600">
          {comision.presidenteCargo}: {comision.presidenteNombre}
        </p>
      </div>

      {!plan ? (
        <p className="text-slate-500">Esta comisión aún no ha subido su plan de trabajo.</p>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <Campo titulo="Objetivo general" texto={plan.objetivoGeneral} />
          <Campo titulo="Objetivos específicos" texto={plan.objetivosEspecificos} />

          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">Actividades / proyectos</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200">
                    <th className="py-1 pr-2">Actividad</th>
                    <th className="py-1 pr-2">Objetivo</th>
                    <th className="py-1 pr-2">Responsable</th>
                    <th className="py-1 pr-2">Fecha</th>
                    <th className="py-1 pr-2">Indicador</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.actividades?.map((a, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="py-1 pr-2">{a.actividad}</td>
                      <td className="py-1 pr-2">{a.objetivo}</td>
                      <td className="py-1 pr-2">{a.responsable}</td>
                      <td className="py-1 pr-2">{a.fecha}</td>
                      <td className="py-1 pr-2">{a.indicador}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Campo titulo="Metas" texto={plan.metas} />
          <Campo titulo="Recursos necesarios" texto={plan.recursos} />
          <Campo titulo="Observaciones" texto={plan.observaciones} />

          <div className="flex gap-3 pt-2">
            {comision.estado !== 'aprobado' && (
              <button
                onClick={aprobar}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-md transition"
              >
                Aprobar plan
              </button>
            )}
            {comision.estado === 'aprobado' && (
              <button
                onClick={regresarARevision}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-medium px-4 py-2 rounded-md transition"
              >
                Regresar a revisión
              </button>
            )}
          </div>
        </div>
      )}
    </Layout>
  )
}

function Campo({ titulo, texto }) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-700">{titulo}</p>
      <p className="text-sm text-slate-600 whitespace-pre-wrap">{texto || '—'}</p>
    </div>
  )
}
