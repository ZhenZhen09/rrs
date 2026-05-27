import { describe, it, expect } from 'vitest';
import { formatDateTime } from '../dateUtils';

describe('Date Drift Audit: Web Admin Parser', () => {
  
  it('🛑 VULNERABILITY: Should correctly parse MySQL raw string (Manila)', () => {
    // Simulated DB string from audit script: "2026-05-26 13:19:46"
    // This is +08:00 (Manila)
    const dbString = "2026-05-26 13:19:46";
    const formatted = formatDateTime(dbString, 'h:mm a');
    
    console.log(`Audit: DB String [${dbString}] -> Formatted: [${formatted}]`);
    
    // If the browser assumes UTC, this will shift by -8 hours (to 5:19 AM)
    // If the browser assumes Local, it will stay 1:19 PM
    // We WANT it to stay 1:19 PM since the DB string is already Manila time.
    expect(formatted).toContain('1:19 PM');
  });

  it('🛑 VULNERABILITY: Should correctly parse ISO string (UTC)', () => {
    // Simulated Socket.io string: "2026-05-26T05:19:46Z" (which is 1:19 PM Manila)
    const socketString = "2026-05-26T05:19:46Z";
    const formatted = formatDateTime(socketString, 'h:mm a');
    
    console.log(`Audit: Socket String [${socketString}] -> Formatted: [${formatted}]`);
    
    // This should also result in 1:19 PM (Manila is +8)
    expect(formatted).toContain('1:19 PM');
  });

  it('🛑 DISCREPANCY CHECK: Do DB and Socket strings match after parsing?', () => {
    const dbString = "2026-05-26 13:19:46";
    const socketString = "2026-05-26T05:19:46Z";
    
    const dbRes = formatDateTime(dbString, 'h:mm a');
    const socketRes = formatDateTime(socketString, 'h:mm a');
    
    console.log(`Audit: DB Result: ${dbRes} vs Socket Result: ${socketRes}`);
    
    // If these are different, we have discovered the "Drift" bug!
    expect(dbRes).toBe(socketRes);
  });
});
