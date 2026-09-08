// Datos base extraídos de "COMISIONES DE TRABAJO" (Norma Angélica Romero Ramón).
// Se usan únicamente para inicializar Firestore la primera vez (ver AdminSeed).
// El "id" es un slug estable que se usa como ID del documento en la colección `comisiones`.

const slugify = (s) =>
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
  { area: 'Desarrollo Empresarial', nombre: 'Alma Aurora Quintana Camacho', cargo: 'Presidenta', comision: 'Capital Humano' },
  { area: 'Desarrollo Empresarial', nombre: 'Azul Solis Cervantes', cargo: 'Presidenta', comision: 'Empresarios Jóvenes' },
  { area: 'Desarrollo Empresarial', nombre: 'Antonio Molina Palacios', cargo: 'Presidente', comision: 'Financiamiento' },
  { area: 'Desarrollo Empresarial', nombre: 'Cynthia Benavides Chávez', cargo: 'Presidenta', comision: 'Innovación Empresarial' },
  { area: 'Desarrollo Empresarial', nombre: 'Yessica Paola Cruz Torres', cargo: 'Presidenta', comision: 'Mujeres Empresarias' },
  { area: 'Desarrollo Empresarial', nombre: 'Marco Antonio Ruelas Velazquéz', cargo: 'Presidenta', comision: 'Negocios / Emprendimiento' },
  { area: 'Desarrollo Empresarial', nombre: 'Linda Saraí Solis Cervantes', cargo: 'Presidenta', comision: 'Networking / Inteligencia Artificial' },
  { area: 'Desarrollo Empresarial', nombre: 'Genoveva Martínez Mendoza', cargo: 'Presidenta', comision: 'Seguridad Industrial y Medio Ambiente' },
  { area: 'Desarrollo Empresarial', nombre: 'Alfredo González Ángeles', cargo: 'Presidente', comision: 'Transformación Digital' },
  { area: 'Desarrollo Empresarial', nombre: 'Rodrigo Franco Benavides', cargo: 'Presidente', comision: 'Competitividad y Mejora Regulatoria' },

  // Desarrollo Democrático
  { area: 'Desarrollo Democrático', nombre: 'Teodoro Barba Espinosa', cargo: 'Presidente', comision: 'Enlace Legislativo y Seguridad' },

  // Desarrollo Social
  { area: 'Desarrollo Social', nombre: 'Odett Rodríguez Mares', cargo: 'Presidenta', comision: 'Responsabilidad Social' },
  { area: 'Desarrollo Social', nombre: 'Juan Manuel Lozada', cargo: 'Presidente', comision: 'Cultura y Deporte' },
  { area: 'Desarrollo Social', nombre: 'Apolo Valdez Cerezo', cargo: 'Presidente', comision: 'Desarrollo Urbano y Vivienda' },
  { area: 'Desarrollo Social', nombre: 'Mayra Ponce Martínez', cargo: 'Presidenta', comision: 'Educación' },
  { area: 'Desarrollo Social', nombre: 'María Isabel García Valencia', cargo: 'Presidenta', comision: 'Seguridad Social y Salud' },
  { area: 'Desarrollo Social', nombre: 'Ricardo Quezada Puente', cargo: 'Presidente', comision: 'Organización y Planeación de Eventos' },
  { area: 'Desarrollo Social', nombre: 'María Magdalena Hernández Miramón', cargo: 'Presidenta', comision: 'Laboral' },

  // Desarrollo Económico
  { area: 'Desarrollo Económico', nombre: 'Roberto Carlos Figueroa Cerritos', cargo: 'Presidente', comision: 'Energía' },
  { area: 'Desarrollo Económico', nombre: 'Antonio Ignacio Cruz Juárez', cargo: 'Presidente', comision: 'Fiscal y Soporte Empresarial' },
  { area: 'Desarrollo Económico', nombre: 'Enrique Meixueiro Soto', cargo: 'Presidente', comision: 'Sustentabilidad' },
  { area: 'Desarrollo Económico', nombre: 'Martha Jiménez Pacheco', cargo: 'Presidenta', comision: 'Turismo' },

  // Desarrollo Internacional
  { area: 'Desarrollo Internacional', nombre: 'Jonathan Montes Leyva', cargo: 'Presidente', comision: 'Comercio Internacional' },
  { area: 'Desarrollo Internacional', nombre: 'Luis Chávez Rojano', cargo: 'Presidente', comision: 'Grandes Empresas' },
]

export const SEED_COMISIONES = RAW.map((c) => ({
  id: slugify(c.comision),
  area: c.area,
  nombreComision: c.comision,
  presidenteNombre: c.nombre,
  presidenteCargo: c.cargo,
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
