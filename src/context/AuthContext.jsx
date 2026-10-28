import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db, googleProvider } from '../firebase/config'

const AuthContext = createContext(null)

// ¿El perfil guardado ya coincide con lo autorizado por el admin?
function perfilCoincide(actual, nuevo) {
  if (!actual) return false
  return (
    actual.rol === nuevo.rol &&
    actual.nombre === nuevo.nombre &&
    actual.correo === nuevo.correo &&
    (nuevo.comisionId === undefined || actual.comisionId === nuevo.comisionId)
  )
}

// Si el correo de Google fue autorizado previamente, crea o sincroniza el
// perfil en usuarios/{uid}. Recibe el perfil actual (o null si no existe)
// para NO escribir cuando nada cambió: antes se hacía un setDoc en cada
// login y, al ser un update sobre un documento ya existente, las reglas lo
// rechazaban para todos los que no fueran admin.
async function autoRegistrarSiEstaAutorizado(firebaseUser, perfilActual) {
  const correo = (firebaseUser.email || '').trim().toLowerCase()
  if (!correo) return null

  const autSnap = await getDoc(doc(db, 'presidentesAutorizados', correo))
  if (!autSnap.exists()) return null

  const autorizacion = autSnap.data()
  const rol = autorizacion.rol || 'presidente'

  if (rol === 'presidente' && !autorizacion.comisionId) {
    throw new Error('La autorización existe, pero no tiene comisionId.')
  }

  const nuevoPerfil = {
    rol,
    nombre: autorizacion.nombre || firebaseUser.displayName || correo,
    correo,
    ...(rol === 'presidente' ? { comisionId: autorizacion.comisionId } : {}),
  }

  if (perfilCoincide(perfilActual, nuevoPerfil)) return perfilActual

  // merge conserva otros campos del perfil que no administra este módulo.
  await setDoc(doc(db, 'usuarios', firebaseUser.uid), nuevoPerfil, { merge: true })
  return { ...(perfilActual || {}), ...nuevoPerfil }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [noAutorizado, setNoAutorizado] = useState(false)
  const [errorLogin, setErrorLogin] = useState('')

  useEffect(() => {
    // Evita que una resolución lenta de un inicio de sesión anterior pise
    // el estado de uno más reciente (o de un logout).
    let versionActual = 0

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      const version = ++versionActual
      const vigente = () => version === versionActual

      setCargando(true)
      setUser(firebaseUser)
      setPerfil(null)
      setNoAutorizado(false)
      setErrorLogin('')

      if (!firebaseUser) {
        setCargando(false)
        return
      }

      try {
        const ref = doc(db, 'usuarios', firebaseUser.uid)
        const snap = await getDoc(ref)
        const perfilActual = snap.exists() ? snap.data() : null

        // La autorización es la fuente de verdad para el nombre, rol y comisión.
        // Si el admin reasignó esta cuenta, el perfil existente se sincroniza al
        // volver a iniciar sesión. Los perfiles administrativos sin documento
        // en presidentesAutorizados conservan su perfil actual.
        const perfilAuto = await autoRegistrarSiEstaAutorizado(firebaseUser, perfilActual)
        if (!vigente()) return
        if (perfilAuto) {
          setPerfil(perfilAuto)
        } else if (perfilActual) {
          setPerfil(perfilActual)
        } else {
          setNoAutorizado(true)
        }
      } catch (err) {
        if (!vigente()) return
        console.error('Error resolviendo perfil después del login:', err)
        const codigo = err?.code || ''
        if (codigo === 'permission-denied') {
          setErrorLogin(
            'Google sí inició sesión, pero Firestore rechazó la lectura/creación del perfil. Publica las reglas de firestore.rules y vuelve a intentar.'
          )
        } else {
          setErrorLogin(
            `Google sí inició sesión, pero no se pudo cargar tu perfil${codigo ? ` (${codigo})` : ''}.`
          )
        }
      } finally {
        if (vigente()) setCargando(false)
      }
    })

    return unsub
  }, [])

  const loginConGoogle = () => signInWithPopup(auth, googleProvider)
  const logout = () => signOut(auth)

  return (
    <AuthContext.Provider
      value={{
        user,
        perfil,
        cargando,
        noAutorizado,
        errorLogin,
        setErrorLogin,
        loginConGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
