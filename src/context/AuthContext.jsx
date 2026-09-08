import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db, googleProvider } from '../firebase/config'

const AuthContext = createContext(null)

// Si el correo de Google con el que entró la persona fue autorizado antes
// (colección `presidentesAutorizados`, que guarda accesos de presidente Y
// de directora), se crea aquí mismo su documento en `usuarios` la
// primera vez que inicia sesión. Solo el rol "admin" puede dar de alta
// estas autorizaciones (ver AdminPresidentes.jsx).
async function autoRegistrarSiEstaAutorizado(firebaseUser) {
  const correo = (firebaseUser.email || '').toLowerCase()
  if (!correo) return null

  const autSnap = await getDoc(doc(db, 'presidentesAutorizados', correo))
  if (!autSnap.exists()) return null

  const autorizacion = autSnap.data()
  const rol = autorizacion.rol || 'presidente' // compatibilidad con autorizaciones viejas
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
  const [user, setUser] = useState(null) // Firebase auth user
  const [perfil, setPerfil] = useState(null) // { rol, comisionId, nombre, correo }
  const [cargando, setCargando] = useState(true)
  // true cuando la persona ya entró con Google pero su correo no fue
  // autorizado (no tiene usuario ni está en `presidentesAutorizados`).
  const [noAutorizado, setNoAutorizado] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      setNoAutorizado(false)

      if (firebaseUser) {
        const ref = doc(db, 'usuarios', firebaseUser.uid)
        const snap = await getDoc(ref)

        if (snap.exists()) {
          setPerfil(snap.data())
        } else {
          const perfilAuto = await autoRegistrarSiEstaAutorizado(firebaseUser)
          if (perfilAuto) {
            setPerfil(perfilAuto)
          } else {
            setPerfil(null)
            setNoAutorizado(true)
          }
        }
      } else {
        setPerfil(null)
      }
      setCargando(false)
    })
    return unsub
  }, [])

  const loginConGoogle = () => signInWithPopup(auth, googleProvider)
  const logout = () => signOut(auth)

  return (
    <AuthContext.Provider value={{ user, perfil, cargando, noAutorizado, loginConGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
