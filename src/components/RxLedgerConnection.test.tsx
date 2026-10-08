import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RxLedgerConnection } from './RxLedgerConnection';

afterEach(() => vi.unstubAllGlobals());
const connected = { connected: true, tenantId: 'synthetic-workspace', branchId: 'lagos', branchIds: ['lagos', 'abuja'], role: 'admin', capabilities: ['inventory_analytics'] };
const response = (data: object) => ({ ok: true, json: async () => ({ data }) });

describe('RxLedger connection controls', () => {
  it('shows a real disconnected state without fabricated branches', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ connected: false })));
    const onChange = vi.fn();
    render(<RxLedgerConnection onChange={onChange} />);
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ connected: false }));
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect RxLedger' })).toBeDisabled();
  });
  it('switches only to a consented branch through the backend', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(response(connected)).mockResolvedValueOnce(response({ selected: true })).mockResolvedValueOnce(response({ ...connected, branchId: 'abuja' }));
    vi.stubGlobal('fetch', fetchImpl);
    const onChange = vi.fn();
    render(<RxLedgerConnection onChange={onChange} />);
    await screen.findByRole('combobox');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'abuja' } });
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith({ ...connected, branchId: 'abuja' }));
    expect(JSON.parse(fetchImpl.mock.calls[1][1].body)).toEqual({ action: 'select_branch', branchId: 'abuja' });
    expect(fetchImpl.mock.calls[1][1].credentials).toBe('same-origin');
  });
  it('disconnects through the backend and blocks changes while answering', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(response(connected)).mockResolvedValueOnce(response({ connected: false })).mockResolvedValueOnce(response({ connected: false }));
    vi.stubGlobal('fetch', fetchImpl);
    const onChange = vi.fn();
    const view = render(<RxLedgerConnection disabled onChange={onChange} />);
    await screen.findByRole('combobox');
    expect(screen.getByRole('combobox')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Disconnect RxLedger' })).toBeDisabled();
    view.rerender(<RxLedgerConnection onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect RxLedger' }));
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith({ connected: false }));
    expect(JSON.parse(fetchImpl.mock.calls[1][1].body)).toEqual({ action: 'disconnect' });
  });
  it('reports authorization failure without claiming a connection', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: { message: 'Session expired.' } }) }));
    const onChange = vi.fn();
    render(<RxLedgerConnection onChange={onChange} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Session expired.');
    expect(onChange).not.toHaveBeenCalled();
  });
});
