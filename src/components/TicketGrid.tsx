import React, { useState, useMemo } from 'react';
import { Search, CheckCircle2, Clock, Ban, Sparkles } from 'lucide-react';
import { Ticket, TicketStatus } from '../types';

interface TicketGridProps {
  tickets: Ticket[];
  onSelectTicket: (ticket: Ticket) => void;
  selectedNumber?: string | null;
}

export const TicketGrid: React.FC<TicketGridProps> = ({
  tickets,
  onSelectTicket,
  selectedNumber,
}) => {
  const [filter, setFilter] = useState<'all' | TicketStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const counts = useMemo(() => {
    let available = 0;
    let reserved = 0;
    let paid = 0;
    tickets.forEach((t) => {
      if (t.status === 'available') available++;
      else if (t.status === 'reserved') reserved++;
      else if (t.status === 'paid') paid++;
    });
    return { all: tickets.length, available, reserved, paid };
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      // Filter by status
      if (filter !== 'all' && t.status !== filter) return false;

      // Filter by search query (number search)
      if (searchQuery.trim()) {
        const cleanQuery = searchQuery.trim().toLowerCase();
        const matchesNumber = t.number.includes(cleanQuery);
        const matchesCustomer = t.customer_name?.toLowerCase().includes(cleanQuery);
        return matchesNumber || matchesCustomer;
      }
      return true;
    });
  }, [tickets, filter, searchQuery]);

  return (
    <div className="space-y-6">
      
      {/* Controls: Search, Filters & Legend */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                filter === 'all'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Todos ({counts.all})
            </button>

            <button
              onClick={() => setFilter('available')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                filter === 'available'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/20'
                  : 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/50 hover:bg-emerald-900/40'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Disponibles ({counts.available})
            </button>

            <button
              onClick={() => setFilter('reserved')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                filter === 'reserved'
                  ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20'
                  : 'bg-amber-950/40 text-amber-400 border border-amber-900/50 hover:bg-amber-900/40'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Reservados ({counts.reserved})
            </button>

            <button
              onClick={() => setFilter('paid')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                filter === 'paid'
                  ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/20'
                  : 'bg-rose-950/40 text-rose-400 border border-rose-900/50 hover:bg-rose-900/40'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Pagados ({counts.paid})
            </button>
          </div>

          {/* Quick Number Search Input */}
          <div className="relative min-w-[200px] sm:min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar número (ej: 07, 7, 50)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
            />
          </div>

        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="font-semibold text-slate-300">Convenciones:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-emerald-500"></span>
              <span>Disponible (Clic para reservar)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-amber-500"></span>
              <span>Apartado (En espera de pago)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-slate-800 border border-rose-500/50"></span>
              <span>Comprado / Confirmado</span>
            </div>
          </div>
          <span className="text-slate-400 hidden sm:inline">
            Total en juego: <strong className="text-white">100 números (00 al 99)</strong>
          </span>
        </div>
      </div>

      {/* The 100-Number Grid */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-6 shadow-xl">
        {filteredTickets.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <Ban className="w-10 h-10 mx-auto text-slate-600" />
            <p className="font-semibold text-base text-slate-300">
              No se encontraron números con ese criterio
            </p>
            <p className="text-xs text-slate-500">
              Intenta borrar el filtro de búsqueda o cambiar de pestaña.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 sm:gap-3">
            {filteredTickets.map((ticket) => {
              const isSelected = selectedNumber === ticket.number;
              const isAvailable = ticket.status === 'available';
              const isReserved = ticket.status === 'reserved';
              const isPaid = ticket.status === 'paid';

              let buttonStyle = '';
              let badgeText = '';

              if (isAvailable) {
                buttonStyle =
                  'bg-emerald-950/40 hover:bg-emerald-500 hover:text-slate-950 text-emerald-300 border-emerald-500/30 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/25 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0';
                badgeText = 'Libre';
              } else if (isReserved) {
                buttonStyle =
                  'bg-amber-950/40 text-amber-300 border-amber-500/40 hover:bg-amber-900/50 cursor-pointer';
                badgeText = 'Apartado';
              } else if (isPaid) {
                buttonStyle =
                  'bg-slate-950 text-slate-500 border-rose-900/40 cursor-not-allowed opacity-75';
                badgeText = 'Vendido';
              }

              if (isSelected) {
                buttonStyle += ' ring-2 ring-white ring-offset-2 ring-offset-slate-950 scale-105';
              }

              return (
                <button
                  key={ticket.id}
                  onClick={() => onSelectTicket(ticket)}
                  className={`relative flex flex-col items-center justify-center p-3 rounded-xl border font-bold text-center transition-all aspect-square ${buttonStyle}`}
                >
                  {/* Number Label */}
                  <span className="text-xl sm:text-2xl font-black tracking-tight font-mono">
                    {ticket.number}
                  </span>

                  {/* Tiny Status indicator */}
                  <span className="text-[10px] uppercase font-semibold mt-0.5 tracking-wider truncate max-w-full px-1">
                    {badgeText}
                  </span>

                  {/* Corner Icons */}
                  {isAvailable && (
                    <Sparkles className="w-2.5 h-2.5 absolute top-1.5 right-1.5 opacity-40" />
                  )}
                  {isReserved && (
                    <Clock className="w-2.5 h-2.5 absolute top-1.5 right-1.5 text-amber-400" />
                  )}
                  {isPaid && (
                    <CheckCircle2 className="w-2.5 h-2.5 absolute top-1.5 right-1.5 text-rose-500" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
