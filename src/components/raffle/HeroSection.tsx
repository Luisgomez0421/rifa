import React from 'react';
import { Gift, Sparkles, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Raffle, DashboardMetrics } from '../../types';
import { formatCOP } from '../../utils/formatters';

interface HeroSectionProps {
  raffle: Raffle;
  metrics: DashboardMetrics;
  selectedCount: number;
  onClearSelection: () => void;
  onProceedToReserve: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  raffle,
  metrics,
  selectedCount,
  onClearSelection,
  onProceedToReserve,
}) => {
  const currentTotal = selectedCount * raffle.price_cop;

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm mb-8 space-y-6">
      
      {/* Top Banner: Title & Prize Notice */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Sorteo Oficial 100 Números (00 al 99)</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            {raffle.name}
          </h1>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            {raffle.description}
          </p>

          {/* Prize description card */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 via-cyan-50 to-emerald-50 border border-blue-200/80 flex items-start gap-3 mt-3">
            <Gift className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-900 block">
                Premio del Sorteo:
              </span>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">
                {raffle.prize_description}
              </p>
            </div>
          </div>
        </div>

        {/* Price & Unit Metric Card */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md md:min-w-[260px] text-center flex flex-col justify-center">
          <span className="text-xs uppercase font-bold tracking-wider text-cyan-400 block mb-1">
            Precio por Número
          </span>
          <span className="text-3xl sm:text-4xl font-black tracking-tight font-mono text-white">
            {formatCOP(raffle.price_cop)}
          </span>
          <span className="text-xs text-slate-400 mt-1">
            Pesos Colombianos (COP)
          </span>
        </div>
      </div>

      {/* Metrics Row: 100 Numbers Availability */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
          <span className="text-xs font-medium text-slate-500 block">Total Números</span>
          <span className="text-2xl font-black text-slate-900 block mt-0.5">100</span>
          <span className="text-[11px] text-slate-400">Del 00 al 99</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200">
          <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Disponibles</span>
          </div>
          <span className="text-2xl font-black text-emerald-700 block mt-0.5">
            {metrics.availableCount}
          </span>
          <span className="text-[11px] text-emerald-600 font-medium">Listos para reservar</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200">
          <div className="flex items-center gap-1.5 text-amber-800 text-xs font-bold">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Reservados</span>
          </div>
          <span className="text-2xl font-black text-amber-700 block mt-0.5">
            {metrics.reservedCount}
          </span>
          <span className="text-[11px] text-amber-600 font-medium">En espera de pago</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200">
          <div className="flex items-center gap-1.5 text-rose-800 text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Pagados</span>
          </div>
          <span className="text-2xl font-black text-rose-700 block mt-0.5">
            {metrics.paidCount}
          </span>
          <span className="text-[11px] text-rose-600 font-medium">Confirmados</span>
        </div>
      </div>

      {/* Floating Selection Bar (when numbers are selected) */}
      {selectedCount > 0 && (
        <div className="p-4 rounded-2xl bg-blue-600 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-blue-600/20 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold text-lg">
              {selectedCount}
            </div>
            <div>
              <p className="text-sm font-bold">
                {selectedCount === 1 ? '1 número seleccionado' : `${selectedCount} números seleccionados`}
              </p>
              <p className="text-xs text-blue-100">
                Total a pagar: <strong className="text-white text-sm">{formatCOP(currentTotal)}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClearSelection}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors"
            >
              Limpiar
            </button>
            <button
              onClick={onProceedToReserve}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-blue-900 text-xs sm:text-sm font-black shadow-md transition-all active:scale-95"
            >
              Completar Reserva
            </button>
          </div>
        </div>
      )}

      {/* Live availability warning as requested by Prompt Maestro */}
      <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
        <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
        <span>
          <strong>Nota de disponibilidad:</strong> Los números pueden ser reservados por otros participantes en tiempo real mientras realizas tu selección.
        </span>
      </div>

    </div>
  );
};
