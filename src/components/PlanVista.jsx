import { ESTADOS } from '../data/comisiones'
import logoCoparmex from '../assets/logo-coparmex.jpg'

// Vista "de documento / impresión" de un plan de trabajo. Se usa tanto para
// que la directora revise un plan como para que cualquier presidente
// consulte el plan de otra comisión: en ambos casos se ve igual a una hoja
// lista para imprimir o guardar como PDF (Ctrl+P / Cmd+P -> "Guardar PDF").
export default function PlanVista({ comision, acciones, extra }) {
  const plan = comision.plan
  const estado = ESTADOS[comision.estado] || ESTADOS.pendiente

  const imprimir = () => window.print()

  if (!plan) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
        Esta comisión aún no ha subido su plan de trabajo.
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 print:hidden">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${estado.color}`}>
          {estado.texto}
        </span>
        <div className="flex items-center gap-2">
          {extra}
          <button
            onClick={imprimir}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-600 border border-slate-300 hover:bg-slate-50 px-3 py-1.5 rounded-md transition"
          >
            🖨️ Imprimir / Descargar PDF
          </button>
        </div>
      </div>

      {/* Documento tipo hoja impresa */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm print:shadow-none print:border-0 print:rounded-none p-6 sm:p-10 print:p-0 font-serif text-slate-800">
        <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4 mb-6">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-500">
              COPARMEX · Comisiones de Trabajo
            </p>
            <h1 className="text-2xl font-bold mt-1">{comision.nombreComision}</h1>
            <p className="text-sm text-slate-600 mt-1">{comision.area}</p>
          </div>
          <img src={logoCoparmex} alt="COPARMEX" className="h-14 w-auto object-contain" />
        </div>

        <div className="grid sm:grid-cols-2 gap-2 text-sm mb-8">
          <p><span className="font-semibold">{comision.presidenteCargo}:</span> {comision.presidenteNombre}</p>
          <p><span className="font-semibold">Estado:</span> {estado.texto}</p>
        </div>

        <div className="space-y-6">
          <CampoDoc numero="1" titulo="Objetivo general" texto={plan.objetivoGeneral} />
          <CampoDoc numero="2" titulo="Objetivos específicos" texto={plan.objetivosEspecificos} />

          <div>
            <p className="font-bold mb-2">3. Actividades / proyectos</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 text-left">
                    <th className="border border-slate-300 py-1.5 px-2">Actividad</th>
                    <th className="border border-slate-300 py-1.5 px-2">Objetivo</th>
                    <th className="border border-slate-300 py-1.5 px-2">Responsable</th>
                    <th className="border border-slate-300 py-1.5 px-2">Fecha</th>
                    <th className="border border-slate-300 py-1.5 px-2">Indicador</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.actividades?.map((a, i) => (
                    <tr key={i}>
                      <td className="border border-slate-300 py-1.5 px-2">{a.actividad || '—'}</td>
                      <td className="border border-slate-300 py-1.5 px-2">{a.objetivo || '—'}</td>
                      <td className="border border-slate-300 py-1.5 px-2">{a.responsable || '—'}</td>
                      <td className="border border-slate-300 py-1.5 px-2">{a.fecha || '—'}</td>
                      <td className="border border-slate-300 py-1.5 px-2">{a.indicador || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <CampoDoc numero="4" titulo="Metas" texto={plan.metas} />
          <CampoDoc numero="5" titulo="Recursos necesarios" texto={plan.recursos} />
          <CampoDoc numero="6" titulo="Observaciones" texto={plan.observaciones} />
        </div>
      </div>

      {acciones && <div className="flex flex-wrap gap-3 pt-4 print:hidden">{acciones}</div>}
    </div>
  )
}

function CampoDoc({ numero, titulo, texto }) {
  return (
    <div>
      <p className="font-bold mb-1">{numero}. {titulo}</p>
      <p className="text-sm whitespace-pre-wrap leading-relaxed">{texto || '—'}</p>
    </div>
  )
}
