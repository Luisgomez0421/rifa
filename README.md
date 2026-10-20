# 🎟️ Mi Gran Rifa — Aplicación de Sorteos & Rifas

Aplicación moderna para gestión, venta y reserva de rifas de **100 números (del 00 al 99)** con integración de base de datos en **Supabase**, reservas concurrentes seguras con bloqueo de filas (`FOR UPDATE`), control de expiración de reservas (15 minutos), comprobantes digitales y panel de administración para confirmación de pagos.

---

## 🚀 Tecnologías Utilizadas

- **Frontend:** React 18 + Vite + TypeScript
- **Estilos:** Tailwind CSS + Lucide Icons + Canvas Confetti
- **Backend / Base de Datos:** Supabase (PostgreSQL con RLS y Funciones Transaccionales PL/pgSQL)
- **Seguridad:** Row Level Security (RLS) y reservas mediante RPC con protección contra doble compra.

---

## 📦 Estructura del Proyecto

```
rifa/
├── src/
│   ├── components/
│   │   ├── Navbar.tsx             # Barra superior con estado de Supabase y pestañas
│   │   ├── HeroBanner.tsx         # Banner del premio, métricas, cuenta regresiva y botón de la suerte
│   │   ├── TicketGrid.tsx         # Tablero interactivo de 100 números (00-99) con filtros y búsqueda
│   │   ├── ReservationModal.tsx   # Modal de reserva con formulario y aviso de retención por 15 min
│   │   ├── TicketReceiptModal.tsx # Comprobante digital de participación con botón para WhatsApp
│   │   ├── CheckTicketModal.tsx   # Consulta de boleto por teléfono o número
│   │   ├── AdminPanel.tsx         # Panel del organizador para validar pagos y liberar números
│   │   └── SupabaseGuideModal.tsx # Guía interactiva paso a paso con probador de conexión
│   ├── lib/
│   │   └── supabase.ts            # Cliente Supabase seguro y probador de conexión
│   ├── services/
│   │   └── raffleService.ts       # Capa de servicio con fallback a modo Demo local
│   ├── types/
│   │   └── index.ts               # Interfaces TypeScript (Raffle, Ticket, Stats, etc.)
│   ├── App.tsx
│   └── main.tsx
├── supabase/
│   └── migrations/
│       └── 20261020000001_create_raffle_schema.sql  # Migración con tablas, funciones y 100 números
├── .env.example                   # Plantilla de variables de entorno
├── .env.local                     # Variables locales (ignorado en Git por seguridad)
└── package.json
```

---

## ⚙️ Cómo ejecutar localmente

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Iniciar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```
   Abre la URL indicada (generalmente `http://localhost:5173`) en tu navegador.

3. **Compilar para producción:**
   ```bash
   npm run build
   ```

---

## 🗄️ Conexión con Supabase (Paso a Paso)

### Paso 1: Crear tu proyecto en Supabase
1. Ingresa a [https://supabase.com/dashboard](https://supabase.com/dashboard).
2. Haz clic en **"New Project"**.
3. Nombra tu proyecto: `mi-gran-rifa`.
4. Define una contraseña segura para tu base de datos y selecciona la región más cercana.

### Paso 2: Ejecutar la Migración SQL
1. En el panel izquierdo de Supabase, entra a **SQL Editor**.
2. Haz clic en **"New query"**.
3. Copia todo el contenido del archivo [`supabase/migrations/20261020000001_create_raffle_schema.sql`](supabase/migrations/20261020000001_create_raffle_schema.sql).
4. Pégalo en el editor y haz clic en el botón verde **"Run"**.
5. ¡Listo! Esto creará las tablas `raffles` y `tickets`, las funciones transaccionales y los **100 números (del 00 al 99)** automáticamente.

### Paso 3: Configurar las variables en `.env.local`
1. En Supabase, ve a **Project Settings** (icono de engranaje ⚙️) > **API**.
2. Copia la **Project URL** y la clave **`anon` `public`**.
3. Abre tu archivo `.env.local` y reemplaza los valores:
   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
   VITE_TICKET_PRICE=20000
   VITE_RAFFLE_NAME=Mi Gran Rifa
   VITE_ADMIN_WHATSAPP=+573001234567
   ```
4. Guarda el archivo y reinicia el servidor de desarrollo (`npm run dev`). La aplicación mostrará automáticamente la insignia verde **"Supabase Conectado"**.
