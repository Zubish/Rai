import { createHealthPassAnalytics, healthPassFailure } from '../../server/healthpass-analytics.mjs';
const analyze = createHealthPassAnalytics();
export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'POST') return response.status(405).json({ error: { code: 'method_not_allowed', message: 'Use POST.' } });
  try { return response.status(200).json({ data: await analyze(request) }); }
  catch (error) { const failure = healthPassFailure(error); return response.status(failure.status).json({ error: failure.error }); }
}
