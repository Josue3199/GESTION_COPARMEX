# Comisiones de Trabajo

Plataforma web para que la administradora dé seguimiento a los planes de trabajo de las
25 comisiones (5 áreas), y para que cada presidente/a suba el suyo desde un formulario
en vez de mandar PDFs sueltos.

**Stack:** React + Vite, Tailwind CSS, Firebase (Auth + Firestore + Hosting), deploy
automático con GitHub Actions.

## Qué incluye esta base

- Login con Firebase Authentication (correo/contraseña).
- Dos roles: `admin` (la administradora) y `presidente` (presidente/a de comisión).
- Botón para inicializar Firestore con las 25 comisiones ya extraídas del PDF
  (`src/data/comisiones.js`), agrupadas por sus 5 áreas.
- Panel de administración: contadores por estado (pendiente / borrador / en revisión /
  aprobado), filtro por área, lista de comisiones con semáforo de estado.
- Vista de detalle por comisión para la administradora, con botón "Aprobar plan".
- Panel del presidente: solo ve su comisión, con el formulario del plan de trabajo
  (objetivo general, objetivos específicos, tabla de actividades, metas, recursos,
  observaciones) y botones "Guardar borrador" / "Enviar para revisión".
- Reglas de seguridad de Firestore: un presidente solo puede leer/escribir su propia
  comisión y no puede autoaprobarse; solo la admin aprueba.
- Workflow de GitHub Actions para desplegar a Firebase Hosting en cada push a `main`.

## Lo que falta para la v2 (ideas, no bloquean la demo)

- Botón "Generar documento general" que junte todos los planes aprobados en un solo PDF.
- Subida de archivos (PDF/Word) como respaldo opcional del plan, usando Firebase Storage
  (requiere el plan Blaze — ya lo tienes pendiente para IBIME, se puede activar igual aquí).
- Pantalla de administración para crear cuentas de presidentes y vincularlas a su comisión
  (por ahora se hace a mano en la consola de Firebase, ver paso 5).
- Notificaciones por correo cuando un plan pasa a "en revisión" o se aprueba.

## Paso a paso para dejarlo funcionando

### 1. Crear el proyecto en Firebase
1. Ve a https://console.firebase.google.com y crea un proyecto nuevo (o usa uno existente).
2. Activa **Authentication → Método de acceso → Correo/contraseña**.
3. Activa **Firestore Database** (modo producción).
4. En **Configuración del proyecto → Tus apps**, agrega una app web y copia el objeto
   `firebaseConfig`.

### 2. Configurar variables de entorno
1. Copia `.env.example` a `.env`.
2. Pega los valores de `firebaseConfig` en cada variable `VITE_FIREBASE_*`.

### 3. Instalar y correr localmente
```bash
npm install
npm run dev
```

### 4. Desplegar las reglas de Firestore
```bash
npm install -g firebase-tools
firebase login
firebase use --add        # selecciona tu proyecto
firebase deploy --only firestore:rules
```

### 5. Crear el primer usuario administrador
1. En **Authentication → Users**, agrega manualmente un usuario (correo/contraseña) para
   la administradora. Copia su UID.
2. En **Firestore → Iniciar colección → `usuarios`**, crea un documento con **ID = ese UID**
   y estos campos:
   - `rol`: `"admin"` (string)
   - `nombre`: `"Norma Angélica Romero Ramón"` (o el nombre que corresponda)
3. Entra a la app con ese correo/contraseña → verás el **Panel de administración**.
4. Ahí pulsa **"Inicializar comisiones (25)"** para cargar el catálogo completo del PDF.

### 6. Crear cuentas de presidentes (por ahora, manual)
Para cada presidente/a:
1. Créale un usuario en **Authentication → Users**.
2. Crea su documento en `usuarios/{uid}` con:
   - `rol`: `"presidente"`
   - `comisionId`: el id de su comisión (es el nombre de la comisión en minúsculas y
     con guiones, ej. `"capital-humano"`, `"empresarios-jovenes"`, `"turismo"` — puedes
     verlos abriendo cada documento en la colección `comisiones` desde la consola).
   - `nombre`: su nombre completo.
3. Esa persona entra con su correo y ve únicamente su comisión y su formulario.

### 7. Subir a GitHub y automatizar el deploy
```bash
git init
git add .
git commit -m "Base del proyecto Comisiones de Trabajo"
git branch -M main
git remote add origin <URL_DE_TU_REPO>
git push -u origin main
```
En **Settings → Secrets and variables → Actions** de tu repo, agrega estos secrets:
- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
  `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`,
  `VITE_FIREBASE_APP_ID` (los mismos valores de tu `.env`).
- `FIREBASE_SERVICE_ACCOUNT`: genera una cuenta de servicio en
  **Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada**,
  y pega el contenido completo del JSON como valor del secret.

A partir de ese momento, cada `git push` a `main` compila y despliega automáticamente
a Firebase Hosting.

## Estructura del repositorio
```
comisiones-trabajo/
├── .github/workflows/deploy.yml   # CI/CD a Firebase Hosting
├── firebase.json
├── firestore.rules                # reglas de seguridad por rol
├── firestore.indexes.json
├── src/
│   ├── firebase/config.js         # inicialización de Firebase
│   ├── context/AuthContext.jsx    # sesión + rol del usuario
│   ├── data/comisiones.js         # catálogo de las 25 comisiones (del PDF)
│   ├── components/                # Layout, ProtectedRoute
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── AdminDashboard.jsx     # panel de la administradora
│   │   ├── ComisionDetail.jsx     # ver/aprobar un plan
│   │   └── PresidenteDashboard.jsx# formulario del plan de trabajo
│   ├── App.jsx                    # rutas
│   └── main.jsx
└── README.md
```
