import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  if (!supabaseUrl || !supabaseAnonKey) return false;
  if (supabaseUrl.includes('tu-proyecto') || supabaseAnonKey.includes('tu-clave-anon')) return false;
  if (!supabaseUrl.startsWith('https://')) return false;
  return true;
};

export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

export const testSupabaseConnection = async (): Promise<{ ok: boolean; message: string }> => {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      ok: false,
      message: 'Faltan las variables VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en tu archivo .env.local',
    };
  }

  try {
    const { data, error } = await supabase.from('raffles').select('id, name, status').limit(1);
    if (error) {
      if (error.code === '42P01') {
        return {
          ok: false,
          message: 'Supabase está conectado, pero la tabla "raffles" aún no existe. Debes ejecutar la migración en el SQL Editor de Supabase.',
        };
      }
      return {
        ok: false,
        message: `Error de consulta en Supabase: ${error.message} (${error.code})`,
      };
    }
    return {
      ok: true,
      message: `Conectado exitosamente con Supabase. Rifas encontradas: ${data?.length || 0}`,
    };
  } catch (err: any) {
    return {
      ok: false,
      message: `Error de red o CORS al intentar conectar con Supabase: ${err?.message || 'Desconocido'}`,
    };
  }
};
