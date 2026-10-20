import React, { useState, useEffect } from 'react';
import {
  Shield,
  LogOut,
  Search,
  CheckCircle2,
  XCircle,
  Download,
  Settings,
  DollarSign,
  Clock,
  Layers,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import {
  getAdminReservations,
  confirmReservationPayment,
  cancelReservationAdmin,
  updateRaffleSettings,
} from '../../services/raffleService';
import { Raffle, Reservation, DashboardMetrics } from '../../types';
import { formatCOP, formatDate } from '../../utils/formatters';

interface AdminPanelProps {
  raffle: Raffle;
  metrics: DashboardMetrics;
  onRefresh: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  raffle,
  metrics,
  onRefresh,
}) => {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Tab: 'reservations' | 'settings'
  const [currentSection, setCurrentSection] = useState<'reservations' | 'settings'>('reservations');

  // Reservations state
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [reservationsLoading, setReservationsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'reserved' | 'paid' | 'cancelled'>('reserved');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Settings form state
  const [settingsName, setSettingsName] = useState(raffle.name);
  const [settingsDesc, setSettingsDesc] = useState(raffle.description);
  const [settingsPrize, setSettingsPrize] = useState(raffle.prize_description);
  const [settingsStatus, setSettingsStatus] = useState(raffle.status);
  const [settingsHoldMin, setSettingsHoldMin] = useState(raffle.hold_duration_minutes || 30);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);

  // Check auth session on mount
  useEffect(() => {
    if (isSupabaseConfigured() && supabase) {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          setIsAuthenticated(true);
        }
      });
    } else {
      // In local demo mode, check session storage
      if (sessionStorage.getItem('mi_gran_rifa_demo_admin') === 'true') {
        setIsAuthenticated(true);
      }
    }
  }, []);

  // Load reservations when authenticated
  const loadReservations = async () => {
    setReservationsLoading(true);
    try {
      const data = await getAdminReservations(raffle.id);
      setReservations(data);
    } finally {
      setReservationsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadReservations();
    }
  }, [isAuthenticated, raffle.id]);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      if (isSupabaseConfigured() && supabase) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });
        if (error) {
          throw new Error(error.message);
        }
        setIsAuthenticated(true);
      } else {
        // Fallback for offline / development testing
        if (password.length >= 6) {
          sessionStorage.setItem('mi_gran_rifa_demo_admin', 'true');
          setIsAuthenticated(true);
        } else {
          throw new Error('En modo desarrollo local la contraseña debe tener al menos 6 caracteres.');
        }
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Error al iniciar sesión');
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    if (isSupabaseConfigured() && supabase) {
      await supabase.auth.signOut();
    }
    sessionStorage.removeItem('mi_gran_rifa_demo_admin');
    setIsAuthenticated(false);
  };

  // Confirm Payment
  const handleConfirm = async (resId: string) => {
    if (!window.confirm('¿Confirmas que recibiste el pago correspondiente para esta reserva?')) return;
    setActionLoadingId(resId);
    try {
      const res = await confirmReservationPayment(resId);
      if (!res.success) {
        alert(res.message);
      } else {
        await loadReservations();
        onRefresh();
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  // Cancel Reservation
  const handleCancel = async (resId: string) => {
    const reason = window.prompt('Ingresa el motivo de la cancelación para la auditoría:', 'Pago no recibido / Cancelado por el usuario');
    if (reason === null) return;

    setActionLoadingId(resId);
    try {
      const res = await cancelReservationAdmin(resId, reason);
      if (!res.success) {
        alert(res.message);
      } else {
        await loadReservations();
        onRefresh();
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaving(true);
    setSettingsMessage(null);

    try {
      const res = await updateRaffleSettings(raffle.id, {
        name: settingsName,
        description: settingsDesc,
        prize_description: settingsPrize,
        status: settingsStatus,
        hold_duration_minutes: Number(settingsHoldMin),
      });

      if (res.success) {
        setSettingsMessage('Configuración actualizada exitosamente.');
        onRefresh();
      } else {
        setSettingsMessage(`Error: ${res.message}`);
      }
    } finally {
      setSettingsSaving(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Codigo Reserva',
      'Estado',
      'Numeros',
      'Cantidad',
      'Total COP',
      'Nombre Participante',
      'Telefono',
      'Fecha Creacion',
      'Fecha Expiracion',
    ];

    const rows = reservations.map((r) => [
      r.public_code,
      r.status,
      `"${(r.numbers || []).join(', ')}"`,
      r.quantity,
      r.total_price_cop,
      `"${r.participants?.full_name || ''}"`,
      `"${r.participants?.phone || ''}"`,
      r.created_at,
      r.expires_at,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `reservas_mi_gran_rifa_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered reservations list
  const filteredReservations = reservations.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const codeMatch = r.public_code.toLowerCase().includes(q);
      const nameMatch = r.participants?.full_name.toLowerCase().includes(q);
      const phoneMatch = r.participants?.phone.includes(q);
      const numMatch = (r.numbers || []).some((num) => num.includes(q));
      return codeMatch || nameMatch || phoneMatch || numMatch;
    }
    return true;
  });

  // Login View
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-8">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 text-center">
            Acceso Administrador
          </h2>
          <p className="text-xs text-slate-500 text-center mt-1 mb-6">
            Ingresa con tu correo y contraseña registrados en Supabase Auth
          </p>

          {authError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                required
                placeholder="admin@migranrifa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all disabled:opacity-50"
            >
              {authLoading ? 'Iniciando sesión...' : 'Ingresar al Panel'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Authenticated Admin Dashboard View
  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">
                Panel de Administración
              </h2>
              <p className="text-xs text-slate-500">
                Gestión oficial de <strong>{raffle.name}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
            >
              <Download className="w-4 h-4 text-blue-600" />
              <span>Exportar CSV</span>
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Salir</span>
            </button>
          </div>
        </div>

        {/* Dashboard Metrics (Section 11 Requirement: claramente diferenciar pagado de pendiente) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
            <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-bold">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>Total Recaudado (Pagado)</span>
            </div>
            <span className="text-2xl font-black text-emerald-800 block mt-1">
              {formatCOP(metrics.confirmedRevenue)}
            </span>
            <span className="text-[11px] text-emerald-700 font-medium">
              {metrics.paidCount} números confirmados
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
            <div className="flex items-center gap-1.5 text-amber-800 text-xs font-bold">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Pendiente de Pago</span>
            </div>
            <span className="text-2xl font-black text-amber-800 block mt-1">
              {formatCOP(metrics.pendingRevenue)}
            </span>
            <span className="text-[11px] text-amber-700 font-medium">
              {metrics.reservedCount} números apartados
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-1.5 text-slate-600 text-xs font-bold">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Ocupación de la Rifa</span>
            </div>
            <span className="text-2xl font-black text-slate-900 block mt-1">
              {metrics.occupancyPercent}%
            </span>
            <span className="text-[11px] text-slate-500">
              {metrics.paidCount + metrics.reservedCount} / 100 colocados
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-1.5 text-slate-600 text-xs font-bold">
              <span>Disponibles</span>
            </div>
            <span className="text-2xl font-black text-slate-900 block mt-1">
              {metrics.availableCount}
            </span>
            <span className="text-[11px] text-slate-500">
              Libres para venta
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mt-6 border-t border-slate-100 pt-4">
          <button
            onClick={() => setCurrentSection('reservations')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              currentSection === 'reservations'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Gestión de Reservas ({reservations.length})
          </button>
          <button
            onClick={() => setCurrentSection('settings')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              currentSection === 'settings'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Configuración de la Rifa</span>
          </button>
        </div>
      </div>

      {/* SECTION: Reservations Management */}
      {currentSection === 'reservations' && (
        <div className="space-y-4">
          
          {/* Filters & Search */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setStatusFilter('reserved')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === 'reserved'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Por Confirmar ({metrics.reservedCount})
              </button>
              <button
                onClick={() => setStatusFilter('paid')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === 'paid'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Pagadas ({metrics.paidCount})
              </button>
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todas ({reservations.length})
              </button>
            </div>

            <div className="relative sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por código, nombre, #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 font-bold">
                  <tr>
                    <th className="px-5 py-3.5">Código</th>
                    <th className="px-5 py-3.5">Estado</th>
                    <th className="px-5 py-3.5">Números</th>
                    <th className="px-5 py-3.5">Participante</th>
                    <th className="px-5 py-3.5">Total</th>
                    <th className="px-5 py-3.5">Expiración</th>
                    <th className="px-5 py-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {reservationsLoading ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                        Cargando reservas...
                      </td>
                    </tr>
                  ) : filteredReservations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                        No hay reservas registradas en este estado.
                      </td>
                    </tr>
                  ) : (
                    filteredReservations.map((res) => {
                      const isBusy = actionLoadingId === res.id;
                      const isPaid = res.status === 'paid';
                      const isReserved = res.status === 'reserved';

                      return (
                        <tr key={res.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
                            {res.public_code}
                          </td>

                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                isPaid
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                                  : isReserved
                                  ? 'bg-amber-50 text-amber-700 border border-amber-300'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {res.status}
                            </span>
                          </td>

                          <td className="px-5 py-3.5">
                            <div className="flex flex-wrap gap-1">
                              {(res.numbers || []).map((n) => (
                                <span
                                  key={n}
                                  className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-mono font-bold text-[11px]"
                                >
                                  {n}
                                </span>
                              ))}
                            </div>
                          </td>

                          <td className="px-5 py-3.5">
                            <div className="font-bold text-slate-900">
                              {res.participants?.full_name || 'N/A'}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {res.participants?.phone || 'N/A'}
                            </div>
                          </td>

                          <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
                            {formatCOP(res.total_price_cop)}
                          </td>

                          <td className="px-5 py-3.5 text-slate-500 text-[11px]">
                            {formatDate(res.expires_at)}
                          </td>

                          <td className="px-5 py-3.5 text-right space-x-2">
                            {isReserved && (
                              <button
                                onClick={() => handleConfirm(res.id)}
                                disabled={isBusy}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors disabled:opacity-50"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Confirmar Pago</span>
                              </button>
                            )}

                            {isReserved && (
                              <button
                                onClick={() => handleCancel(res.id)}
                                disabled={isBusy}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 text-xs font-semibold transition-colors disabled:opacity-50"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Cancelar</span>
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
      )}

      {/* SECTION: Settings Form */}
      {currentSection === 'settings' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm max-w-2xl">
          <h3 className="text-xl font-bold text-slate-900 mb-2">
            Configuración General del Sorteo
          </h3>
          <p className="text-xs text-slate-500 mb-6">
            Edita los textos públicos, premio y plazos de expiración.
          </p>

          {settingsMessage && (
            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-medium mb-6">
              {settingsMessage}
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs font-bold text-slate-700">
            <div>
              <label className="block mb-1">Nombre de la Rifa</label>
              <input
                type="text"
                required
                value={settingsName}
                onChange={(e) => setSettingsName(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 font-normal focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block mb-1">Descripción del Premio</label>
              <textarea
                rows={3}
                required
                value={settingsPrize}
                onChange={(e) => setSettingsPrize(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 font-normal focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block mb-1">Descripción General</label>
              <textarea
                rows={2}
                value={settingsDesc}
                onChange={(e) => setSettingsDesc(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 font-normal focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1">Estado de la Rifa</label>
                <select
                  value={settingsStatus}
                  onChange={(e) => setSettingsStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 font-normal focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Activa (Abierta al público)</option>
                  <option value="paused">Pausada</option>
                  <option value="finished">Finalizada</option>
                </select>
              </div>

              <div>
                <label className="block mb-1">Plazo Expiración (Minutos)</label>
                <input
                  type="number"
                  min="5"
                  max="1440"
                  required
                  value={settingsHoldMin}
                  onChange={(e) => setSettingsHoldMin(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 font-normal focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={settingsSaving}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md transition-all disabled:opacity-50"
              >
                {settingsSaving ? 'Guardando...' : 'Guardar Configuración'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
