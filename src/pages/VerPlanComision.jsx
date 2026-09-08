import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import Layout from '../components/Layout'
import PlanVista from '../components/PlanVista'
import Comentarios from '../components/Comentarios'

// Vista de solo lectura (formato "documento / PDF") para que un presidente
// consulte el plan de trabajo de otra comisión. Aquí no hay botones de
// aprobar/rechazar: eso es exclusivo de la administradora. Lo único que un
// presidente puede hacer es dejar una nota (no modifica el plan original).
export default function VerPlanComision() {
  const { id } = useParams()
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

  if (cargando) return <Layout titulo="Cargando…"><p>Cargando…</p></Layout>
  if (!comision) return <Layout titulo="No encontrada"><p>La comisión no existe.</p></Layout>

  return (
    <Layout titulo={comision.nombreComision}>
      <Link to="/comisiones" className="text-sm text-brand-600 hover:underline mb-4 inline-block print:hidden">
        ← Volver al listado
      </Link>

      <PlanVista comision={comision} />

      {comision.plan && (
        <div className="mt-6 print:hidden">
          <Comentarios comisionId={comision.id} botonFlotante />
        </div>
      )}
    </Layout>
  )
}
