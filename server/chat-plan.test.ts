import { describe, expect, it } from 'vitest';
import { planChat } from './chat-plan.mjs';

const now = new Date('2026-10-07T23:30:00Z');
describe('bounded pharmacy chat plans', () => {
  it('routes conversation without requesting operational datasets', () => {
    for (const message of ['Hi!', 'Hello Rai', 'Thank you', 'What can you do?']) expect(planChat(message, { now }).kind).toBe('conversation');
    expect(planChat('Can you help me?', { now }).capabilities).toEqual([]);
  });
  it('interprets relative dates in Lagos rather than UTC', () => {
    expect(planChat('Show inventory yesterday', { now }).dateRange).toEqual({ startDate: '2026-10-07', endDate: '2026-10-07', timezone: 'Africa/Lagos' });
    expect(planChat('Show stock today', { now }).dateRange.startDate).toBe('2026-10-08');
    expect(planChat('Sales last month', { now }).dateRange).toMatchObject({ startDate: '2026-09-01', endDate: '2026-09-30' });
  });
  it('reuses the analytical topic for a date-only follow-up', () => {
    const previous = planChat('Inventory last month', { now });
    expect(planChat('And yesterday?', { now, previous })).toMatchObject({ kind: 'analytics', capabilities: ['inventory_analytics'], dateRange: { startDate: '2026-10-07', endDate: '2026-10-07' } });
    expect(planChat('And yesterday?', { now }).kind).toBe('clarification');
  });
  it('rejects impossible, reversed and unbounded date requests', () => {
    for (const question of ['Inventory 2026-02-30', 'Inventory 2026-10-08 to 2026-10-01', 'Sales last 999 days', 'Sales in April', 'Forecast next month']) expect(planChat(question, { now }).kind).toBe('clarification');
  });
  it('does not silently switch branches or invent clinical capability', () => {
    expect(planChat('Show stock for Abuja branch', { now, branchId: 'lagos' }).kind).toBe('clarification');
    expect(planChat('What is the dose of amoxicillin?', { now }).kind).toBe('unsupported');
    expect(planChat('Show stock for Lagos branch', { now, branchId: 'lagos' }).kind).toBe('analytics');
  });
});
