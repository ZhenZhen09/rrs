import { OSM_TILE_URL, OSM_TILE_ATTRIBUTION } from '../mapConfig';

describe('Mobile map provider', () => {
  it('uses OpenStreetMap tiles without a provider API key', () => {
    expect(OSM_TILE_URL).toBe('https://tile.openstreetmap.org/{z}/{x}/{y}.png');
    expect(OSM_TILE_ATTRIBUTION).toContain('OpenStreetMap');
    expect(OSM_TILE_URL).not.toContain('apiKey');
  });
});
