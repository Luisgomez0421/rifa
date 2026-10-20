import React, { useState } from 'react';
import { X, CheckCircle, Copy, Check, Send, ShieldCheck, Printer } from 'lucide-react';
import { ReservationResponse } from '../../types';
import { formatTwoDigits, formatCOP } from '../../utils/formatters';

interface ReservationSuccessModalProps {
  data: ReservationResponse;
  participantName: string;
  numbers: number[];
  onClose: () => void;
}

export const ReservationSuccessModal: React.FC<ReservationSuccessModalProps> = ({
  data,
  participantName,
  numbers,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const sortedNumbers = [...numbers].sort((a, b) => a - b);
  const formattedNumbersList = sortedNumbers.map((n) => formatTwoDigits(n)).join(', ');

  const handleCopyCode = () => {
    if (data.public_code) {
      navigator.clipboard.writeText(data.public_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const whatsappPhone = (import.meta.env.VITE_ADMIN_WHATSAPP || '+573001234567').replace(/[^0-9]/g, '');
  const message = encodeURIComponent(
    `¡Hola! Acabo de reservar los números *${formattedNumbersList}* en *Mi Gran Rifa*.\n\n` +
    `Código de Reserva: *${data.public_code}*\n` +
    `Titular: *${participantName}*\n` +
    `Total a pagar: *${formatCOP(data.total_price_cop || numbers.length * 10000)}*\n\n` +
    `Adjunto mi comprobante de pago para que confirmen mi reserva.`
  );
  const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${message}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-900 my-8">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Success Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-3 shadow-sm">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">
            ¡Reserva Registrada!
          </h2>
          <p className="text-xs text-amber-700 font-bold bg-amber-50 py-1 px-3 rounded-full inline-block mt-2 border border-amber-200">
            ⏳ Pago pendiente de verificación
          </p>
        </div>

        {/* Public Code Box */}
        <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 text-center mb-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 block mb-1">
            Código de Seguimiento
          </span>
          <div className="flex items-center justify-center gap-2">
            <span className="font-mono text-2xl font-black text-blue-900 tracking-wider">
              {data.public_code}
            </span>
            <button
              onClick={handleCopyCode}
              className="p-1.5 rounded-lg bg-white hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors"
              title="Copiar código"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <span className="text-[10px] text-blue-600 mt-1 block">
            Guarda este código para consultar el estado de tu boleto
          </span>
        </div>

        {/* Ticket Summary */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs mb-5 font-sans">
          <div className="flex justify-between">
            <span className="text-slate-500">Participante:</span>
            <span className="font-bold text-slate-800">{participantName}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-500">Números reservados:</span>
            <div className="flex flex-wrap gap-1 justify-end max-w-[65%]">
              {sortedNumbers.map((n) => (
                <span
                  key={n}
                  className="px-2 py-0.5 rounded bg-blue-600 text-white font-mono font-bold text-xs"
                >
                  {formatTwoDigits(n)}
                </span>
              ))}
            </div>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-500">Cantidad:</span>
            <span className="font-bold text-slate-800">{numbers.length}</span>
          </div>

          <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-sm">
            <span className="text-slate-900">Total a transferir:</span>
            <span className="font-mono text-blue-700">
              {formatCOP(data.total_price_cop || numbers.length * 10000)}
            </span>
          </div>
        </div>

        {/* Payment and WhatsApp Instructions */}
        <div className="space-y-3 mb-6">
          <div className="p-3.5 rounded-xl bg-slate-900 text-white text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-cyan-300">
              <ShieldCheck className="w-4 h-4" />
              <span>Instrucciones para completar el pago:</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Transfiere a <strong>Nequi / Daviplata: 300 123 4567</strong> y envía el comprobante por WhatsApp indicando tu código <strong>{data.public_code}</strong>.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Send className="w-4 h-4" />
            <span>Enviar Comprobante por WhatsApp</span>
          </a>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => window.print()}
              className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Imprimir</span>
            </button>
            <button
              onClick={onClose}
              className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
            >
              Listo, volver
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
