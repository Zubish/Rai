import { describe, expect, it } from 'vitest';
import { connectionState, connectionReply } from './connection-state.mjs';

const verified = { mode: 'connected', tenantId: 'totalenergies', userId: 'user', branchId: 'lagos', branchIds: ['lagos'], capabilities: ['inventory_analytics'], delegatedToken: 'x'.repeat(43) };
describe('authoritative connection replies', () => {
  it('never presents a demo identity as a live connection', () => {
    const context = { ...verified, mode: 'demo', branchId: 'abuja-sickbay' };
    expect(connectionState(context)).toEqual({ connected: false, tenantId: null, branchId: null, mode: 'demo' });
    for (const question of ['are you connected to rxledger', 'which branch am i currently on', "but i don't seem to be signed in, so how do you know this?", 'what is my current workspace?', 'do you have access to my RxLedger data?']) {
      const reply = connectionReply(question, context);
      expect(reply).toContain('not connected');
      expect(reply).not.toContain('abuja');
    }
  });
  it('does not equate a configured service key with an authenticated session', () => {
    expect(connectionState({ tenantId: 'totalenergies', branchId: 'lagos' }).connected).toBe(false);
    expect(connectionState({ ...verified, delegatedToken: undefined }).connected).toBe(false);
    expect(connectionState({ ...verified, branchIds: ['other'] }).connected).toBe(false);
  });
  it('reports only a verified consented scope and does not intercept analysis', () => {
    expect(connectionReply('Which branch am I on?', verified)).toContain('lagos');
    expect(connectionReply('Are you connected to RxLedger?', verified)).toContain('read-only');
    expect(connectionReply('Which products should I reorder?', verified)).toBeNull();
  });
});
