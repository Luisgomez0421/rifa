import React, { useState } from 'react';
import { X, CheckCircle2, ShieldCheck, AlertCircle, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatTwoDigits, formatCOP } from '../../utils/formatters';

interface RegistrationModalProps {
  selectedNumbers: number[];
  priceCOP: number;
  onClose: () => void;
  onSubmit: (data: { fullName: string; phone: string }) => Promise<void>;
  isLoading: boolean;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  selectedNumbers,
  priceCOP,
  onClose,
  onSubmit,
  isLoading,
}) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const quantity = selectedNumbers.length;
  const totalCOP = quantity * priceCOP;
  const sortedNumbers = [...selectedNumbers].sort((a, b) => a - b);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return; // Prevent double submit
    setError(null);

    // 1. Validar nombre completo
    const cleanName = fullName.trim();
    if (cleanName.length < 3) {
      setError('Por favor ingresa tu nombre y apellido completos.');
      return;
    }

    // 2. Validar teléfono (solo números y signos +, mín 7 dígitos)
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    if (cleanPhone.length < 7 || cleanPhone.length > 15) {
      setError('Por favor ingresa un número de teléfono o celular válido (ej: 3001234567).');
      return;
    }

    // 3. Validar números
    if (selectedNumbers.length === 0) {
      setError('Debes tener al menos un número seleccionado para reservar.');
      return;
    }

    // 4. Validar términos
    if (!termsAccepted) {
      setError('Debes aceptar la autorización para el contacto de pago.');
      return;
    }

    try {
      await onSubmit({
        fullName: cleanName,
        phone: cleanPhone,
      });

      // Confetti celebration
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch (err: any) {
      setError(err?.message || 'Error al procesar la reserva. Por favor intenta de nuevo.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-900 my-8">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold uppercase tracking-wider mb-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Registro de Participante</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900">
            Confirma tu Reserva
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Tus números quedarán apartados por 30 minutos mientras realizas el pago.
          </p>
        </div>

        {/* Pre-submission Summary required by Section 6 */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 mb-6 font-sans text-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <span className="font-semibold text-slate-500">Números seleccionados:</span>
            <div className="flex flex-wrap gap-1 justify-end max-w-[65%]">
              {sortedNumbers.map((num) => (
                <span
                  key={num}
                  className="px-2 py-0.5 rounded-lg bg-blue-600 text-white font-mono font-bold text-xs"
                >
                  {formatTwoDigits(num)}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500">Cantidad de números:</span>
            <span className="font-bold text-slate-900">{quantity}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500">Precio unitario:</span>
            <span className="font-mono font-bold text-slate-900">{formatCOP(priceCOP)}</span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-sm">
            <span className="font-extrabold text-slate-900">Total a pagar:</span>
            <span className="font-mono font-black text-blue-700 text-base">
              {formatCOP(totalCOP)}
            </span>
          </div>
        </div>

        {/* 30-min hold notice */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs mb-5">
          <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p>
            <strong>Plazo de 30 minutos:</strong> Los números se mantendrán reservados mientras envías el comprobante. Si no se verifica el pago en 30 minutos, se liberarán automáticamente.
          </p>
        </div>

        {/* Error notice */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nombre Completo *
            </label>
            <input
              type="text"
              required
              disabled={isLoading}
              placeholder="Ej: Carlos Pérez"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Teléfono / WhatsApp *
            </label>
            <input
              type="tel"
              required
              disabled={isLoading}
              placeholder="Ej: 3001234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-50"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Se utilizará para confirmar tu pago y notificarte si resultas ganador.
            </span>
          </div>

          {/* Data Processing Acceptance Checkbox */}
          <div className="flex items-start gap-2.5 pt-1">
            <input
              type="checkbox"
              id="terms"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <label htmlFor="terms" className="text-xs text-slate-600 select-none">
              Acepto que mis datos de contacto sean utilizados únicamente para la verificación de esta rifa y la entrega del premio.
            </label>
          </div>

          {/* Submit Button */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-md shadow-blue-600/25 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Procesando reserva segura...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>Confirmar y Reservar Números</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
