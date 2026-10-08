// Catálogo base de comisiones (solo nombre y área). Se usa únicamente para
// inicializar Firestore la primera vez. Aquí NO van nombres de personas: quién
// preside cada comisión sale de las cuentas registradas en "Accesos y roles"
// (colección `presidentesAutorizados`, ver src/utils/presidentes.js).
// El "id" es un slug estable que se usa como ID del documento en la colección `comisiones`.

export const slugify = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

export const AREAS = [
  'Desarrollo Empresarial',
  'Desarrollo Democrático',
  'Desarrollo Social',
  'Desarrollo Económico',
  'Desarrollo Internacional',
]

const RAW = [
  // Desarrollo Empresarial
  { area: 'Desarrollo Empresarial', comision: 'Capital Humano' },
  { area: 'Desarrollo Empresarial', comision: 'Empresarios Jóvenes' },
  { area: 'Desarrollo Empresarial', comision: 'Financiamiento' },
  { area: 'Desarrollo Empresarial', comision: 'Innovación Empresarial' },
  { area: 'Desarrollo Empresarial', comision: 'Mujeres Empresarias' },
  { area: 'Desarrollo Empresarial', comision: 'Negocios / Emprendimiento' },
  { area: 'Desarrollo Empresarial', comision: 'Networking / Inteligencia Artificial' },
  { area: 'Desarrollo Empresarial', comision: 'Seguridad Industrial y Medio Ambiente' },
  { area: 'Desarrollo Empresarial', comision: 'Transformación Digital' },
  { area: 'Desarrollo Empresarial', comision: 'Competitividad y Mejora Regulatoria' },

  // Desarrollo Democrático
  { area: 'Desarrollo Democrático', comision: 'Enlace Legislativo y Seguridad' },

  // Desarrollo Social
  { area: 'Desarrollo Social', comision: 'Responsabilidad Social' },
  { area: 'Desarrollo Social', comision: 'Cultura y Deporte' },
  { area: 'Desarrollo Social', comision: 'Desarrollo Urbano y Vivienda' },
  { area: 'Desarrollo Social', comision: 'Educación' },
  { area: 'Desarrollo Social', comision: 'Seguridad Social y Salud' },
  { area: 'Desarrollo Social', comision: 'Organización y Planeación de Eventos' },
  { area: 'Desarrollo Social', comision: 'Laboral' },

  // Desarrollo Económico
  { area: 'Desarrollo Económico', comision: 'Energía' },
  { area: 'Desarrollo Económico', comision: 'Fiscal y Soporte Empresarial' },
  { area: 'Desarrollo Económico', comision: 'Sustentabilidad' },
  { area: 'Desarrollo Económico', comision: 'Turismo' },

  // Desarrollo Internacional
  { area: 'Desarrollo Internacional', comision: 'Comercio Internacional' },
  { area: 'Desarrollo Internacional', comision: 'Grandes Empresas' },
]

export const SEED_COMISIONES = RAW.map((c) => ({
  id: slugify(c.comision),
  area: c.area,
  nombreComision: c.comision,
  estado: 'pendiente', // pendiente | borrador | en_revision | aprobado
  plan: null,
}))

// Estados posibles de un plan de trabajo y cómo se muestran en toda la app.
export const ESTADOS = {
  pendiente: { texto: 'Pendiente', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  borrador: { texto: 'Borrador', color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  en_revision: { texto: 'En revisión', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  aprobado: { texto: 'Aprobado', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  rechazado: { texto: 'Rechazado', color: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' },
}

// Campos del plan usados para calcular el % de avance en el dashboard del presidente.
export const CAMPOS_PLAN_PARA_AVANCE = [
  'objetivoGeneral',
  'objetivosEspecificos',
  'metas',
  'recursos',
  'observaciones',
]

export const PLAN_VACIO = {
  objetivoGeneral: '',
  objetivosEspecificos: '',
  actividades: [{ actividad: '', objetivo: '', responsable: '', fecha: '', indicador: '' }],
  metas: '',
  recursos: '',
  observaciones: '',
}
