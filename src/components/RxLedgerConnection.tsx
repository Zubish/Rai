import { useEffect, useState } from 'react';

export type ConnectionStatus = { connected: boolean; tenantId?: string; branchId?: string; branchIds?: string[]; role?: string; capabilities?: string[] };
async function request(body?: Record<string, unknown>): Promise<ConnectionStatus & { url?: string }> {
  const response = await fetch('/api/rai/connection', { method: body ? 'POST' : 'GET', credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, ...(body ? { body: JSON.stringify(body) } : {}) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message || 'Connection unavailable.');
  return result.data;
}
export function RxLedgerConnection({ onChange, disabled = false }: { onChange: (status: ConnectionStatus) => void; disabled?: boolean }) {
  const [status, setStatus] = useState<ConnectionStatus>({ connected: false });
  const [tenant, setTenant] = useState('');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void request().then(data => { if (active) { setStatus(data); onChange(data); } }).catch(failure => { if (active) setError(failure.message); }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, []);
  async function act(body: Record<string, unknown>) {
    if (disabled) return;
    setBusy(true); setError('');
    try {
      const data = await request(body);
      if (data.url) { const target = new URL(data.url); if (target.origin !== 'https://rxledger.vercel.app') throw new Error('Unapproved connection destination.'); window.location.assign(target.href); return; }
      const current = await request(); setStatus(current); onChange(current);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Connection unavailable.'); }
    finally { setBusy(false); }
  }
  return <><p>{status.connected ? `Connected to ${status.tenantId} (${status.role}).` : 'Connect your signed-in RxLedger workspace with explicit read-only consent.'}</p>{status.connected ? <><label>Branch<select disabled={busy || disabled} value={status.branchId} onChange={event => { void act({ action: 'select_branch', branchId: event.target.value }); }}>{status.branchIds?.map(id => <option key={id} value={id}>{id}</option>)}</select></label><p>Approved: {status.capabilities?.map(item => item.replaceAll('_', ' ')).join(', ')}</p><button disabled={busy || disabled} onClick={() => { void act({ action: 'disconnect' }); }}>Disconnect RxLedger</button></> : <form onSubmit={event => { event.preventDefault(); void act({ action: 'start', tenant: tenant.trim().toLowerCase() }); }}><label>Workspace slug<input required maxLength={80} value={tenant} onChange={event => setTenant(event.target.value)} placeholder="totalenergies" autoComplete="off" /></label><button disabled={busy || disabled || !tenant.trim()} type="submit">Connect RxLedger</button></form>}{error && <p role="alert">{error}</p>}<p>Access expires after 15 minutes. Rai never receives your RxLedger database password.</p></>;
}
