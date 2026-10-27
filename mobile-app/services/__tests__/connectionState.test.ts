import { classifyConnection } from '../connectionState';

describe('connection classification', () => {
  it('keeps unknown network state in checking until reachability is known', () => {
    expect(classifyConnection({ isConnected: null, isInternetReachable: null }, null)).toBe('checking');
    expect(classifyConnection({ isConnected: null, isInternetReachable: null }, false)).toBe('checking');
  });

  it('distinguishes no network from an unreachable Errands service', () => {
    expect(classifyConnection({ isConnected: false, isInternetReachable: false }, null)).toBe('no_network');
    expect(classifyConnection({ isConnected: true, isInternetReachable: true }, false)).toBe('service_unavailable');
  });

  it('reports online only after the service responds', () => {
    expect(classifyConnection({ isConnected: true, isInternetReachable: true }, true)).toBe('online');
  });
});
