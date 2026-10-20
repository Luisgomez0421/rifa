import React, { useState } from 'react';
import { Search, Ticket as TicketIcon, Ban } from 'lucide-react';
import { Ticket, Raffle } from '../types';

interface CheckTicketModalProps {
  tickets: Ticket[];
  raffle: Raffle;
  onViewReceipt: (ticket: Ticket) => void;
}

export const CheckTicketModal: React.FC<CheckTicketModalProps> = ({
  tickets,
  raffle,
  onViewReceipt,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const results = searchTerm.trim()
    ? tickets.filter((t) => {
        const clean = searchTerm.trim().toLowerCase();
        const matchesNumber = t.number === clean || t.number === clean.padStart(2, '0');
        const matchesPhone = t.customer_phone?.replace(/[^0-9]/g, '').includes(clean);
        const matchesName = t.customer_name?.toLowerCase().includes(clean);
        return matchesNumber || matchesPhone || matchesName;
      })
    : [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSearched(true);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      
      {/* Search Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl text-center">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
          <TicketIcon className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-black text-white">
          Consulta el Estado de tu Número
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md mx-auto">
          Ingresa tu número de teléfono de WhatsApp o el número de boleto que reservaste en {raffle.title}.
        </p>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="mt-6 flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              placeholder="Ej: 3001234567 o el número 07"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setHasSearched(false);
              }}
              className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-colors"
          >
            Buscar
          </button>
        </form>
      </div>

      {/* Results List */}
      {hasSearched && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-400 px-1">
            Resultados encontrados ({results.length})
          </h3>

          {results.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
              <Ban className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="font-semibold text-white">No se encontró ningún número registrado</p>
              <p className="text-xs text-slate-500 mt-1">
                Verifica que hayas escrito bien el teléfono o el número de boleto.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {results.map((ticket) => {
                const isPaid = ticket.status === 'paid';
                const isReserved = ticket.status === 'reserved';

                return (
                  <div
                    key={ticket.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 shadow-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center font-mono text-2xl font-black text-emerald-400">
                        {ticket.number}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-base">
                            {ticket.customer_name || 'Sin titular'}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              isPaid
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : isReserved
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {ticket.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 space-x-2">
                          <span>Tel: {ticket.customer_phone || 'N/A'}</span>
                          {ticket.expires_at && isReserved && (
                            <span className="text-amber-400">
                              (Vence: {new Date(ticket.expires_at).toLocaleTimeString()})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onViewReceipt(ticket)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
                    >
                      Ver Comprobante
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
