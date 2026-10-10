import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createHealthPassAnalytics, HEALTHPASS_METRICS } from './healthpass-analytics.mjs';

const request = () => ({ headers: { authorization: 'Bearer rai-key', 'x-healthpass-delegated-token': 'grant' }, body: { organization_id: 'facility-a', start_date: '2026-10-01', end_date: '2026-10-10', message: 'Explain workflow' } });
const snapshot = () => ({ meta: { source: 'healthpass', organization_id: 'facility-a', date_range: { start_date: '2026-10-01', end_date: '2026-10-10' }, capabilities: ['operational_analytics'], generated_at: '2026-10-10T12:00:00Z' }, data: Object.fromEntries(HEALTHPASS_METRICS.map((key, i) => [key, i])) });
function setup({ payload = snapshot(), status = 200, provider } = {}) {
  const calls = [];
  const analyze = createHealthPassAnalytics({ enabled: true, incomingKey: 'rai-key', serviceKey: 'hp-key', baseUrl: 'https://healthpass.example', fetchImpl: async (url, options) => { calls.push({ url, options }); return { ok: status === 200, status, json: async () => payload }; }, provider: provider || { id: 'fake', chat: async input => { calls.push({ model: input }); return { text: 'Workflow summary', model: 'test' }; } } });
  return { analyze, calls };
}
test('verified aggregate path sends delegated scope and never forwards caller text or upstream metadata', async () => {
  const payload = snapshot(); payload.meta.private_note = 'secret patient';
  const { analyze, calls } = setup({ payload });
  const input = request(); input.body.message = 'Alice Smith example text';
  const result = await analyze(input);
  assert.deepEqual(result.metrics, payload.data);
  assert.equal(result.scope.organization_id, 'facility-a');
  assert.equal(calls[0].options.headers['x-healthpass-delegated-token'], 'grant');
  assert.deepEqual(JSON.parse(calls[0].options.body).capabilities, ['operational_analytics']);
  assert.doesNotMatch(JSON.stringify(calls[1]), /Alice|secret patient|grant|rai-key|hp-key|facility-a/);
});
test('authentication and disabled mode fail before upstream or model calls', async () => {
  const { analyze, calls } = setup();
  for (const input of [{ ...request(), headers: {} }, { ...request(), headers: { ...request().headers, authorization: 'Bearer wrong' } }, { ...request(), headers: { authorization: 'Bearer rai-key' } }]) await assert.rejects(analyze(input), { status: 401 });
  assert.equal(calls.length, 0);
  await assert.rejects(createHealthPassAnalytics({ enabled: false })(request()), { status: 503 });
});
test('scope mismatches, broadened capabilities and patient rows are rejected before inference', async () => {
  const mutations = [p => p.meta.organization_id = 'facility-b', p => p.meta.source = 'rxledger', p => p.meta.date_range.end_date = '2026-10-09', p => p.meta.capabilities.push('clinical'), p => p.data.patient_rows = [], p => p.data.pending_item_count = -1, p => delete p.data.dispensed_prescription_count];
  for (const mutate of mutations) {
    const payload = snapshot(); mutate(payload);
    const { analyze, calls } = setup({ payload });
    await assert.rejects(analyze(request()), { status: 502 });
    assert.equal(calls.length, 1);
  }
});
test('upstream revoked delegation denies and no model is called', async () => {
  const { analyze, calls } = setup({ status: 403 });
  await assert.rejects(analyze(request()), { status: 403 });
  assert.equal(calls.length, 1);
});
test('clinical requests and invalid periods are rejected locally', async () => {
  const { analyze, calls } = setup();
  for (const message of ['prescribe medicine', 'diagnose this condition', 'patient summary', 'override alert']) await assert.rejects(analyze({ ...request(), body: { ...request().body, message } }), { status: 422 });
  for (const changes of [{ start_date: '2026-02-30' }, { start_date: '2026-10-11' }, { start_date: '2020-01-01' }, { patient_id: 'x' }]) await assert.rejects(analyze({ ...request(), body: { ...request().body, ...changes } }), { status: 400 });
  assert.equal(calls.length, 0);
});
test('inference outage preserves verified deterministic metrics', async () => {
  const { analyze } = setup({ provider: { chat: async () => { throw new Error('private outage'); } } });
  const result = await analyze(request());
  assert.deepEqual(result.metrics, snapshot().data);
  assert.equal(result.explanation_status, 'unavailable');
  assert.equal(result.explanation, null);
  assert.doesNotMatch(JSON.stringify(result), /private outage/);
});
