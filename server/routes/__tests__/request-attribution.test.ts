import { describe, expect, it } from 'vitest';
import { resolveRequestAttribution } from '../../utils/requestAttribution';

describe('request attribution', () => {
  it('uses the authenticated personnel profile instead of submitted identity fields', () => {
    const attribution = resolveRequestAttribution(
      { id: 'personnel-a', role: 'personnel' },
      { name: 'Alice Personnel', department: 'Operations' },
      { requesterId: 'personnel-b', requesterName: 'Bob Personnel', department: 'Finance' },
    );

    expect(attribution).toEqual({
      requesterId: 'personnel-a',
      requesterName: 'Alice Personnel',
      department: 'Operations',
    });
  });

  it('preserves admin-created requests made on behalf of another requester', () => {
    const attribution = resolveRequestAttribution(
      { id: 'admin-a', role: 'admin' },
      { name: 'Admin A', department: 'Administration' },
      { requesterId: 'personnel-b', requesterName: 'Bob Personnel', department: 'Finance' },
    );

    expect(attribution).toEqual({
      requesterId: 'personnel-b',
      requesterName: 'Bob Personnel',
      department: 'Finance',
    });
  });
});
