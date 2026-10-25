import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('leaflet', () => ({ default: { icon: vi.fn(), divIcon: vi.fn(), Marker: { prototype: { options: {} } } } }));
vi.mock('react-leaflet', () => ({ MapContainer: () => null, TileLayer: () => null, Marker: () => null, ZoomControl: () => null, useMap: vi.fn(), useMapEvents: vi.fn() }));

import { getRouteProgress } from '../../src/app/components/LiveTrackingMap';
import { MapPickerContent } from '../../src/app/components/MapPicker';

describe('map picker initial location', () => {
  it('renders the supplied business and address before effects run', () => {
    const html = renderToStaticMarkup(<MapPickerContent title="Pick" onLocationSelect={() => {}} initialLocation={{ lat: 14, lng: 121, address: 'Warehouse, Makati (Landmarks: Blue gate)' }} />);
    expect(html).toContain('Warehouse');
    expect(html).toContain('Makati');
    expect(html).toContain('Blue gate');
    expect(html).not.toContain('Loading...');
  });
});


describe('tracking route progress', () => {
  it('finds the closest road segment using coordinates projected into meters', () => {
    const progress = getRouteProgress([14.002, 121.001], [[14, 121], [14.002, 121], [14.002, 121.002]]);
    expect(progress.closestIndex).toBe(1);
    expect(progress.distance).toBeLessThan(1);
  });
  it('keeps an off-road point outside the 50 meter rerouting boundary', () => {
    const progress = getRouteProgress([14.003, 121.001], [[14.002, 121], [14.002, 121.002]]);
    expect(progress.distance).toBeGreaterThan(50);
  });
  it('has no segment to clip when the position or route is missing', () => {
    expect(getRouteProgress(null, [[14, 121], [15, 121]]).closestIndex).toBe(-1);
    expect(getRouteProgress([14, 121], []).closestIndex).toBe(-1);
  });
});
