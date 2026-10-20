import React from 'react';
import { X, CheckCircle, Clock, Send, Printer, Share2 } from 'lucide-react';
import { Ticket, Raffle } from '../types';

interface TicketReceiptModalProps {
  ticket: Ticket;
  raffle: Raffle;
  onClose: () => void;
}

export const TicketReceiptModal: React.FC<TicketReceiptModalProps> = ({
  ticket,
  raffle,
  onClose,
}) => {
  const isPaid = ticket.status === 'paid';
  const whatsappAdmin = import.meta.env.VITE_ADMIN_WHATSAPP || '+573001234567';
  const cleanPhone = whatsappAdmin.replace(/[^0-9]/g, '');

  const whatsappMessage = encodeURIComponent(
    `¡Hola! Adjunto comprobante de pago para mi número reservado *#${ticket.number}* de la *${raffle.title}* a nombre de *${ticket.customer_name || 'Participante'}*.`
  );
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${whatsappMessage}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-100 my-8">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Digital Ticket Card */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 mb-3 border border-emerald-500/20">
            {isPaid ? (
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            ) : (
              <Clock className="w-8 h-8 text-amber-400 animate-pulse" />
            )}
          </div>
          <h3 className="text-xl font-black text-white">
            {isPaid ? '¡Boleto Pagado y Confirmado!' : '¡Boleto Reservado con Éxito!'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Comprobante digital oficial de participación
          </p>
        </div>

        {/* Ticket Body */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 font-mono relative overflow-hidden">
          {/* Decorative cutouts */}
          <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-900 border-r border-slate-800" />
          <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-900 border-l border-slate-800" />

          <div className="flex justify-between items-center border-b border-dashed border-slate-800 pb-3">
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Rifa</span>
              <span className="text-xs font-sans font-bold text-white line-clamp-1">{raffle.title}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 uppercase block">Estado</span>
              <span
                className={`text-xs font-bold uppercase ${
                  isPaid ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {ticket.status}
              </span>
            </div>
          </div>

          <div className="py-2 text-center">
            <span className="text-xs text-slate-400 uppercase tracking-widest block font-sans">
              NÚMERO DE LA SUERTE
            </span>
            <div className="text-5xl font-black text-emerald-400 tracking-tight my-1">
              {ticket.number}
            </div>
            <span className="text-xs text-slate-400 font-sans">
              Valor: ${raffle.ticket_price.toLocaleString('es-CO')} COP
            </span>
          </div>

          <div className="border-t border-dashed border-slate-800 pt-3 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Titular:</span>
              <span className="text-white font-sans font-medium">{ticket.customer_name || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Teléfono:</span>
              <span className="text-white font-mono">{ticket.customer_phone || 'N/A'}</span>
            </div>
            {ticket.expires_at && !isPaid && (
              <div className="flex justify-between text-amber-400">
                <span>Vence reserva:</span>
                <span>{new Date(ticket.expires_at).toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Next step guide */}
        {!isPaid && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
            <p className="font-semibold mb-0.5">⚠️ Paso indispensable:</p>
            <p className="text-[11px] text-slate-300">
              Envía tu comprobante de pago por WhatsApp al administrador para que tu boleto pase a estado <strong>Pagado</strong>.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col gap-2">
          {!isPaid && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all"
            >
              <Send className="w-4 h-4" />
              <span>Enviar Comprobante por WhatsApp</span>
            </a>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handlePrint}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 transition-colors"
            >
              <Printer className="w-4 h-4 text-slate-400" />
              <span>Imprimir / Guardar</span>
            </button>
            <button
              onClick={onClose}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 transition-colors"
            >
              <Share2 className="w-4 h-4 text-slate-400" />
              <span>Cerrar</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
