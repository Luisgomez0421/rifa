import React, { useState } from 'react';
import { X, Database, Copy, Check, ExternalLink, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { testSupabaseConnection, isSupabaseConfigured } from '../../lib/supabase';

interface SupabaseGuideModalProps {
  onClose: () => void;
  onRefreshApp: () => void;
}

export const SupabaseGuideModal: React.FC<SupabaseGuideModalProps> = ({
  onClose,
  onRefreshApp,
}) => {
  const [copiedSql, setCopiedSql] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const isConfigured = isSupabaseConfigured();

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testSupabaseConnection();
      setTestResult(res);
      if (res.ok) {
        onRefreshApp();
      }
    } catch (err: any) {
      setTestResult({ ok: false, message: err?.message || 'Error desconocido' });
    } finally {
      setTesting(false);
    }
  };

  const sqlFilePath = 'supabase/migrations/20261020000001_create_mi_gran_rifa_schema.sql';

  const copySqlPath = () => {
    navigator.clipboard.writeText(sqlFilePath);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-900 my-8">
        
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              Guía de Conexión con Supabase
            </h2>
            <p className="text-xs text-slate-500">
              Paso a paso para principiantes para conectar tu proyecto <strong>mi-gran-rifa</strong>
            </p>
          </div>
        </div>

        {/* Status Alert */}
        <div
          className={`p-4 rounded-2xl border mb-6 flex items-start gap-3 ${
            isConfigured
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-amber-50 border-amber-300 text-amber-900'
          }`}
        >
          {isConfigured ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div className="text-xs space-y-1">
            <p className="font-bold">
              {isConfigured
                ? 'Variables detectadas en .env.local'
                : 'Modo Demo Activo (Supabase pendiente de conectar)'}
            </p>
            <p className="text-slate-600">
              {isConfigured
                ? 'Tu aplicación ya tiene configuradas las claves. Presiona "Probar Conexión Ahora" para validar las tablas.'
                : 'La aplicación funciona con datos de prueba locales para que puedas explorar la interfaz mientras completas estos 3 sencillos pasos.'}
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-4 text-xs">
          {/* Step 1 */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-blue-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs">1</span>
                Crea tu proyecto en Supabase
              </span>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline font-bold"
              >
                <span>Ir al Dashboard</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Inicia sesión en <strong>supabase.com</strong>, haz clic en <strong>"New project"</strong> y nómbralo <strong className="text-blue-700">mi-gran-rifa</strong>. Define una contraseña segura para tu base de datos y selecciona tu región.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <span className="font-bold text-sm text-blue-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs">2</span>
              Ejecuta la Migración SQL (Tablas, 100 Números y Funciones Atómicas)
            </span>
            <p className="text-slate-600 leading-relaxed">
              En el menú izquierdo de Supabase, ve a <strong>SQL Editor</strong> &gt; <strong>New query</strong>.
            </p>
            <p className="text-slate-600 leading-relaxed">
              Copia el contenido del archivo de migración preparado:
            </p>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-300 font-mono text-[11px] text-slate-700">
              <span className="truncate">{sqlFilePath}</span>
              <button
                onClick={copySqlPath}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'Copiado' : 'Copiar Ruta'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Pégalo en el editor y presiona <strong>Run</strong>. Creará la rifa, los 100 números (del 00 al 99) y las funciones con bloqueo de concurrencia.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <span className="font-bold text-sm text-blue-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs">3</span>
              Pega tus credenciales en el archivo local .env.local
            </span>
            <p className="text-slate-600 leading-relaxed">
              En Supabase ve a <strong>Project Settings</strong> &gt; <strong>API</strong>.
            </p>
            <div className="p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] space-y-1">
              <div>VITE_SUPABASE_URL=https://[tu-id].supabase.co</div>
              <div>VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsIn...</div>
            </div>
            <p className="text-[11px] text-slate-500">
              Abre el archivo <strong>.env.local</strong> de este proyecto y pega ambos valores.
            </p>
          </div>
        </div>

        {/* Test Result Message */}
        {testResult && (
          <div
            className={`mt-4 p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
              testResult.ok
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-rose-50 border-rose-300 text-rose-800'
            }`}
          >
            {testResult.ok ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <p>{testResult.message}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-end">
          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            <span>{testing ? 'Comprobando conexión...' : 'Probar Conexión con Supabase Ahora'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
          >
            Cerrar Guía
          </button>
        </div>

      </div>
    </div>
  );
};
