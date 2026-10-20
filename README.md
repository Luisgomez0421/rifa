# 🎟️ Mi Gran Rifa — Aplicación Oficial de Sorteos

Aplicación web integral para la gestión, reserva y venta de rifas de **100 números (del 00 al 99)** con precio oficial de **$10.000 COP**, integración con **Supabase PostgreSQL**, reservas atómicas con bloqueo de filas a nivel de base de datos (`SELECT ... FOR UPDATE`), expiración automática de reservas en 30 minutos, sincronización en tiempo real con **Supabase Realtime**, panel administrativo protegido mediante **Supabase Auth** y configuración lista para despliegue en **Vercel**.

---

## 1. 🚀 Tecnologías Utilizadas

- **Frontend:** React 18 + Vite + TypeScript (Modo Estricto).
- **Estilos & UI:** Tailwind CSS con diseño adaptativo mobile-first, paleta clara moderna (blanco/gris claro, títulos azul marino, interacciones azul/cian, estados verde disponible, ámbar reservado y rojo suave pagado).
- **Iconografía & Animaciones:** `lucide-react` y `canvas-confetti`.
- **Base de Datos & Backend:** Supabase (PostgreSQL 15+).
- **Seguridad:** Row Level Security (RLS) en todas las tablas y funciones transaccionales con `SECURITY DEFINER` y `SET search_path = public, pg_temp`.
- **Tiempo Real:** Supabase Realtime (suscripción a cambios en `raffle_numbers`).
- **Pruebas Automatizadas:** Vitest + React Testing Library (38 pruebas unitarias y de integración que verifican numeración, reservas, concurrencia, pagos, expiración y seguridad).
- **Despliegue:** Configurado para Vercel con reglas de enrutamiento SPA (`vercel.json`).

---

## 2. 🏛️ Arquitectura del Sistema

```
rifa/
├── src/
│   ├── components/
│   │   ├── admin/
│   │   │   └── AdminPanel.tsx              # Dashboard del administrador, gestión de reservas y ajustes
│   │   ├── layout/
│   │   │   ├── Navbar.tsx                  # Barra superior con estado de conexión y pestañas
│   │   │   └── SupabaseGuideModal.tsx      # Guía interactiva paso a paso con verificador de conexión en vivo
│   │   └── raffle/
│   │       ├── HeroSection.tsx             # Banner de premio, métricas (100 números), precio y bandeja de selección
│   │       ├── TicketGrid.tsx              # Cuadrícula interactiva de 100 números (00-99) con filtros y búsqueda
│   │       ├── RegistrationModal.tsx       # Formulario con validación de teléfono, aviso de datos y resumen previo
│   │       ├── ReservationSuccessModal.tsx # Pantalla de confirmación con código único e instrucciones de pago
│   │       └── ConsultReservation.tsx      # Consulta pública de reserva por código de seguimiento
│   ├── lib/
│   │   └── supabase.ts                     # Cliente Supabase seguro con fallback a modo demo
│   ├── services/
│   │   └── raffleService.ts                # Capa transaccional con mutex de concurrencia y RPCs
│   ├── types/
│   │   └── index.ts                        # Tipos estrictos TypeScript (Raffle, RaffleNumber, Reservation, etc.)
│   ├── utils/
│   │   └── formatters.ts                   # Formateadores estrictos de 2 dígitos (00-99) y moneda COP
│   ├── App.tsx                             # Componente principal con enrutamiento de vistas y sincronización Realtime
│   └── main.tsx
├── supabase/
│   └── migrations/
│       └── 20261020000001_create_mi_gran_rifa_schema.sql # Migración completa con RLS y funciones atómicas
├── tests/
│   ├── unit/
│   │   ├── formatters.test.ts              # Pruebas de ceros iniciales (00 a 99) y formato COP
│   │   ├── numbering.test.ts               # Validación de exactamente 100 números sin duplicados
│   │   ├── security.test.ts                # Verificación de ausencia de claves secretas y sanitización
│   │   └── components.test.tsx             # Pruebas de interfaz con React Testing Library
│   └── integration/
│       ├── reservations.test.ts            # Pruebas de reservas simples y múltiples atómicas
│       ├── payments_and_expiration.test.ts # Pruebas de confirmación, cancelación y expiración
│       └── concurrency.test.ts             # Pruebas de bloqueo concurrente (doble reserva simultánea)
├── .env.example                            # Plantilla de variables de entorno públicas
├── .env.local                              # Variables locales (ignorado por Git por seguridad)
├── vercel.json                             # Configuración de reescritura para SPA en Vercel
├── vite.config.ts                          # Configuración de Vite y Vitest
└── package.json
```

---

## 3. 🛡️ Modelo de Datos y Seguridad (Supabase PostgreSQL)

### Tablas Principales:
1. **`raffles`:** Información del sorteo (nombre, descripción, premio, precio `$10.000 COP`, plazo de retención de 30 minutos).
2. **`participants`:** Nombre completo y teléfono validados. Protegida con RLS: **solo accesible por administradores**.
3. **`reservations`:** Contiene el código público no predecible (`public_code`), cantidad, precio unitario histórico, total calculado exclusivamente por el servidor y fecha de expiración.
4. **`raffle_numbers`:** Los exactamente **100 registros (del 0 al 99)** con restricción única `(raffle_id, number)`. Solo expone número y estado a consultas anónimas.
5. **`payment_events`:** Registro de auditoría inmutable de solo lectura para acciones administrativas (creación, confirmación de pago, cancelación y expiración).

