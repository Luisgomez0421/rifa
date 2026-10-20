import React, { useState } from 'react';
import { X, Clock, ShieldCheck, Check, Send, AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Ticket, Raffle } from '../types';

interface ReservationModalProps {
  ticket: Ticket;
  raffle: Raffle;
  onClose: () => void;
  onReserve: (data: {
    name: string;
    email: string;
    phone: string;
    paymentReference: string;
  }) => Promise<void>;
  isLoading: boolean;
}

export const ReservationModal: React.FC<ReservationModalProps> = ({
  ticket,
  raffle,
  onClose,
  onReserve,
  isLoading,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [reference, setReference] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Por favor ingresa tu nombre completo.');
      return;
    }
    if (!phone.trim() || phone.trim().length < 7) {
      setError('Por favor ingresa un número de teléfono/WhatsApp válido.');
      return;
    }

    try {
      await onReserve({
        name: name.trim(),
        email: email.trim() || `${phone.trim()}@cliente.rifa`,
        phone: phone.trim(),
        paymentReference: reference.trim(),
      });

      // Launch celebratory confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (err: any) {
      setError(err?.message || 'Ocurrió un error al intentar reservar el número.');
    }
  };

  const whatsappAdmin = import.meta.env.VITE_ADMIN_WHATSAPP || '+573001234567';
  const cleanPhone = whatsappAdmin.replace(/[^0-9]/g, '');
  const whatsappMessage = encodeURIComponent(
    `¡Hola! Quiero reservar el número *${ticket.number}* de la *${raffle.title}* por valor de $${raffle.ticket_price.toLocaleString('es-CO')}. Mi nombre es ${name || '[Mi Nombre]'}.`
  );
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${whatsappMessage}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-100 my-8">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex flex-col items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20 font-mono">
            <span className="text-xs uppercase font-extrabold tracking-wider">NÚMERO</span>
            <span className="text-3xl font-black">{ticket.number}</span>
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Reservar Boleto #{ticket.number}
            </h2>
            <p className="text-xs sm:text-sm text-emerald-400 font-semibold">
              Valor: ${raffle.ticket_price.toLocaleString('es-CO')} COP
            </p>
          </div>
        </div>

        {/* Hold Policy Notice */}
        <div className="mb-6 bg-slate-800/60 rounded-xl p-3.5 border border-slate-700/60 flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300 space-y-1">
            <p className="font-semibold text-white">
              Reserva garantizada por 15 minutos
            </p>
            <p className="text-slate-400">
              Una vez confirmes la reserva, tendrás 15 minutos para transferir y enviar el comprobante antes de que el número sea liberado a otros participantes.
            </p>
          </div>
        </div>

        {/* Payment Methods Info Box */}
        <div className="mb-6 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
          <div className="font-bold text-slate-200 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Cuentas disponibles para el pago:</span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1 text-slate-300">
            <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
              <span className="text-[11px] text-emerald-400 font-bold block">Nequi / Daviplata</span>
              <span className="font-mono font-semibold text-white">300 123 4567</span>
            </div>
            <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
              <span className="text-[11px] text-teal-400 font-bold block">Bancolombia Ahorros</span>
              <span className="font-mono font-semibold text-white">123-456789-00</span>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nombre Completo *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Luis Gómez"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Teléfono / WhatsApp *
              </label>
              <input
                type="tel"
                required
                placeholder="Ej: 3001234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Correo Electrónico (Opcional)
              </label>
              <input
                type="email"
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Referencia / Comprobante de Pago (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej: Aprobación #847291 Nequi"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
            />
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>Confirmar Reserva de Boleto</span>
                </>
              )}
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-colors"
            >
              <Send className="w-4 h-4 text-emerald-400" />
              <span>Notificar o Pagar por WhatsApp</span>
            </a>
          </div>

        </form>

      </div>
    </div>
  );
};
