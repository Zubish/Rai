import { capabilitiesForQuestion } from './rxledger-client.mjs';

const day = 86400000;
const shift = (date, count) => new Date(Date.parse(date) + count * day).toISOString().slice(0, 10);
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const clarify = (text, pendingQuestion) => ({ kind: 'clarification', capabilities: [], reply: text, ...(pendingQuestion ? { pendingQuestion } : {}) });

// A conservative fallback plan: never guess datasets, date ranges or branch IDs.
export function planChat(message, { now = new Date(), previous, branchId } = {}) {
  const text = message.trim().toLowerCase();
  if (/\b(dosage|dose|drug interaction|treat my|diagnos)\b/.test(text)) return { kind: 'unsupported', capabilities: [], reply: 'I can help with pharmacy business and operations. Clinical dosing and treatment advice are not supported in this phase; please consult a pharmacist.' };
  let capabilities = capabilitiesForQuestion(text);
  const temporal = /\b(today|yesterday|last month|this month|last \d+ days)\b|\d{4}-\d{2}-\d{2}/.test(text);
  if (capabilities.length && !temporal && previous?.pendingQuestion && text.split(/\s+/).length <= 5) return planChat(`${message} ${previous.pendingQuestion}`, { now, branchId });
  const followUp = /^(and|what about|how about|same|compare|show|for)\b/.test(text);
  if (!capabilities.length && temporal) {
    if (previous?.kind === 'analytics' && followUp) capabilities = previous.capabilities;
    else return clarify('I need a metric because changes could refer to stock, sales, costs or patient demand. Which one would you like to review for that period?', message);
  }
  if (!capabilities.length && !/forecast/.test(text)) return { kind: 'conversation', capabilities: [] };
  const branch = text.match(/\b(?:for|in|from|at)\s+(?:the\s+)?([a-z0-9-]+)\s+branch\b/);
  if (branch && branch[1] !== branchId?.toLowerCase()) return clarify(`Please select the ${branch[1]} branch in RxLedger connection settings first. I cannot assume its internal branch ID or switch your approved scope silently.`);
  if (/\b(forecast|next month|next year|tomorrow)\b/.test(text)) return clarify('A forecast needs a verified historical series, a target period and assumptions. Which metric and period should we forecast? The current snapshot alone is not a validated forecast.');
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = name => parts.find(item => item.type === name).value;
  const today = `${part('year')}-${part('month')}-${part('day')}`;
  let startDate = shift(today, -29), endDate = today, assumed = true;
  const dates = text.match(/\b\d{4}-\d{2}-\d{2}\b/g) || [];
  if (dates.length) {
    if (dates.length > 2 || dates.some(value => !validDate(value))) return clarify('Please provide one valid date or a start and end date in YYYY-MM-DD format.');
    [startDate, endDate] = [dates[0], dates[1] || dates[0]]; assumed = false;
  } else if (/\byesterday\b/.test(text)) { startDate = endDate = shift(today, -1); assumed = false; }
  else if (/\btoday\b/.test(text)) { startDate = endDate = today; assumed = false; }
  else if (/\blast month\b/.test(text)) { endDate = shift(`${today.slice(0, 7)}-01`, -1); startDate = `${endDate.slice(0, 7)}-01`; assumed = false; }
  else if (/\bthis month\b/.test(text)) { startDate = `${today.slice(0, 7)}-01`; assumed = false; }
  else if (/\blast \d+ days\b/.test(text)) {
    const count = Number(text.match(/\blast (\d+) days\b/)[1]);
    if (count < 1 || count > 366) return clarify('Choose a historical window between 1 and 366 days.');
    startDate = shift(today, 1 - count); assumed = false;
  } else if (/\b(?:in|for|during|of)\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b|\b(last week|this week|last year)\b/.test(text)) return clarify('Please specify the exact start and end dates, including the year, so I use the right reporting period.');
  if (startDate > endDate || endDate > today || (Date.parse(endDate) - Date.parse(startDate)) / day > 365) return clarify('Choose an ordered historical date range of at most 366 days.');
  return { kind: 'analytics', capabilities, dateRange: { startDate, endDate, timezone: 'Africa/Lagos' }, assumptions: assumed ? ['Using the last 30 days because no reporting period was specified. Current stock is a snapshot, not historical stock.'] : ['Current stock is a snapshot, not historical stock.'] };
}
