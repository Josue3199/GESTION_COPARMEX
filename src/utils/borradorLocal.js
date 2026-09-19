// Copia local (en este navegador) del plan que el presidente está
// escribiendo. Se guarda al instante en cada tecleo -sin depender de
// internet- para que un refresh o un cierre accidental de la pestaña NUNCA
// borre lo que llevaba escrito. Solo se limpia cuando la persona le da
// "Limpiar plan" y confirma, o cuando envía el plan a revisión.
const clave = (comisionId) => `coparmex:borrador:${comisionId}`

export function leerBorradorLocal(comisionId) {
  try {
    const crudo = localStorage.getItem(clave(comisionId))
    return crudo ? JSON.parse(crudo) : null
  } catch {
    return null // Safari en modo privado, cuota llena, etc.: se ignora en silencio.
  }
}

export function guardarBorradorLocal(comisionId, plan, actualizadoEn) {
  try {
    localStorage.setItem(clave(comisionId), JSON.stringify({ plan, actualizadoEn }))
  } catch {
    // Si falla (ej. modo privado de Safari), el autoguardado a Firestore
    // sigue funcionando como respaldo; simplemente no hay copia local.
  }
}

export function borrarBorradorLocal(comisionId) {
  try {
    localStorage.removeItem(clave(comisionId))
  } catch {
    // No pasa nada si no se pudo borrar; no es un dato sensible.
  }
}
