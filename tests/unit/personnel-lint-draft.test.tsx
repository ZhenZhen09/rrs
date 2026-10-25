// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PersonnelV2Page } from '../../src/app/personnel-v2/PersonnelV2Page';

vi.mock('../../src/app/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'personnel', name: 'Personnel' }, logout: vi.fn() }) }));
vi.mock('../../src/app/context/DataContext', () => ({ useData: () => ({ requests: [], fetchWithAuth: vi.fn(), refreshData: vi.fn(), cancelRequest: vi.fn() }) }));
vi.mock('../../src/app/components/MapPicker', () => ({ MapPickerContent: () => null }));
vi.mock('react-leaflet', () => ({ CircleMarker: () => null, MapContainer: () => null, Polyline: () => null, TileLayer: () => null, Tooltip: () => null, useMap: vi.fn() }));

describe('personnel draft first render', () => {
  beforeEach(() => localStorage.clear());

  it('restores the saved wizard step and recipient before effects run', () => {
    localStorage.setItem('personnel-v2-draft:personnel', JSON.stringify({ step: 3, draft: { recipient: 'Saved recipient' } }));
    expect(renderToStaticMarkup(<PersonnelV2Page />)).toContain('Saved recipient');
  });

  it('restores flat draft details on the request step', () => {
    localStorage.setItem('personnel-v2-draft:personnel', JSON.stringify({ date: '2030-05-15' }));
    expect(renderToStaticMarkup(<PersonnelV2Page />)).toContain('2030-05-15');
  });

  it('handles malformed saved drafts', () => {
    localStorage.setItem('personnel-v2-draft:personnel', '{broken');
    expect(() => renderToStaticMarkup(<PersonnelV2Page />)).not.toThrow();
  });
});
