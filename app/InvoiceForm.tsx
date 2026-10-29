'use client';
import { useState } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import type { State } from '../lib/types';
import { calculateInvoice } from '../lib/invoices.mjs';
type Kind = 'purchase' | 'sale';
type DraftLine = {
    productId: string;
    quantity: string;
    unit: 'pack' | 'carton';
    unitPrice: string;
};
const money = (n: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n / 100);
export default function InvoiceForm({ kind, state, busy, onSave }: {
    kind: Kind;
    state: State;
    busy: boolean;
    onSave: (action: Record<string, unknown>) => Promise<boolean>;
}) {
    const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Istanbul' }).format(new Date());
    const [number, setNumber] = useState(`${kind === 'purchase' ? 'AL' : 'ST'}-${today.replaceAll('-', '')}-${String(state.invoices.filter(x => x.kind === kind).length + 1).padStart(4, '0')}`), [date, setDate] = useState(today), [partyId, setPartyId] = useState(''), [payment, setPayment] = useState('cash'), [dueDate, setDueDate] = useState(''), [note, setNote] = useState(''), [selected, setSelected] = useState(''), [query, setQuery] = useState(''), [lines, setLines] = useState<DraftLine[]>([]), [rates, setRates] = useState(['0', '0', '0']);
    const parties = kind === 'purchase' ? state.suppliers : state.customers;
    const parsed = lines.map(l => { const p = state.products.find(p => p.id === l.productId); const quantity = Number(l.quantity); return { ...l, quantity, unitPrice: Math.round(Number(l.unitPrice) * 100), packs: quantity * (l.unit === 'carton' ? (p?.packsPerCarton || 1) : 1) }; });
    const discounts = rates.map(x => Math.round(Number(x) * 100));
    let summary: {
        subtotal: number;
        discountAmounts: number[];
        total: number;
        lineTotals: number[];
    } | null = null, message = '';
    try {
        if (lines.length)
            summary = calculateInvoice(parsed, discounts);
    }
    catch (e) {
        message = e instanceof Error ? e.message : 'Tutarları kontrol edin.';
    }
    function add() { const p = state.products.find(p => p.id === selected); if (!p || lines.some(l => l.productId === p.id))
        return; setLines([...lines, { productId: p.id, quantity: '1', unit: 'pack', unitPrice: String((kind === 'purchase' ? p.cost : p.price) / 100) }]); setSelected(''); setQuery(''); }
    function update(index: number, changes: Partial<DraftLine>) { setLines(lines.map((l, i) => i === index ? { ...l, ...changes } : l)); }
    return <form onSubmit={async (e) => { e.preventDefault(); if (summary)
        await onSave({ type: 'invoice', kind, number, date, partyId, payment, dueDate: dueDate || null, note, discounts, lines: parsed.map(({ productId, quantity, unit, unitPrice }) => ({ productId, quantity, unit, unitPrice })) }); }}><fieldset disabled={busy} className="invoice-form">
 <div className="info-box">Program içi {kind === 'purchase' ? 'alış' : 'satış'} kaydı. {kind === 'purchase' ? 'Stok artırılır, net maliyet ürünün alış fiyatına işlenir.' : 'Yeni satış oluşturulur ve stok düşer; önceden kaydettiğiniz bir satışı tekrar girmeyin.'} Birim tutarlar paket başınadır; ayrıca vergi hesaplanmaz.</div>
 <div className="invoice-fields"><label>Fatura numarası<input autoFocus value={number} onChange={e => setNumber(e.target.value)} maxLength={80} required/></label><label>Fatura tarihi<input type="date" value={date} onChange={e => setDate(e.target.value)} required/></label><label>{kind === 'purchase' ? 'Tedarikçi' : 'Müşteri'}<select value={partyId} onChange={e => setPartyId(e.target.value)} required><option value="">Seçin</option>{parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Ödeme şekli<select value={payment} onChange={e => setPayment(e.target.value)}><option value="cash">Nakit · ödendi</option><option value="card">Kart · ödendi</option><option value="credit">Veresiye · ödenmedi</option></select></label>{payment === 'credit' && <label>Vade tarihi (isteğe bağlı)<input type="date" value={dueDate} min={date} onChange={e => setDueDate(e.target.value)}/></label>}</div>
 {!parties.length && <p className="banner error">Önce {kind === 'purchase' ? 'Tedarikçiler' : 'Müşteriler'} ekranından bir cari kart ekleyin.</p>}
 <div className="invoice-picker"><label>Ürün ara<input aria-label="Fatura ürünü ara" value={query} onChange={e => setQuery(e.target.value)} placeholder="Ad veya barkod"/></label><label>Ürün<select value={selected} onChange={e => setSelected(e.target.value)}><option value="">Ürün seçin</option>{state.products.filter(p => !lines.some(l => l.productId === p.id) && (p.name + ' ' + p.barcode).toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr'))).map(p => <option value={p.id} key={p.id}>{p.name} · {p.stock} paket</option>)}</select></label><button type="button" className="btn ghost" disabled={!selected || lines.length >= 100} onClick={add}><Plus size={16}/>Satır ekle</button></div>
 <div className="invoice-edit-lines">{lines.map((l, i) => { const p = state.products.find(p => p.id === l.productId); return <div className="invoice-edit-line" key={l.productId}><div className="invoice-product"><strong>{p?.name}</strong><small>Stok: {p?.stock} paket · Karton: {p?.packsPerCarton} paket</small></div><label>Miktar<input aria-label={`${p?.name} miktar`} type="number" min="1" step="1" max="1000000" value={l.quantity} onChange={e => update(i, { quantity: e.target.value })} required/></label><label>Birim<select aria-label={`${p?.name} birim`} value={l.unit} onChange={e => update(i, { unit: e.target.value as 'pack' | 'carton' })}><option value="pack">Paket</option><option value="carton">Karton</option></select></label><label>Paket fiyatı (₺)<input aria-label={`${p?.name} paket fiyatı`} type="number" min="0.01" step="0.01" value={l.unitPrice} onChange={e => update(i, { unitPrice: e.target.value })} required/></label><strong className="line-amount">{money((parsed[i]?.packs || 0) * (parsed[i]?.unitPrice || 0))}</strong><button type="button" className="icon-btn" aria-label={p?.name + ' satırını sil'} onClick={() => setLines(lines.filter((_, n) => n !== i))}><Trash2 size={16}/></button></div>; })}{!lines.length && <div className="empty">Ürün seçip fatura satırlarını ekleyin.</div>}</div>
 <div className="invoice-bottom"><div><div className="discount-inputs">{rates.map((r, i) => <label key={i}>{i + 1}. İskonto (%)<input aria-label={`${i + 1}. İskonto (%)`} type="number" min="0" max="100" step="0.01" required value={r} onChange={e => setRates(rates.map((x, n) => n === i ? e.target.value : x))}/></label>)}</div><p className="hint">İskontolar sırayla kalan tutara uygulanır. Her adım kuruşa yuvarlanır.</p><label className="invoice-note">Not<textarea maxLength={500} rows={3} value={note} onChange={e => setNote(e.target.value)}/></label></div><div className="invoice-summary"><p><span>Brüt toplam</span><b>{money(summary?.subtotal || 0)}</b></p>{rates.map((r, i) => <p key={i}><span>{i + 1}. iskonto (%{r || 0})</span><b>−{money(summary?.discountAmounts[i] || 0)}</b></p>)}<div className="total"><span>Net toplam</span><strong>{money(summary?.total || 0)}</strong></div></div></div>
 {message && <p className="banner error">{message}</p>}<div className="invoice-save"><span className="hint">Kayıt kesinleşir; sonradan düzenlenmez veya silinmez.</span><button className="btn primary" disabled={!summary || !partyId || busy}><Save size={17}/>{busy ? 'Kaydediliyor…' : 'Faturayı kaydet'}</button></div>
 </fieldset></form>;
}