### Funciones Transaccionales (Atomicidad y Concurrencia):
- **`create_reservation_atomic`:** Bloquea las filas seleccionadas con `FOR UPDATE`. Si alguno de los números ya no está disponible, aborta la transacción limpiamente sin dejar reservas parciales.
- **`expire_pending_reservations`:** Libera automáticamente los números de reservas en estado `reserved` cuya fecha `expires_at` haya vencido. Las reservas pagadas **nunca** son liberadas.
- **`confirm_reservation_payment`:** Pasa la reserva y todos sus números a `paid` en una única transacción e inserta el evento en la auditoría.
- **`cancel_reservation_admin`:** Cancela una reserva pendiente, libera sus números a `available` y registra el motivo en la auditoría.

---

## 4. ⚙️ Instalación y Ejecución Local

### Prerrequisitos:
- Node.js v18+ o v20+
- npm v9+

### Pasos:
1. Clonar el repositorio y entrar a la carpeta:
   ```bash
   cd "rifa"
   ```

2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Iniciar el servidor de desarrollo local:
   ```bash
   npm run dev
   ```
   Abre la dirección [http://localhost:5173](http://localhost:5173) en tu navegador.

4. Ejecutar las pruebas automatizadas:
   ```bash
   npm run test
   ```

5. Compilar para producción:
   ```bash
   npm run build
   ```

---

## 5. 🗄️ Guía Paso a Paso para Conectar con Supabase

### Paso 1: Crear el proyecto en Supabase
1. Ingresa a [https://supabase.com/dashboard](https://supabase.com/dashboard) e inicia sesión.
2. Haz clic en **"New Project"**.
3. En **Name**, escribe `mi-gran-rifa`.
4. Ingresa una contraseña segura para tu base de datos y selecciona la región más cercana.

### Paso 2: Aplicar la migración SQL
1. En el menú lateral izquierdo de tu proyecto en Supabase, haz clic en **SQL Editor** (`>_`).
2. Haz clic en **"New query"**.
3. Copia todo el contenido del archivo [`supabase/migrations/20261020000001_create_mi_gran_rifa_schema.sql`](supabase/migrations/20261020000001_create_mi_gran_rifa_schema.sql).
4. Pégalo en el editor y presiona **"Run"**.
5. Aparecerá el mensaje *Success*. Esto creará automáticamente las 5 tablas, los 100 números (del 00 al 99), las funciones transaccionales y las políticas de seguridad RLS.

### Paso 3: Configurar las variables en `.env.local`
1. En Supabase, ve abajo a **Project Settings** (icono de engranaje ⚙️) > **API**.
2. Copia la **Project URL** y la clave **`anon` `public`**.
3. Abre tu archivo local `.env.local` y define:
   ```env
   VITE_SUPABASE_URL=https://tu-id-de-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-clave-anon-aqui
   VITE_ADMIN_WHATSAPP=+573001234567
   ```
4. Guarda el archivo y reinicia el servidor (`npm run dev`). La aplicación mostrará la insignia verde **"Supabase Conectado"**.

### Paso 4: Crear de forma segura el primer Administrador
1. En tu proyecto de Supabase, entra a **Authentication** > **Users**.
2. Haz clic en **"Add user"** > **"Create user"**.
3. Ingresa tu correo electrónico (ej: `admin@migranrifa.com`) y una contraseña segura.
4. Marca la casilla **Auto Confirm User** para activar el usuario de inmediato.
5. ¡Listo! Con ese correo y contraseña podrás ingresar al panel en `/admin`.

---

## 6. 🌐 Despliegue en Vercel

1. Sube tu código a GitHub:
   ```bash
   git push origin main
   ```
2. Entra a [https://vercel.com/new](https://vercel.com/new) e importa tu repositorio `rifa`.
3. En la sección **Environment Variables**, agrega las variables públicas:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_ADMIN_WHATSAPP`
4. Haz clic en **Deploy**. Gracias a `vercel.json`, todas las rutas (`/` y `/admin`) funcionarán directamente sin errores 404 al recargar.

---

## 7. 💡 Preguntas y Solución de Problemas Frecuentes

- **¿Por qué la aplicación funciona antes de conectar Supabase?**
  La aplicación incluye un simulador seguro de modo demostración en memoria local (`localStorage`), lo que permite probar la cuadrícula, las reservas y el panel sin bloquear el desarrollo.
- **¿Qué pasa si dos personas hacen clic en el mismo número?**
  La función PostgreSQL `create_reservation_atomic` bloquea los registros solicitados con `FOR UPDATE`. La primera solicitud reserva el número; la segunda es rechazada atómicamente con el mensaje: *"Uno o varios números ya no están disponibles. Actualiza la cuadrícula e inténtalo nuevamente."*
- **¿Cómo se liberan las reservas no pagadas?**
  Las reservas pendientes tienen una vigencia de 30 minutos. Cada vez que el cliente o el administrador interactúan con la base de datos, o mediante la función `expire_pending_reservations`, los números no pagados se restauran automáticamente al estado `available`.
