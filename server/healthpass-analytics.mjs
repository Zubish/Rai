import './env.mjs';
import { timingSafeEqual } from 'node:crypto';
import { createOllamaProvider } from './ollama-provider.mjs';

export const HEALTHPASS_METRICS = Object.freeze(['prescription_count', 'dispatched_prescription_count', 'acknowledged_prescription_count', 'partially_dispensed_prescription_count', 'dispensed_prescription_count', 'cancelled_prescription_count', 'pending_item_count']);
const fail = (code, status) => Object.assign(new Error(code), { code, status });
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

export function createHealthPassAnalytics({ enabled = process.env.RAI_HEALTHPASS_ENABLED === 'true', incomingKey = process.env.RAI_HEALTHPASS_API_KEY || '', serviceKey = process.env.HEALTHPASS_RAI_API_KEY || '', baseUrl = process.env.HEALTHPASS_BASE_URL || '', fetchImpl = fetch, provider = createOllamaProvider() } = {}) {
  return async function analyze(request) {
    if (!enabled) throw fail('healthpass_not_enabled', 503);
    const bearer = request.headers?.authorization;
    const expected = `Bearer ${incomingKey}`;
    if (!incomingKey || typeof bearer !== 'string' || Buffer.byteLength(bearer) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(bearer), Buffer.from(expected))) throw fail('unauthorized', 401);
    const grant = request.headers?.['x-healthpass-delegated-token'];
    if (typeof grant !== 'string' || !grant.trim() || grant.length > 4096 || /[\r\n]/.test(grant)) throw fail('unauthorized', 401);
    const body = request.body;
    const fields = ['organization_id', 'start_date', 'end_date', 'message'];
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !fields.includes(key)) || typeof body.organization_id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(body.organization_id) || !validDate(body.start_date) || !validDate(body.end_date) || body.start_date > body.end_date || (Date.parse(body.end_date) - Date.parse(body.start_date)) / 86400000 > 365 || (body.message !== undefined && (typeof body.message !== 'string' || body.message.length > 4000))) throw fail('invalid_request', 400);
    if (/\b(diagnos\w*|dosage|dose|prescribe|substitut\w*|sign|override|patient|clinical)\b/i.test(body.message || '')) throw fail('unsupported_clinical_request', 422);
    let origin;
    try {
      const url = new URL(baseUrl);
      if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error();
      origin = url.origin;
    } catch { throw fail('healthpass_not_configured', 503); }
    if (!serviceKey || /[\r\n]/.test(serviceKey)) throw fail('healthpass_not_configured', 503);
    let response;
    try {
      response = await fetchImpl(`${origin}/api/v1/integrations/rai/analytics-snapshot`, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(12000),
        headers: { 'content-type': 'application/json', authorization: `Bearer ${serviceKey}`, 'x-healthpass-delegated-token': grant },
        body: JSON.stringify({ organization_id: body.organization_id, start_date: body.start_date, end_date: body.end_date, capabilities: ['operational_analytics'] })
      });
    } catch { throw fail('healthpass_unavailable', 502); }
    if (!response.ok) throw fail('healthpass_request_failed', [401, 403, 400].includes(response.status) ? response.status : 502);
    let payload;
    try { payload = await response.json(); } catch { throw fail('invalid_healthpass_snapshot', 502); }
    const meta = payload?.meta;
    if (!meta || meta.source !== 'healthpass' || meta.organization_id !== body.organization_id || meta.date_range?.start_date !== body.start_date || meta.date_range?.end_date !== body.end_date || meta.capabilities?.length !== 1 || meta.capabilities[0] !== 'operational_analytics' || typeof meta.generated_at !== 'string' || !Number.isFinite(Date.parse(meta.generated_at))) throw fail('invalid_healthpass_snapshot', 502);
    const counts = payload.data;
    if (!counts || Object.keys(counts).length !== HEALTHPASS_METRICS.length || HEALTHPASS_METRICS.some(key => !Number.isSafeInteger(counts[key]) || counts[key] < 0) || Object.keys(counts).some(key => !HEALTHPASS_METRICS.includes(key))) throw fail('invalid_healthpass_snapshot', 502);
    // Rebuild every field; upstream free text, identifiers, warnings and caller message never enter model context.
    const metrics = Object.fromEntries(HEALTHPASS_METRICS.map(key => [key, counts[key]]));
    const scope = { source: 'healthpass', date_range: { start_date: body.start_date, end_date: body.end_date }, generated_at: new Date(meta.generated_at).toISOString() };
    let explanation = null, model = null;
    try {
      const result = await provider.chat({ message: 'Explain these verified aggregate prescription workflow counts. Do not infer clinical outcomes or treatment adherence. The separately rendered metrics are authoritative.', context: { source: 'healthpass' }, dataContext: { ...scope, metrics }, history: [] });
      if (typeof result?.text === 'string' && result.text.trim()) { explanation = result.text; model = result.model || null; }
    } catch { /* Verified metrics remain available when inference is unavailable. */ }
    return { metrics, scope: { ...scope, organization_id: body.organization_id }, explanation, explanation_status: explanation ? 'generated_requires_review' : 'unavailable', provider: { id: explanation ? provider.id || 'ollama' : null, model }, warnings: ['Counts describe prescription workflow, not unique patients, medicine ingestion or clinical outcomes.', 'Model explanation is supplementary; use the authoritative metrics for numerical values.'] };
  };
}

export function healthPassFailure(error) {
  const status = [400, 401, 403, 422, 502, 503].includes(error?.status) ? error.status : 500;
  return { status, error: { code: typeof error?.code === 'string' ? error.code : 'healthpass_analysis_failed', message: status === 401 || status === 403 ? 'HealthPass analytics access could not be verified.' : status === 422 ? 'Only aggregate operational analysis is supported; clinical actions and patient analysis are unavailable.' : status < 500 ? 'Check the organization, reporting dates and approved request fields.' : 'HealthPass analytics is unavailable. Check the approved server integration and retry.' } };
}
