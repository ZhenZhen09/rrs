// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { AttendanceDashboard } from '../../src/app/pages/Admin/AttendanceDashboard';

vi.mock('../../src/app/context/RealTimeContext', () => ({ useRealTime: () => ({ socket: null }) }));
vi.mock('../../src/app/components/Admin/ConflictResolutionModal', () => ({ ConflictResolutionModal: () => null }));

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('shows compact icon-led attendance summary tiles on mobile', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
  const { container } = render(<AttendanceDashboard />);

  await waitFor(() => expect(fetch).toHaveBeenCalled());
  const summary = container.querySelector('[aria-label="Attendance summary"]');

  expect(summary?.className).toContain('grid-cols-5');
  expect(summary?.querySelectorAll('[data-attendance-stat]')).toHaveLength(5);
  expect(summary?.querySelector('.text-\\[10px\\]')).not.toBeNull();
  expect(container.querySelector('h1')?.className).toContain('text-lg');
  expect(container.querySelector('input[type="date"]')?.className).toContain('text-xs');
  expect(container.querySelector('[aria-label="Attendance records"]')).not.toBeNull();
});

it('shows one stacked mobile summary row and an expandable search control', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
  const { container, getByLabelText } = render(<AttendanceDashboard />);
  await waitFor(() => expect(fetch).toHaveBeenCalled());

  const summary = container.querySelector('[aria-label="Attendance summary"]');
  expect(summary?.className).toContain('grid-cols-5');
  expect([...summary!.querySelectorAll('[data-attendance-stat]')].every(tile => tile.className.includes('col-span-1'))).toBe(true);
  const firstTile = summary!.querySelector('[data-attendance-stat]')!;
  expect(firstTile.children[0].className).toContain('flex-col');
  expect(firstTile.children[0].querySelector('svg')!.compareDocumentPosition(firstTile.children[0].querySelector('span')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(firstTile.children[0].compareDocumentPosition(firstTile.querySelector('p')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

  const toggle = container.querySelector('[data-mobile-search-toggle]') as HTMLButtonElement;
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  fireEvent.click(toggle);
  expect(toggle.getAttribute('aria-expanded')).toBe('true');

  const search = getByLabelText('Search attendance records');
  expect(document.activeElement).toBe(search);
  fireEvent.keyDown(search, { key: 'Escape' });
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  expect(document.activeElement).toBe(toggle);
});

it('keeps the selected date records when an earlier date request finishes later', async () => {
  const pending: ((value: Response) => void)[] = [];
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(resolve => pending.push(resolve))));
  const { container, getAllByText, queryAllByText } = render(<AttendanceDashboard />);
  fireEvent.change(container.querySelector('input[type=date]')!, { target: { value: '2026-09-01' } });
  await waitFor(() => expect(pending).toHaveLength(2));
  const response = (name: string) => ({ ok: true, json: async () => [{ rider_id: name, rider_name: name, rider_email: `${name}@example.test`, status: 'present', reason: null, check_in_time: null, created_at: null, active_task_count: 0, integrity_score: 100 }] }) as Response;
  await act(async () => pending[1](response('Selected rider')));
  expect(getAllByText('Selected rider')).toBeTruthy();
  await act(async () => pending[0](response('Old rider')));
  expect(queryAllByText('Old rider')).toHaveLength(0);
  expect(getAllByText('Selected rider')).toBeTruthy();
});

it('shows loading during date changes and manual refreshes', async () => {
  const pending: ((value: Response) => void)[] = [];
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(resolve => pending.push(resolve))));
  const { container } = render(<AttendanceDashboard />);
  const spinner = () => container.querySelector('.lucide-refresh-ccw')!.classList.contains('animate-spin');
  const finish = async (index: number) => { await act(async () => pending[index]({ ok: true, json: async () => [] } as unknown as Response)); };
  expect(spinner()).toBe(true);
  await finish(0);
  expect(spinner()).toBe(false);
  fireEvent.change(container.querySelector('input[type=date]')!, { target: { value: '2026-09-02' } });
  expect(spinner()).toBe(true);
  await finish(1);
  expect(spinner()).toBe(false);
  fireEvent.click(container.querySelector('.lucide-refresh-ccw')!.closest('button')!);
  expect(spinner()).toBe(true);
  await finish(2);
  expect(spinner()).toBe(false);
});

