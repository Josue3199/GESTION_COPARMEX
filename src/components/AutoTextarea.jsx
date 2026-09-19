import { useEffect, useLayoutEffect, useRef, useState } from 'react'

// Textarea que crece sola conforme escribes (sin límite de caracteres:
// Firestore permite hasta ~1MB por documento, muy por encima de lo que
// alguien escribiría a mano aquí). Además tiene un botón para "expandir" a
// una ventana grande, por si el presidente quiere escribir mucho y ver todo
// más cómodo, sin que el cajón chiquito se sienta apretado.
export default function AutoTextarea({ value, onChange, minRows = 3, className = '', label, ...props }) {
  const ref = useRef(null)
  const refModal = useRef(null)
  const [expandido, setExpandido] = useState(false)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || expandido) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value, expandido])

  // Cerrar la ventana grande con Escape, como cualquier diálogo.
  useEffect(() => {
    if (!expandido) return
    const onKeyDown = (e) => e.key === 'Escape' && setExpandido(false)
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [expandido])

  useEffect(() => {
    if (expandido) refModal.current?.focus()
  }, [expandido])

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        onChange={onChange}
        rows={minRows}
        className={`input resize-none overflow-hidden pr-8 ${className}`}
        {...props}
      />
      <button
        type="button"
        onClick={() => setExpandido(true)}
        title="Expandir para escribir más cómodo"
        className="absolute top-2 right-2 text-slate-400 hover:text-brand-600 hover:bg-slate-100 rounded p-1 transition"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M9 3H3v6M15 3h6v6M21 15v6h-6M3 15v6h6" />
        </svg>
      </button>

      {expandido && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 print:hidden"
          onClick={() => setExpandido(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-2xl h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
              <p className="font-semibold text-slate-800">{label || 'Escribir'}</p>
              <button
                type="button"
                onClick={() => setExpandido(false)}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none px-1"
              >
                ✕
              </button>
            </div>
            <textarea
              ref={refModal}
              value={value}
              onChange={onChange}
              className="flex-1 w-full p-5 text-base resize-none focus:outline-none rounded-b-xl"
              {...props}
            />
            <div className="px-5 py-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setExpandido(false)}
                className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-md transition"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
