import { useCallback, useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase/config'

// Fuente única de verdad para saber QUIÉN preside cada comisión: las cuentas
// registradas en `presidentesAutorizados` (nombre + comisionId), que es lo
// que el admin captura en "Accesos y roles". Ya no se usa el nombre que venía
// escrito en el código (`presidenteNombre` en el documento de la comisión).
export function usePresidentes() {
  const [accesos, setAccesos] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let vivo = true
    getDocs(collection(db, 'presidentesAutorizados'))
      .then((snap) => {
        if (!vivo) return
        setAccesos(
          snap.docs
            .map((d) => ({ correo: d.id, ...d.data() }))
            .filter((a) => (a.rol || 'presidente') === 'presidente' && a.comisionId)
        )
      })
      .catch((err) => console.error('No se pudieron cargar los presidentes:', err))
      .finally(() => vivo && setCargando(false))
    return () => {
      vivo = false
    }
  }, [])

  const accesosDe = useCallback(
    (comisionId) => accesos.filter((a) => a.comisionId === comisionId),
    [accesos]
  )

  // Nombre(s) de la(s) cuenta(s) asignada(s) a la comisión.
  const nombreDe = useCallback(
    (comisionId) => {
      const nombres = accesosDe(comisionId)
        .map((a) => (a.nombre || '').trim())
        .filter(Boolean)
      if (nombres.length) return nombres.join(' · ')
      return cargando ? '' : 'Sin presidente asignado'
    },
    [accesosDe, cargando]
  )

  // "Presidente" / "Presidenta": se toma de la cuenta; si no lo tiene, "Presidente".
  const cargoDe = useCallback(
    (comisionId) => accesosDe(comisionId).find((a) => a.cargo)?.cargo || 'Presidente',
    [accesosDe]
  )

  return { accesos, accesosDe, nombreDe, cargoDe, cargando }
}
