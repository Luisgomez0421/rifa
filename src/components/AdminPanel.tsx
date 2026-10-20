import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, RotateCcw, Download, Search } from 'lucide-react';
import { Ticket, Raffle, RaffleStats } from '../types';

interface AdminPanelProps {
  tickets: Ticket[];
  raffle: Raffle;
  stats: RaffleStats;
  onConfirmPayment: (ticketId: string) => Promise<void>;
  onReleaseTicket: (ticketId: string) => Promise<void>;
  isLoading: boolean;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  tickets,
  raffle,
  stats,
  onConfirmPayment,
  onReleaseTicket,
  isLoading,
}) => {
  const [filter, setFilter] = useState<'all' | 'reserved' | 'paid' | 'available'>('reserved');
  const [search, setSearch] = useState('');
  const [actionTicketId, setActionTicketId] = useState<string | null>(null);

  const filteredTickets = tickets.filter((t) => {
    if (filter !== 'all' && t.status !== filter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        t.number.includes(q) ||
        t.customer_name?.toLowerCase().includes(q) ||
        t.customer_phone?.includes(q) ||
        t.payment_reference?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleConfirm = async (id: string) => {
    setActionTicketId(id);
    try {
      await onConfirmPayment(id);
    } finally {
      setActionTicketId(null);
    }
  };

  const handleRelease = async (id: string) => {
    if (window.confirm('¿Seguro que deseas liberar este número? Los datos del cliente se borrarán.')) {
      setActionTicketId(id);
      try {
        await onReleaseTicket(id);
      } finally {
        setActionTicketId(null);
      }
    }
  };

  const exportCSV = () => {
    const headers = ['Numero', 'Estado', 'Nombre Cliente', 'Telefono', 'Email', 'Referencia Pago', 'Fecha Reserva', 'Fecha Pago'];
    const rows = tickets.map((t) => [
      t.number,
      t.status,
      `"${t.customer_name || ''}"`,
      `"${t.customer_phone || ''}"`,
      `"${t.customer_email || ''}"`,
      `"${t.payment_reference || ''}"`,
      t.reserved_at || '',
      t.paid_at || '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `participantes_rifa_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Header and Summary Cards */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">Panel de Administración</h2>
              <p className="text-xs text-slate-400">
                Gestión y validación de pagos para: <strong>{raffle.title}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 shadow-sm transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Descargar Lista (CSV)</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <span className="text-xs text-slate-400 font-medium block">Total Recaudado</span>
            <span className="text-2xl font-black text-emerald-400 block mt-1">
              ${stats.totalRaised.toLocaleString('es-CO')}
            </span>
            <span className="text-[11px] text-slate-500">{stats.paid} boletos confirmados</span>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <span className="text-xs text-slate-400 font-medium block">Por Validar Pago</span>
            <span className="text-2xl font-black text-amber-400 block mt-1">
              {stats.reserved}
            </span>
            <span className="text-[11px] text-slate-500">Boletos reservados</span>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <span className="text-xs text-slate-400 font-medium block">Disponibles</span>
            <span className="text-2xl font-black text-teal-400 block mt-1">
              {stats.available}
            </span>
            <span className="text-[11px] text-slate-500">Sin reservar</span>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <span className="text-xs text-slate-400 font-medium block">Meta Total (100)</span>
            <span className="text-2xl font-black text-white block mt-1">
              ${stats.potentialTotal.toLocaleString('es-CO')}
            </span>
            <span className="text-[11px] text-slate-500">Al vender los 100</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('reserved')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filter === 'reserved'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            Por Confirmar ({stats.reserved})
          </button>
          <button
            onClick={() => setFilter('paid')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filter === 'paid'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            Pagados ({stats.paid})
          </button>
          <button
            onClick={() => setFilter('available')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filter === 'available'
                ? 'bg-slate-700 text-white font-bold'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            Disponibles ({stats.available})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filter === 'all'
                ? 'bg-slate-700 text-white font-bold'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            Todos ({tickets.length})
          </button>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filtrar por nombre, teléfono o #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 font-semibold">
              <tr>
                <th className="px-5 py-3.5">Número</th>
                <th className="px-5 py-3.5">Estado</th>
                <th className="px-5 py-3.5">Participante</th>
                <th className="px-5 py-3.5">WhatsApp / Contacto</th>
                <th className="px-5 py-3.5">Referencia</th>
                <th className="px-5 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-sans">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                    No hay boletos que coincidan con este filtro.
                  </td>
                </tr>
              ) : (
                filteredTickets.map((t) => {
                  const isBusy = isLoading && actionTicketId === t.id;
                  return (
                    <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-base font-extrabold text-white">
                        {t.number}
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            t.status === 'paid'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : t.status === 'reserved'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-white">
                          {t.customer_name || <span className="text-slate-500 font-normal">Sin asignar</span>}
                        </div>
                        {t.customer_email && (
                          <div className="text-[11px] text-slate-400">{t.customer_email}</div>
                        )}
                      </td>

                      <td className="px-5 py-3.5 font-mono">
                        {t.customer_phone ? (
                          <a
                            href={`https://wa.me/${t.customer_phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-400 hover:underline flex items-center gap-1"
                          >
                            <span>{t.customer_phone}</span>
                          </a>
                        ) : (
                          <span className="text-slate-500">N/A</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="text-slate-300 font-mono text-[11px]">
                          {t.payment_reference || <span className="text-slate-600">—</span>}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right space-x-2">
                        {t.status === 'reserved' && (
                          <button
                            onClick={() => handleConfirm(t.id)}
                            disabled={isBusy}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors disabled:opacity-50"
                            title="Confirmar pago de este boleto"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Confirmar Pago</span>
                          </button>
                        )}

                        {t.status !== 'available' && (
                          <button
                            onClick={() => handleRelease(t.id)}
                            disabled={isBusy}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 font-semibold text-xs transition-colors disabled:opacity-50"
                            title="Liberar número a disponible"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Liberar</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
