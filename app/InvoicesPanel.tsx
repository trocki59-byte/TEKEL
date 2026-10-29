'use client';
import { useEffect, useState } from 'react';
import { Plus, Search, X, Printer, FileText } from 'lucide-react';
import type { State, Invoice } from '../lib/types';
import InvoiceForm from './InvoiceForm';
const money = (n: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n / 100);
const date = (d: string) => new Date(d).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' });
const pay = (p: string) => ({ cash: 'Nakit · ödendi', card: 'Kart · ödendi', credit: 'Veresiye' }[p] || p);
export default function InvoicesPanel({ kind, state, busy, error, onAction }: {
    kind: 'purchase' | 'sale';
    state: State;
    busy: boolean;
    error: string;
    onAction: (action: Record<string, unknown>, message: string) => Promise<boolean>;
}) {
    const [query, setQuery] = useState(''), [form, setForm] = useState(false), [view, setView] = useState<Invoice | null>(null);
    const invoices = state.invoices.filter(x => x.kind === kind && (x.number + ' ' + x.party.name).toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr')));
    const title = kind === 'purchase' ? 'Alış faturası' : 'Satış faturası';
    useEffect(() => { const key = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) {
        setForm(false);
        setView(null);
    } }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); }, [busy]);
    return <><div className="toolbar no-print"><div className="search-box compact"><Search size={19}/><input aria-label="Fatura ara" placeholder="Fatura numarası veya cari adı ara" value={query} onChange={e => setQuery(e.target.value)}/></div><button className="btn primary" onClick={() => setForm(true)}><Plus size={17}/>{title} ekle</button></div><p className="hint no-print">Üç sıralı iskonto · Paket/karton miktarı · Stok ve cari hesap bağlantısı</p><div className="panel table-wrap no-print"><table><thead><tr><th>NUMARA / TARİH</th><th>{kind === 'purchase' ? 'TEDARİKÇİ' : 'MÜŞTERİ'}</th><th>BRÜT</th><th>İSKONTO</th><th>NET TOPLAM</th><th>ÖDEME</th><th /></tr></thead><tbody>{invoices.map(x => <tr key={x.id}><td><strong>{x.number}</strong><small>{date(x.date)}</small></td><td>{x.party.name}</td><td>{money(x.subtotal)}</td><td>{money(x.subtotal - x.total)}</td><td><b>{money(x.total)}</b></td><td><span className={'tag ' + (x.payment === 'credit' ? 'warning' : 'success')}>{pay(x.payment)}</span></td><td><button className="btn ghost small" onClick={() => setView(x)}>Görüntüle</button></td></tr>)}</tbody></table>{!invoices.length && <div className="empty"><FileText size={32}/><h3>Henüz {title.toLocaleLowerCase('tr')} yok</h3><p>Yeni belge ekleyerek stok ve cari hesaplarınızı birlikte takip edin.</p></div>}</div>
 {form && <div className="modal-backdrop no-print"><section className="modal invoice-modal" role="dialog" aria-modal="true" aria-label={title + ' ekle'}><div className="panel-heading"><h2>{title} ekle</h2><button className="icon-btn" aria-label="Fatura formunu kapat" disabled={busy} onClick={() => setForm(false)}><X /></button></div>{error && <p className="banner error">{error}</p>}<InvoiceForm kind={kind} state={state} busy={busy} onSave={async (action) => { const ok = await onAction(action, 'Fatura, stok ve cari hesap kaydedildi.'); if (ok)
        setForm(false); return ok; }}/></section></div>}
 {view && <div className="modal-backdrop invoice-view-backdrop"><section className="modal invoice-modal invoice-view" role="dialog" aria-modal="true" aria-label="Fatura detayı"><div className="panel-heading no-print"><h2>{title}</h2><button className="btn ghost small" onClick={() => window.print()}><Printer size={16}/>Yazdır / PDF</button><button className="icon-btn" aria-label="Fatura detayını kapat" onClick={() => setView(null)}><X /></button></div><article className="invoice-document"><div className="document-title"><div><h1>TEKEL</h1><p>PROGRAM İÇİ {kind === 'purchase' ? 'ALIŞ' : 'SATIŞ'} KAYDI</p></div><div><strong>{view.number}</strong><p>{date(view.date)}</p></div></div><div className="document-party"><h3>{view.party.name}</h3><p>{view.party.phone}</p><p>{view.party.address}</p>{view.party.taxNo && <p>Vergi / kimlik referansı: {view.party.taxNo}</p>}<p>Ödeme: {pay(view.payment)}{view.dueDate ? ' · Vade: ' + date(view.dueDate + 'T12:00:00+03:00') : ''}</p></div><div className="table-wrap"><table><thead><tr><th>ÜRÜN</th><th>MİKTAR</th><th>PAKET</th><th>PAKET FİYATI</th><th>BRÜT</th><th>NET</th></tr></thead><tbody>{view.lines.map(l => <tr key={l.productId}><td>{l.name}</td><td>{l.quantity} {l.unit === 'carton' ? 'karton' : 'paket'}</td><td>{l.packs}</td><td>{money(l.unitPrice)}</td><td>{money(l.gross)}</td><td>{money(l.net)}</td></tr>)}</tbody></table></div><div className="document-bottom"><div><p>{view.note}</p><small>Bu belge yalnızca program içi takip içindir.</small><small>Satır netleri toplam iskontonun tutara göre dağıtımıdır.</small><small>Ayrıca vergi hesaplanmaz.</small></div><div className="invoice-summary"><p><span>Brüt toplam</span><b>{money(view.subtotal)}</b></p>{view.discounts.map((r, i) => <p key={i}><span>{i + 1}. iskonto (%{(r / 100).toLocaleString('tr-TR')})</span><b>−{money(view.discountAmounts[i])}</b></p>)}<div className="total"><span>Net toplam</span><strong>{money(view.total)}</strong></div></div></div></article></section></div>}</>;
}
