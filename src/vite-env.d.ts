/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_TICKET_PRICE?: string;
  readonly VITE_RAFFLE_NAME?: string;
  readonly VITE_ADMIN_WHATSAPP?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
