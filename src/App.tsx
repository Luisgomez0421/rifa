import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { HeroBanner } from './components/HeroBanner';
import { TicketGrid } from './components/TicketGrid';
import { ReservationModal } from './components/ReservationModal';
import { TicketReceiptModal } from './components/TicketReceiptModal';
import { CheckTicketModal } from './components/CheckTicketModal';
import { AdminPanel } from './components/AdminPanel';
import { SupabaseGuideModal } from './components/SupabaseGuideModal';
import {
  getActiveRaffle,
  getTickets,
  reserveTicket,
  confirmTicketPayment,
  releaseTicket,
} from './services/raffleService';
import { Raffle, Ticket, RaffleStats } from './types';
import { isSupabaseConfigured } from './lib/supabase';
import { Info, Sparkles, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'grid' | 'check' | 'admin'>('grid');
  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Modals state
  const [reservationTicket, setReservationTicket] = useState<Ticket | null>(null);
  const [receiptTicket, setReceiptTicket] = useState<Ticket | null>(null);
  const [showGuideModal, setShowGuideModal] = useState(false);

  // Load data
  const loadData = useCallback(async (showSpinner = false) => {
    if (showSpinner) setIsLoading(true);
    try {
      const activeRaffle = await getActiveRaffle();
      setRaffle(activeRaffle);

      const ticketList = await getTickets(activeRaffle.id);
      setTickets(ticketList);
    } catch (err) {
      console.error('Error loading raffle data:', err);
    } finally {
      if (showSpinner) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(true);

    // Auto-refresh tickets every 20 seconds to keep reservation holds and expiry in sync
    const timer = setInterval(() => {
      loadData(false);
    }, 20000);

    return () => clearInterval(timer);
  }, [loadData]);

  // Compute metrics
  const stats: RaffleStats = useMemo(() => {
    const total = tickets.length || 100;
    let available = 0;
    let reserved = 0;
    let paid = 0;

    tickets.forEach((t) => {
      if (t.status === 'available') available++;
      else if (t.status === 'reserved') reserved++;
      else if (t.status === 'paid') paid++;
    });

    const ticketPrice = raffle?.ticket_price || 20000;
    const totalRaised = paid * ticketPrice;
    const potentialTotal = total * ticketPrice;
    const percentageSold = total > 0 ? Math.round(((paid + reserved) / total) * 100) : 0;

    return {
      total,
      available,
      reserved,
      paid,
      totalRaised,
      potentialTotal,
      percentageSold,
    };
  }, [tickets, raffle]);

  // Handle clicking a number on the grid
  const handleSelectTicket = (ticket: Ticket) => {
    if (ticket.status === 'available') {
      setReservationTicket(ticket);
    } else {
      // If already reserved or paid, show receipt / information
      setReceiptTicket(ticket);
    }
  };

  // Lucky Number generator (Pick random available number)
  const handleSelectRandom = () => {
    const available = tickets.filter((t) => t.status === 'available');
    if (available.length === 0) {
      alert('¡Todos los números han sido tomados o reservados!');
      return;
    }
    const randomIndex = Math.floor(Math.random() * available.length);
    const luckyTicket = available[randomIndex];
    setReservationTicket(luckyTicket);
  };

  // Confirm reservation
  const handleReserve = async (data: {
    name: string;
    email: string;
    phone: string;
    paymentReference: string;
  }) => {
    if (!reservationTicket || !raffle) return;
    setIsActionLoading(true);

    try {
      const result = await reserveTicket({
        raffle_id: raffle.id,
        number: reservationTicket.number,
        customer_name: data.name,
        customer_email: data.email,
        customer_phone: data.phone,
        payment_reference: data.paymentReference,
        hold_minutes: 15,
      });

      if (!result.success) {
        throw new Error(result.message);
      }

      // Close reservation modal
      setReservationTicket(null);

      // Refresh list
      await loadData(false);

      // Open digital receipt for participant
      const updatedTicket: Ticket = {
        ...reservationTicket,
        status: 'reserved',
        customer_name: data.name,
        customer_email: data.email,
        customer_phone: data.phone,
        payment_reference: data.paymentReference,
        reserved_at: new Date().toISOString(),
        expires_at: result.expires_at || new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      };
      setReceiptTicket(updatedTicket);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Admin: Confirm payment
  const handleConfirmPayment = async (ticketId: string) => {
    setIsActionLoading(true);
    try {
      await confirmTicketPayment(ticketId);
      await loadData(false);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Admin: Release ticket
  const handleReleaseTicket = async (ticketId: string) => {
    setIsActionLoading(true);
    try {
      await releaseTicket(ticketId);
      await loadData(false);
    } finally {
      setIsActionLoading(false);
    }
  };

  const isConfigured = isSupabaseConfigured();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenGuide={() => setShowGuideModal(true)}
        ticketPrice={raffle?.ticket_price || 20000}
      />

      {/* Demo / Setup Banner */}
      {!isConfigured && (
        <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 border-b border-amber-500/30 px-4 py-2.5 text-xs text-amber-200">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Modo Demo Activo:</strong> Estás probando la app localmente. Cuando crees tu proyecto <em>mi-gran-rifa</em> en Supabase, pulsa <strong>"Configurar Supabase"</strong> arriba a la derecha.
              </span>
            </div>
            <button
              onClick={() => setShowGuideModal(true)}
              className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold text-[11px] hover:bg-amber-400 transition-colors shrink-0"
            >
              Ver Instrucciones
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {isLoading && !raffle ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-slate-400">
              Cargando Mi Gran Rifa...
            </p>
          </div>
        ) : (
          <>
            {activeTab === 'grid' && raffle && (
              <>
                <HeroBanner
                  raffle={raffle}
                  stats={stats}
                  onSelectRandom={handleSelectRandom}
                />

                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                    <span>Tablero de 100 Números</span>
                  </h2>

                  <button
                    onClick={() => loadData(false)}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                    title="Actualizar números"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Refrescar</span>
                  </button>
                </div>

                <TicketGrid
                  tickets={tickets}
                  onSelectTicket={handleSelectTicket}
                  selectedNumber={reservationTicket?.number}
                />
              </>
            )}

            {activeTab === 'check' && raffle && (
              <CheckTicketModal
                tickets={tickets}
                raffle={raffle}
                onViewReceipt={(ticket) => setReceiptTicket(ticket)}
              />
            )}

            {activeTab === 'admin' && raffle && (
              <AdminPanel
                tickets={tickets}
                raffle={raffle}
                stats={stats}
                onConfirmPayment={handleConfirmPayment}
                onReleaseTicket={handleReleaseTicket}
                isLoading={isActionLoading}
              />
            )}
          </>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            Mi Gran Rifa &copy; {new Date().getFullYear()} — Desarrollado con React, Vite, TypeScript &amp; Supabase
          </p>
          <div className="flex items-center gap-4 text-slate-400">
            <button onClick={() => setShowGuideModal(true)} className="hover:text-emerald-400">
              Guía Supabase
            </button>
            <span>•</span>
            <button onClick={() => setActiveTab('admin')} className="hover:text-emerald-400">
              Acceso Organizador
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {reservationTicket && raffle && (
        <ReservationModal
          ticket={reservationTicket}
          raffle={raffle}
          onClose={() => setReservationTicket(null)}
          onReserve={handleReserve}
          isLoading={isActionLoading}
        />
      )}

      {receiptTicket && raffle && (
        <TicketReceiptModal
          ticket={receiptTicket}
          raffle={raffle}
          onClose={() => setReceiptTicket(null)}
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
