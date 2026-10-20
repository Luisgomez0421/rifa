import React, { useState, useMemo } from 'react';
import { Search, CheckCircle2, Clock, Ban, Check, Sparkles } from 'lucide-react';
import { RaffleNumber, NumberStatus } from '../../types';
import { formatTwoDigits } from '../../utils/formatters';

interface TicketGridProps {
  numbers: RaffleNumber[];
  selectedNumbers: number[];
  onToggleNumber: (num: number) => void;
  onSelectLuckyNumbers: (count: number) => void;
}

export const TicketGrid: React.FC<TicketGridProps> = ({
  numbers,
  selectedNumbers,
  onToggleNumber,
  onSelectLuckyNumbers,
}) => {
  const [filter, setFilter] = useState<'all' | NumberStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Counts
  const counts = useMemo(() => {
    let available = 0;
    let reserved = 0;
    let paid = 0;
    numbers.forEach((n) => {
      if (n.status === 'available') available++;
      else if (n.status === 'reserved') reserved++;
      else if (n.status === 'paid') paid++;
    });
    return { all: numbers.length, available, reserved, paid };
  }, [numbers]);

  // Filter & Search
  const filteredNumbers = useMemo(() => {
    return numbers.filter((n) => {
      if (filter !== 'all' && n.status !== filter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim();
        const formatted = formatTwoDigits(n.number);
        return formatted.includes(q) || n.number.toString().includes(q);
      }
      return true;
    });
  }, [numbers, filter, searchQuery]);

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-sm space-y-6">
      
      {/* Top Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between pb-2 border-b border-slate-100">
        
        {/* Filter Chips */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              filter === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({counts.all})
          </button>

          <button
            onClick={() => setFilter('available')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              filter === 'available'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Disponibles ({counts.available})
          </button>

          <button
            onClick={() => setFilter('reserved')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              filter === 'reserved'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Reservados ({counts.reserved})
          </button>

          <button
            onClick={() => setFilter('paid')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              filter === 'paid'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Pagados ({counts.paid})
          </button>
        </div>

        {/* Search Input & Quick Random Selector */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar # (ej: 07, 24)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          <button
            onClick={() => onSelectLuckyNumbers(1)}
            className="px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1 transition-colors shrink-0"
            title="Elegir 1 número al azar"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Azar</span>
          </button>
        </div>

      </div>

      {/* Grid Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 bg-slate-50 p-3 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-bold text-slate-700">Convenciones:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-emerald-500" />
            <span className="text-slate-700 font-medium">Disponible (Clic para seleccionar)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-amber-500" />
            <span className="text-slate-700 font-medium">Reservado (En espera de pago)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-rose-400" />
            <span className="text-slate-700 font-medium">Pagado / No disponible</span>
          </div>
        </div>
        <span className="font-semibold text-slate-600">
          Puedes seleccionar múltiples números a la vez
        </span>
      </div>

      {/* The 100-Number Grid (10 columns on desktop, responsive) */}
      {filteredNumbers.length === 0 ? (
        <div className="py-16 text-center text-slate-400 space-y-2">
          <Ban className="w-10 h-10 mx-auto text-slate-300" />
          <p className="font-bold text-base text-slate-700">
            No se encontraron números con ese criterio
          </p>
          <p className="text-xs text-slate-500">
            Verifica el filtro o borra la búsqueda para ver todos los números.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 sm:gap-2.5">
          {filteredNumbers.map((item) => {
            const formatted = formatTwoDigits(item.number);
            const isSelected = selectedNumbers.includes(item.number);
            const isAvailable = item.status === 'available';
            const isReserved = item.status === 'reserved';
            const isPaid = item.status === 'paid';

            let baseStyle = '';
            let label = '';

            if (isSelected) {
              baseStyle =
                'bg-blue-600 text-white border-blue-700 shadow-md shadow-blue-500/25 ring-2 ring-blue-500 ring-offset-2 scale-105';
              label = 'Elegido';
            } else if (isAvailable) {
              baseStyle =
                'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 hover:shadow-md cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0';
              label = 'Libre';
            } else if (isReserved) {
              baseStyle =
                'bg-amber-50 text-amber-800 border-amber-300 cursor-not-allowed opacity-80';
              label = 'Apartado';
            } else if (isPaid) {
              baseStyle =
                'bg-rose-50 text-rose-800 border-rose-200 cursor-not-allowed opacity-50';
              label = 'Vendido';
            }

            return (
              <button
                key={item.id}
                type="button"
                disabled={!isAvailable}
                onClick={() => isAvailable && onToggleNumber(item.number)}
                className={`relative flex flex-col items-center justify-center p-2.5 rounded-2xl border font-bold text-center transition-all aspect-square ${baseStyle}`}
              >
                {/* Strictly two-digit number */}
                <span className="text-xl sm:text-2xl font-black font-mono tracking-tight">
                  {formatted}
                </span>

                {/* Subtitle / status */}
                <span className="text-[10px] uppercase font-bold tracking-wider mt-0.5 opacity-90 truncate max-w-full">
                  {label}
                </span>

                {/* Selected Check Icon */}
                {isSelected && (
                  <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-white text-blue-600 flex items-center justify-center">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

    </div>
  );
};
