// This consumes server-resolved context, never browser-supplied identity claims.
export function connectionState(context) {
  const connected = context?.mode === 'connected' && context.tenantId !== 'demo' &&
    Boolean(context.tenantId && context.userId) && /^[A-Za-z0-9_-]{43}$/.test(context.delegatedToken || '') &&
    Array.isArray(context.branchIds) && context.branchIds.includes(context.branchId) &&
    Array.isArray(context.capabilities) && context.capabilities.length > 0;
  return { connected, tenantId: connected ? context.tenantId : null, branchId: connected ? context.branchId : null, mode: connected ? 'connected' : context?.mode === 'demo' ? 'demo' : 'disconnected' };
}

export function connectionReply(message, context) {
  const query = message.toLowerCase();
  const statusQuestion = /\bconnected\b.*\brxledger\b|\brxledger\b.*\bconnect(?:ed|ion)?\b|\bsign(?:ed)?\s*in\b|\blogged\s*in\b|\baccess\b.*\brxledger\b|\brxledger\b.*\baccess\b|\bwho am i\b/.test(query);
  const branchQuestion = /\b(?:which|what)\b.{0,50}\b(?:branch|workspace)\b.{0,50}\b(?:am i|i am|current|selected|on)\b|\bcurrent(?:ly)?\b.{0,30}\b(?:branch|workspace)\b|\bhow\b.*\bknow\b.*\b(?:branch|workspace)\b/.test(query);
  if (!statusQuestion && !branchQuestion) return null;
  const state = connectionState(context);
  if (!state.connected) return `You are not connected to RxLedger.${state.mode === 'demo' ? ' This is a local demo, not a signed-in RxLedger session.' : ''} No live branch is selected, and I do not have access to your pharmacy data. Connect and approve your workspace in RxLedger connection settings first.`;
  return `Your server-verified RxLedger connection has read-only access to workspace ${state.tenantId}. Your selected branch is ${state.branchId}. Access is limited to the branches and analytics you approved; this does not mean every report is available.`;
}
