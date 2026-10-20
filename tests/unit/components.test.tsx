import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { HeroSection } from '../../src/components/raffle/HeroSection';
import { TicketGrid } from '../../src/components/raffle/TicketGrid';
import { Raffle, RaffleNumber, DashboardMetrics } from '../../src/types';

describe('Pruebas de Componentes UI (React Testing Library)', () => {
  const mockRaffle: Raffle = {
    id: 'raffle-1',
    name: 'Mi Gran Rifa',
    description: 'Sorteo oficial de 100 números.',
    prize_description: 'Premio pendiente de configuración por el administrador.',
    price_cop: 10000,
    status: 'active',
    hold_duration_minutes: 30,
  };

  const mockMetrics: DashboardMetrics = {
    totalNumbers: 100,
    availableCount: 95,
    reservedCount: 3,
    paidCount: 2,
    reservationsCount: 5,
    confirmedRevenue: 20000,
    pendingRevenue: 30000,
    occupancyPercent: 5,
  };

  const mockNumbers: RaffleNumber[] = Array.from({ length: 100 }, (_, i) => ({
    id: `num-${i}`,
    raffle_id: 'raffle-1',
    number: i,
    status: i === 7 ? 'reserved' : i === 25 ? 'paid' : 'available',
  }));

  it('HeroSection muestra el nombre, precio COP y texto del premio', () => {
    render(
      <HeroSection
        raffle={mockRaffle}
        metrics={mockMetrics}
        selectedCount={0}
        onClearSelection={vi.fn()}
        onProceedToReserve={vi.fn()}
      />
    );

    expect(screen.getByText('Mi Gran Rifa')).toBeInTheDocument();
    expect(screen.getByText('Premio pendiente de configuración por el administrador.')).toBeInTheDocument();
    // Precio en COP
    expect(screen.getByText(/10\.000/)).toBeInTheDocument();
  });

  it('TicketGrid renderiza los 100 números con formato estricto de dos dígitos', () => {
    const handleToggle = vi.fn();
    render(
      <TicketGrid
        numbers={mockNumbers}
        selectedNumbers={[]}
        onToggleNumber={handleToggle}
        onSelectLuckyNumbers={vi.fn()}
      />
    );

    // Debe mostrar "00" y "09", no "0" ni "9"
    expect(screen.getByText('00')).toBeInTheDocument();
    expect(screen.getByText('09')).toBeInTheDocument();
    expect(screen.getByText('99')).toBeInTheDocument();
  });

  it('hacer clic en un número disponible dispara la selección', () => {
    const handleToggle = vi.fn();
    render(
      <TicketGrid
        numbers={mockNumbers}
        selectedNumbers={[]}
        onToggleNumber={handleToggle}
        onSelectLuckyNumbers={vi.fn()}
      />
    );

    // Clic en número 00
    const btn00 = screen.getByText('00').closest('button');
    expect(btn00).not.toBeNull();
    fireEvent.click(btn00!);

    expect(handleToggle).toHaveBeenCalledWith(0);
  });

  it('los números reservados y pagados están deshabilitados para selección', () => {
    render(
      <TicketGrid
        numbers={mockNumbers}
        selectedNumbers={[]}
        onToggleNumber={vi.fn()}
        onSelectLuckyNumbers={vi.fn()}
      />
    );

    const btn07 = screen.getByText('07').closest('button'); // reserved
    const btn25 = screen.getByText('25').closest('button'); // paid

    expect(btn07).toBeDisabled();
    expect(btn25).toBeDisabled();
  });
});
