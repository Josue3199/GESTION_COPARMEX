import { useLayoutEffect, useRef } from 'react'

// Textarea que crece solo conforme escribes (no tiene límite de caracteres:
// Firestore permite hasta ~1MB por documento, muy por encima de lo que
// alguien escribiría a mano aquí). Así nunca se queda "chiquito" tapando lo
// que ya llevas escrito.
export default function AutoTextarea({ value, onChange, minRows = 3, className = '', ...props }) {
  const ref = useRef(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      rows={minRows}
      className={`input resize-none overflow-hidden ${className}`}
      {...props}
    />
  )
}
