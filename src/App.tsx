import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/layout/Navbar';
import { HeroSection } from './components/raffle/HeroSection';
import { TicketGrid } from './components/raffle/TicketGrid';
import { RegistrationModal } from './components/raffle/RegistrationModal';
import { ReservationSuccessModal } from './components/raffle/ReservationSuccessModal';
import { ConsultReservation } from './components/raffle/ConsultReservation';
import { AdminPanel } from './components/admin/AdminPanel';
import { SupabaseGuideModal } from './components/layout/SupabaseGuideModal';
import {
  getActiveRaffle,
  getRaffleNumbers,
  createReservationAtomic,
  getAdminMetrics,
  subscribeToRaffleNumbers,
} from './services/raffleService';
import { Raffle, RaffleNumber, DashboardMetrics, ReservationResponse } from './types';
import { isSupabaseConfigured } from './lib/supabase';
import { Sparkles, RefreshCw, Info } from 'lucide-react';

export const App: React.FC = () => {
  // Navigation: 'public' | 'consult' | 'admin'
  const [activeTab, setActiveTab] = useState<'public' | 'consult' | 'admin'>(() => {
    return window.location.pathname.startsWith('/admin') ? 'admin' : 'public';
  });

  // Core data
  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [numbers, setNumbers] = useState<RaffleNumber[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalNumbers: 100,
    availableCount: 100,
    reservedCount: 0,
    paidCount: 0,
    reservationsCount: 0,
    confirmedRevenue: 0,
    pendingRevenue: 0,
    occupancyPercent: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Multi-selection state
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);

  // Modals
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [reservationResult, setReservationResult] = useState<ReservationResponse | null>(null);
  const [lastBuyerName, setLastBuyerName] = useState('');
  const [lastReservedNumbers, setLastReservedNumbers] = useState<number[]>([]);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load raffle & numbers
  const loadData = useCallback(async (showSpinner = false) => {
    if (showSpinner) setIsLoading(true);
    try {
      const activeRaffle = await getActiveRaffle();
      setRaffle(activeRaffle);

      const nums = await getRaffleNumbers(activeRaffle.id);
      setNumbers(nums);

      const m = await getAdminMetrics(activeRaffle.id, nums);
      setMetrics(m);
    } catch (err) {
      console.error('Error al cargar datos de la rifa:', err);
    } finally {
      if (showSpinner) setIsLoading(false);
    }
  }, []);

  // Initial load and Realtime setup
  useEffect(() => {
    loadData(true);

    // Periodic check every 25 seconds for automatic expiration & sync
    const interval = setInterval(() => {
      loadData(false);
    }, 25000);

    return () => clearInterval(interval);
  }, [loadData]);

  // Supabase Realtime subscription when raffle is loaded
  useEffect(() => {
    if (!raffle) return;
    const unsubscribe = subscribeToRaffleNumbers(raffle.id, () => {
      loadData(false);
    });
    return () => {
      unsubscribe();
    };
  }, [raffle, loadData]);

  // Update browser URL on tab change without full reload
  const handleTabChange = (tab: 'public' | 'consult' | 'admin') => {
    setActiveTab(tab);
    const newPath = tab === 'admin' ? '/admin' : '/';
    window.history.pushState({}, '', newPath);
  };

  // Toggle number in multi-selection
  const handleToggleNumber = (num: number) => {
    setSelectedNumbers((prev) =>
      prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num]
    );
  };

  // Select random available numbers (Lucky Selector)
  const handleSelectLuckyNumbers = (count = 1) => {
    const available = numbers.filter((n) => n.status === 'available');
    if (available.length === 0) {
      alert('¡Todos los números han sido tomados!');
      return;
    }

    const availableShuffled = [...available].sort(() => Math.random() - 0.5);
    const chosen = availableShuffled.slice(0, count).map((n) => n.number);

    setSelectedNumbers((prev) => {
      const combined = new Set([...prev, ...chosen]);
      return Array.from(combined);
    });
  };

  // Submit reservation form
  const handleConfirmReservation = async (data: { fullName: string; phone: string }) => {
    if (!raffle || selectedNumbers.length === 0) return;
    setIsSubmitting(true);

    try {
      const res = await createReservationAtomic({
        raffle_id: raffle.id,
        full_name: data.fullName,
        phone: data.phone,
        numbers: selectedNumbers,
      });

      if (!res.success) {
        throw new Error(res.message);
      }

      setReservationResult(res);
      setLastBuyerName(data.fullName);
      setLastReservedNumbers([...selectedNumbers]);

      // Reset selection and close form
      setSelectedNumbers([]);
      setIsRegisterModalOpen(false);
      setIsSuccessModalOpen(true);

      // Refresh numbers
      await loadData(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isConfigured = isSupabaseConfigured();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onOpenGuide={() => setShowGuideModal(true)}
        priceCOP={raffle?.price_cop || 10000}
      />

      {/* Demo Mode Notice Banner if Supabase is not yet configured */}
      {!isConfigured && (
        <div className="bg-gradient-to-r from-amber-50 via-amber-100 to-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-900">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Modo Demo Activo:</strong> Estás probando la aplicación localmente. Cuando crees tu proyecto <em>mi-gran-rifa</em> en Supabase, pulsa <strong>"Configurar Supabase"</strong> arriba a la derecha.
              </span>
            </div>
            <button
              onClick={() => setShowGuideModal(true)}
              className="px-3 py-1 rounded-xl bg-amber-600 text-white font-bold text-[11px] hover:bg-amber-700 transition-colors shrink-0 shadow-sm"
            >
              Ver Pasos
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {isLoading && !raffle ? (
          <div className="flex flex-col items-center justify-center py-28 space-y-4">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-bold text-slate-600">
              Cargando Mi Gran Rifa...
            </p>
          </div>
        ) : (
          <>
            {/* TAB 1: Public Raffle Board */}
            {activeTab === 'public' && raffle && (
              <>
                <HeroSection
                  raffle={raffle}
                  metrics={metrics}
                  selectedCount={selectedNumbers.length}
                  onClearSelection={() => setSelectedNumbers([])}
                  onProceedToReserve={() => setIsRegisterModalOpen(true)}
                />

                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    <span>Tablero Oficial de 100 Números</span>
                  </h2>

                  <button
                    onClick={() => loadData(false)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
                    title="Actualizar disponibilidad"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Refrescar</span>
                  </button>
                </div>

                <TicketGrid
                  numbers={numbers}
                  selectedNumbers={selectedNumbers}
                  onToggleNumber={handleToggleNumber}
                  onSelectLuckyNumbers={handleSelectLuckyNumbers}
                />
              </>
            )}

            {/* TAB 2: Consult Reservation by Public Code */}
            {activeTab === 'consult' && (
              <ConsultReservation />
            )}

            {/* TAB 3: Admin Panel */}
            {activeTab === 'admin' && raffle && (
              <AdminPanel
                raffle={raffle}
                metrics={metrics}
                onRefresh={() => loadData(false)}
              />
            )}
          </>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            Mi Gran Rifa &copy; {new Date().getFullYear()} — Desarrollado con React, Vite, TypeScript &amp; Supabase
          </p>
          <div className="flex items-center gap-4 text-slate-600 font-semibold">
            <button onClick={() => setShowGuideModal(true)} className="hover:text-blue-600">
              Guía Supabase
            </button>
            <span>•</span>
            <button onClick={() => handleTabChange('admin')} className="hover:text-blue-600">
              Panel Admin
            </button>
          </div>
        </div>
      </footer>

      {/* MODALS */}
      {isRegisterModalOpen && raffle && (
        <RegistrationModal
          selectedNumbers={selectedNumbers}
          priceCOP={raffle.price_cop}
          onClose={() => setIsRegisterModalOpen(false)}
          onSubmit={handleConfirmReservation}
          isLoading={isSubmitting}
        />
      )}

      {isSuccessModalOpen && reservationResult && (
        <ReservationSuccessModal
          data={reservationResult}
          participantName={lastBuyerName}
          numbers={lastReservedNumbers}
          onClose={() => setIsSuccessModalOpen(false)}
        />
      )}

      {showGuideModal && (
        <SupabaseGuideModal
          onClose={() => setShowGuideModal(false)}
          onRefreshApp={() => loadData(true)}
        />
      )}

    </div>
  );
};
export default App;
