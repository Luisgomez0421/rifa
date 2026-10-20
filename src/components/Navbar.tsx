import React from 'react';
import { Ticket, Shield, Search, Database, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

interface NavbarProps {
  activeTab: 'grid' | 'check' | 'admin';
  setActiveTab: (tab: 'grid' | 'check' | 'admin') => void;
  onOpenGuide: () => void;
  ticketPrice: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenGuide,
  ticketPrice,
}) => {
  const isConnected = isSupabaseConfigured();

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('grid')}>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Ticket className="w-6 h-6 sm:w-7 sm:h-7 text-slate-950 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg sm:text-xl text-white tracking-tight">
                  Mi Gran Rifa
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  100 Números
                </span>
              </div>
              <p className="text-xs text-slate-400">
                ${ticketPrice.toLocaleString('es-CO')} COP por número
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('grid')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'grid'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Ver Números</span>
            </button>

            <button
              onClick={() => setActiveTab('check')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'check'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Search className="w-4 h-4" />
              <span className="hidden md:inline">Consultar Mi Número</span>
              <span className="md:hidden">Consultar</span>
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'admin'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span className="hidden md:inline">Panel Admin</span>
              <span className="md:hidden">Admin</span>
            </button>
          </nav>

          {/* Supabase Status Pill */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenGuide}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                isConnected
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20 animate-pulse'
              }`}
              title="Haz clic para ver el estado y la guía de configuración de Supabase"
            >
              <Database className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">
                {isConnected ? 'Supabase Conectado' : 'Configurar Supabase'}
              </span>
              <span className="lg:hidden">
                {isConnected ? 'Conectado' : 'Setup'}
              </span>
              {isConnected ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              )}
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
