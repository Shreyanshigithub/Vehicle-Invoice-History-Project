import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Car, CheckCircle2, ChevronRight, FileText, History, Loader2, Search, Trash2, UploadCloud, X } from 'lucide-react';
import { deleteInvoice, getHistory, getInvoices, uploadInvoice } from './api';

function formatDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

function money(value) {
  if (value === undefined || value === null) return '-';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);
}

function App() {
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  async function load() {
    try {
      setInvoices(await getInvoices(search));
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load invoices.');
    }
  }

  useEffect(() => { load(); }, [search]);

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(true);
    setError('');
    setMessage('Reading invoice and extracting details...');
    try {
      const result = await uploadInvoice(file);
      setMessage(`Invoice ${result.invoice.invoiceNumber} was saved successfully.`);
      await load();
      setSelected(result.invoice);
    } catch (e) {
      setError(e.response?.data?.message || 'Invoice could not be processed.');
      setMessage('');
    } finally {
      setUploading(false);
    }
  }

  async function openHistory(invoice) {
    setSelected(invoice);
    setHistory(null);
    try {
      setHistory(await getHistory(invoice.vehicleRegistrationNumber));
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load vehicle history.');
    }
  }

  async function remove(id) {
    if (!window.confirm('Delete this invoice?')) return;
    try {
      await deleteInvoice(id);
      setSelected(null);
      setHistory(null);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || 'Could not delete invoice.');
    }
  }

  const stats = useMemo(() => ({
    invoices: invoices.length,
    vehicles: new Set(invoices.map(x => x.vehicleRegistrationNumber)).size,
    alerts: invoices.reduce((count, x) => count + (x.alerts?.length || 0), 0)
  }), [invoices]);

  function exportCsv() {
    const header = ['Invoice No', 'Vehicle No', 'Invoice Date', 'Model', 'Kms', 'Components', 'Price'];
    const rows = invoices.flatMap(inv => (inv.components?.length ? inv.components : [{ name: '', price: inv.totalAmount }]).map(item => [
      inv.invoiceNumber, inv.vehicleRegistrationNumber, formatDate(inv.invoiceDate), inv.model, inv.kilometers ?? '', item.name, item.price ?? ''
    ]));
    const csv = [header, ...rows].map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vehicle-invoice-history.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon"><Car size={22} /></div>
          <div><strong>VehicleCare</strong><span>Invoice history</span></div>
        </div>
        <div className="topbar-note">Workshop billing review</div>
      </header>

      <main className="container">
        <section className="hero">
          <div>
            <p className="eyebrow">Invoice automation</p>
            <h1>Keep every vehicle repair in one place.</h1>
            <p className="hero-copy">Upload a workshop invoice, extract the useful fields, and keep a searchable repair history so repeated billing is easier to spot.</p>
          </div>
          <button className="primary-button" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="spin" size={18} /> : <UploadCloud size={18} />}
            {uploading ? 'Reading invoice...' : 'Upload invoice'}
          </button>
          <input ref={fileRef} hidden type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={handleUpload} />
        </section>

        {message && <div className="notice success"><CheckCircle2 size={18} />{message}</div>}
        {error && <div className="notice error"><AlertTriangle size={18} />{error}<button onClick={() => setError('')}><X size={15} /></button></div>}

        <section className="stats">
          <div className="stat-card"><FileText size={20} /><div><span>Invoices</span><strong>{stats.invoices}</strong></div></div>
          <div className="stat-card"><Car size={20} /><div><span>Vehicles</span><strong>{stats.vehicles}</strong></div></div>
          <div className="stat-card warning"><AlertTriangle size={20} /><div><span>Review flags</span><strong>{stats.alerts}</strong></div></div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div><h2>Invoice records</h2><p>Structured data extracted from uploaded invoices.</p></div>
            <div className="actions"><button className="secondary-button" onClick={exportCsv} disabled={!invoices.length}>Export CSV</button></div>
          </div>
          <div className="toolbar"><div className="search-box"><Search size={17} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoice, vehicle or model" /></div></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Invoice No</th><th>Vehicle No</th><th>Date</th><th>Model</th><th>Components</th><th>Amount</th><th></th></tr></thead>
              <tbody>
                {invoices.map(inv => <tr key={inv._id} className={inv.alerts?.length ? 'has-alert' : ''}>
                  <td><strong>{inv.invoiceNumber}</strong></td>
                  <td>{inv.vehicleRegistrationNumber}</td>
                  <td>{formatDate(inv.invoiceDate)}</td>
                  <td>{inv.model || '-'}</td>
                  <td><div className="component-list">{(inv.components || []).map((item, i) => <span key={i}>{item.name}</span>)}</div></td>
                  <td>{money(inv.totalAmount)}</td>
                  <td><button className="icon-button" title="View history" onClick={() => openHistory(inv)}><ChevronRight size={18} /></button></td>
                </tr>)}
                {!invoices.length && <tr><td colSpan="7" className="empty"><FileText size={30} /><strong>No invoices yet</strong><span>Upload the first invoice to start building the vehicle history.</span></td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        {selected && <section className="detail-grid">
          <div className="panel detail-panel">
            <div className="panel-head"><div><h2>Invoice details</h2><p>{selected.sourceFile}</p></div><button className="icon-button" onClick={() => { setSelected(null); setHistory(null); }}><X size={18} /></button></div>
            <div className="detail-fields">
              <Field label="Invoice number" value={selected.invoiceNumber} />
              <Field label="Vehicle number" value={selected.vehicleRegistrationNumber} />
              <Field label="Model" value={selected.model} />
              <Field label="Invoice date" value={formatDate(selected.invoiceDate)} />
              <Field label="Chassis number" value={selected.chassisNumber} />
              <Field label="Kilometers" value={selected.kilometers?.toLocaleString('en-IN')} />
              <Field label="Job card" value={selected.jobCardNumber} />
              <Field label="Total amount" value={money(selected.totalAmount)} />
            </div>
            <h3>Components</h3>
            <div className="items">
              {(selected.components || []).map((item, i) => <div className="item-row" key={i}><div><strong>{item.name}</strong><span>{item.type || 'Part'} · Qty {item.quantity || 1}</span></div><strong>{money(item.price)}</strong></div>)}
            </div>
          </div>

          <div className="panel history-panel">
            <div className="panel-head"><div><h2><History size={19} /> Vehicle history</h2><p>Previous invoices for {selected.vehicleRegistrationNumber}</p></div></div>
            {history?.repeatedComponents?.length ? <div className="alert-box"><AlertTriangle size={19} /><div><strong>Repeated components found</strong><p>These items appeared more than once in the vehicle history. Review them rather than automatically treating them as fraud.</p></div></div> : null}
            {history ? <div className="history-list">{history.invoices.map(inv => <div className="history-card" key={inv._id}><div><strong>{formatDate(inv.invoiceDate)}</strong><span>{inv.invoiceNumber} · {inv.model || 'Vehicle'}</span></div><strong>{money(inv.totalAmount)}</strong></div>)}</div> : <div className="history-loading"><Loader2 className="spin" /> Loading history...</div>}
            {history?.repeatedComponents?.length ? <div className="repeat-list">{history.repeatedComponents.map(item => <div key={item.component}><span>{item.component}</span><small>{item.entries.length} invoices</small></div>)}</div> : null}
          </div>
        </section>}

        {selected && <div className="danger-zone"><button className="delete-button" onClick={() => remove(selected._id)}><Trash2 size={16} /> Delete selected invoice</button></div>}
      </main>
    </div>
  );
}

function Field({ label, value }) {
  return <div className="field"><span>{label}</span><strong>{value || '-'}</strong></div>;
}

export default App;
