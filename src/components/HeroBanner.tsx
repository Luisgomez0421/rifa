import React, { useState, useEffect } from 'react';
import { Trophy, Calendar, DollarSign, Clock, Users } from 'lucide-react';
import { Raffle, RaffleStats } from '../types';

interface HeroBannerProps {
  raffle: Raffle;
  stats: RaffleStats;
  onSelectRandom: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ raffle, stats, onSelectRandom }) => {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateTime = () => {
      const target = new Date(raffle.draw_date).getTime();
      const now = new Date().getTime();
      const difference = target - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000),
      });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [raffle.draw_date]);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 shadow-2xl p-6 sm:p-8 lg:p-10 mb-8">
      {/* Background Glow Highlights */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left Column: Information & Actions */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm font-semibold">
            <Trophy className="w-4 h-4 text-emerald-400" />
            <span>Sorteo Oficial 100 Números (00 al 99)</span>
          </div>

          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
              {raffle.prize_title}
            </h1>
            <p className="mt-3 text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl">
              {raffle.description}
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-3.5 border border-slate-700/60">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>Valor Boleto</span>
              </div>
              <p className="mt-1 text-lg sm:text-xl font-bold text-white">
                ${raffle.ticket_price.toLocaleString('es-CO')}
              </p>
            </div>

            <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-3.5 border border-slate-700/60">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                <Users className="w-3.5 h-3.5 text-teal-400" />
                <span>Disponibles</span>
              </div>
              <p className="mt-1 text-lg sm:text-xl font-bold text-emerald-400">
                {stats.available} <span className="text-xs text-slate-400 font-normal">/ {stats.total}</span>
              </p>
            </div>

            <div className="col-span-2 sm:col-span-1 bg-slate-800/60 backdrop-blur-sm rounded-xl p-3.5 border border-slate-700/60">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>Total Recaudado</span>
              </div>
              <p className="mt-1 text-lg sm:text-xl font-bold text-amber-400">
                ${stats.totalRaised.toLocaleString('es-CO')}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-300">
              <span className="font-medium">Progreso de venta</span>
              <span className="font-bold text-emerald-400">{stats.percentageSold}% vendido</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700">
              <div
                className="bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.max(stats.percentageSold, 3)}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>{stats.paid} Pagados</span>
              <span>{stats.reserved} Reservados</span>
              <span>{stats.available} Libres</span>
            </div>
          </div>

          {/* Lucky Button */}
          <div className="pt-2">
            <button
              onClick={onSelectRandom}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all transform active:scale-95"
            >
              <span>🎲 Elegir Número de la Suerte al Azar</span>
            </button>
          </div>
        </div>

        {/* Right Column: Prize Image & Countdown Card */}
        <div className="lg:col-span-5 space-y-4">
          <div className="relative rounded-2xl overflow-hidden border border-slate-700 shadow-xl group">
            <img
              src={raffle.prize_image_url}
              alt={raffle.prize_title}
              className="w-full h-56 sm:h-64 object-cover object-center group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
            
            <div className="absolute bottom-4 left-4 right-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Premio Mayor
              </span>
              <h3 className="text-lg font-bold text-white truncate">
                {raffle.prize_title}
              </h3>
            </div>
          </div>

          {/* Countdown timer card */}
          <div className="bg-slate-800/80 backdrop-blur rounded-xl p-4 border border-slate-700">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-3">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Tiempo restante para el gran sorteo:</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-slate-900/80 rounded-lg p-2 border border-slate-700/80">
                <span className="block text-xl font-extrabold text-white">{timeLeft.days}</span>
                <span className="block text-[10px] text-slate-400 uppercase">Días</span>
              </div>
              <div className="bg-slate-900/80 rounded-lg p-2 border border-slate-700/80">
                <span className="block text-xl font-extrabold text-white">{timeLeft.hours}</span>
                <span className="block text-[10px] text-slate-400 uppercase">Horas</span>
              </div>
              <div className="bg-slate-900/80 rounded-lg p-2 border border-slate-700/80">
                <span className="block text-xl font-extrabold text-white">{timeLeft.minutes}</span>
                <span className="block text-[10px] text-slate-400 uppercase">Min</span>
              </div>
              <div className="bg-slate-900/80 rounded-lg p-2 border border-slate-700/80">
                <span className="block text-xl font-extrabold text-emerald-400">{timeLeft.seconds}</span>
                <span className="block text-[10px] text-slate-400 uppercase">Seg</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
