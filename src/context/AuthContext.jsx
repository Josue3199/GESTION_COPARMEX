import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db, googleProvider } from '../firebase/config'

const AuthContext = createContext(null)

// Si el correo de Google fue autorizado previamente, crea el perfil en
// usuarios/{uid}. Esto permite que el primer acceso no tenga que crear
// manualmente el UID en Firestore.
async function autoRegistrarSiEstaAutorizado(firebaseUser) {
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

  await setDoc(doc(db, 'usuarios', firebaseUser.uid), nuevoPerfil)
  return nuevoPerfil
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [noAutorizado, setNoAutorizado] = useState(false)
  const [errorLogin, setErrorLogin] = useState('')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
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

        if (snap.exists()) {
          setPerfil(snap.data())
          return
        }

        const perfilAuto = await autoRegistrarSiEstaAutorizado(firebaseUser)
        if (perfilAuto) {
          setPerfil(perfilAuto)
        } else {
          setNoAutorizado(true)
        }
      } catch (err) {
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
        setCargando(false)
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
