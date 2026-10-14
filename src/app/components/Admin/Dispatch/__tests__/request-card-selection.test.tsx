// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RequestCard } from '../RequestCard';

afterEach(cleanup);

describe('RequestCard multi-select control', () => {
  it('makes the unchecked selection control easy to identify and accessible', () => {
    render(
      <RequestCard
        request={{
          request_id: 'request-1',
          dropoff_location: { businessName: 'Test Building' },
          recipient_name: 'Test Recipient',
          time_window: '09:00 - 10:00',
          status: 'pending',
          delivery_status: 'pending',
        } as any}
        isSelected={false}
        onClick={vi.fn()}
        onToggleSelection={vi.fn()}
      />,
    );

    const control = screen.getByRole('button', { name: /select request/i });
    expect(control.getAttribute('aria-pressed')).toBe('false');
    expect(control.className).toContain('border-slate-400');
    expect(control.querySelector('[data-checkbox-indicator]')).toBeNull();
  });

  it('uses a solid emerald square and check mark when selected', () => {
    render(
      <RequestCard
        request={{
          request_id: 'request-1',
          dropoff_location: { businessName: 'Test Building' },
          recipient_name: 'Test Recipient',
          time_window: '09:00 - 10:00',
          status: 'pending',
          delivery_status: 'pending',
        } as any}
        isSelected={false}
        isMultiSelected
        onClick={vi.fn()}
        onToggleSelection={vi.fn()}
      />,
    );

    const control = screen.getByRole('button', { name: /deselect request/i });
    expect(control.getAttribute('aria-pressed')).toBe('true');
    expect(control.className).toContain('bg-emerald-600');
    expect(control.querySelector('[data-checkbox-check]')).not.toBeNull();
  });
});
