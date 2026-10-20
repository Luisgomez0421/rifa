import React, { useState } from 'react';
import { Search, Ticket, CheckCircle2, Clock, AlertTriangle, Send } from 'lucide-react';
import { getReservationByCode } from '../../services/raffleService';
import { Reservation } from '../../types';
import { formatCOP, formatDate } from '../../utils/formatters';

export const ConsultReservation: React.FC = () => {
  const [code, setCode] = useState('');
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setSearched(true);
    try {
      const res = await getReservationByCode(code.trim());
      setReservation(res);
    } catch {
      setReservation(null);
    } finally {
      setLoading(false);
    }
  };

  const whatsappPhone = (import.meta.env.VITE_ADMIN_WHATSAPP || '+573001234567').replace(/[^0-9]/g, '');

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      
      {/* Search Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm text-center">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center mx-auto mb-3">
          <Ticket className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">
          Consulta tu Reserva
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
          Ingresa el código público de tu reserva (ej: <code className="font-mono text-blue-700 font-bold">R-A1B2C3D4</code>) para verificar tus números y el estado de tu pago.
        </p>

        {/* Form */}
        <form onSubmit={handleSearch} className="mt-6 flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              placeholder="Código de reserva (ej: R-XXXXXXXX)..."
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setSearched(false);
              }}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono uppercase"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/20 transition-all disabled:opacity-50"
          >
            {loading ? 'Consultando...' : 'Buscar'}
          </button>
        </form>
      </div>

      {/* Result Card */}
      {searched && (
        <div>
          {!reservation ? (
            <div className="p-8 rounded-3xl bg-white border border-slate-200 text-center text-slate-500 space-y-2 shadow-sm">
              <AlertTriangle className="w-10 h-10 mx-auto text-amber-500" />
              <h3 className="font-bold text-slate-800 text-base">
                No encontramos una reserva con ese código
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Verifica que hayas escrito el código completo tal como te lo entregó el sistema al realizar la reserva.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs text-slate-400 uppercase font-semibold block">Código de Reserva</span>
                  <span className="font-mono text-2xl font-black text-slate-900">{reservation.public_code}</span>
                </div>

                <div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      reservation.status === 'paid'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                        : reservation.status === 'reserved'
                        ? 'bg-amber-50 text-amber-800 border border-amber-300'
                        : 'bg-slate-100 text-slate-600 border border-slate-300'
                    }`}
                  >
                    {reservation.status === 'paid' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {reservation.status === 'reserved' && <Clock className="w-3.5 h-3.5" />}
                    <span>{reservation.status === 'paid' ? 'Pagado y Confirmado' : reservation.status === 'reserved' ? 'Pendiente de Pago' : 'Cancelado'}</span>
                  </span>
                </div>
              </div>

              {/* Numbers */}
              <div>
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
                  Tus Números de la Suerte:
                </span>
                <div className="flex flex-wrap gap-2">
                  {(reservation.numbers || []).map((num) => (
                    <span
                      key={num}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white font-mono font-black text-lg shadow-sm"
                    >
                      {num}
                    </span>
                  ))}
                </div>
              </div>

              {/* Details table */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-slate-500 block">Titular:</span>
                  <span className="font-semibold text-slate-800">{reservation.participants?.full_name || 'Participante'}</span>
                </div>

                <div>
                  <span className="text-slate-500 block">Total de la reserva:</span>
                  <span className="font-mono font-bold text-blue-700">{formatCOP(reservation.total_price_cop)}</span>
                </div>

                <div>
                  <span className="text-slate-500 block">Fecha de registro:</span>
                  <span className="text-slate-700">{formatDate(reservation.created_at)}</span>
                </div>

                <div>
                  <span className="text-slate-500 block">Vencimiento reserva:</span>
                  <span className="text-slate-700">{formatDate(reservation.expires_at)}</span>
                </div>
              </div>

              {/* WhatsApp Payment button if still pending */}
              {reservation.status === 'reserved' && (
                <a
                  href={`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(
                    `¡Hola! Consulté mi reserva ${reservation.public_code} en Mi Gran Rifa y adjunto el comprobante de pago.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>Contactar Administrador por WhatsApp</span>
                </a>
              )}

            </div>
          )}
        </div>
      )}

    </div>
  );
};
