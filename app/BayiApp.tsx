'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ShoppingCart, Package, Boxes, Wallet, Users, ChartNoAxesCombined, Database, Search, Plus, Minus, Trash2, Barcode, ArrowUpRight, RefreshCw, Check, AlertTriangle, ChevronRight, X, Download, Upload, CreditCard, Banknote, Menu, LogOut, Store, ArrowDownLeft, Truck, Camera } from 'lucide-react';
import type { Envelope, Product } from '../lib/types';
import ProductForm from './ProductForm';
import ContactsPanel from './ContactsPanel';
import InvoicesPanel from './InvoicesPanel';
import CameraScanner from './CameraScanner';
import {findProductByBarcode,normalizeBarcode,barcodeKey} from '../lib/barcodes.mjs';
import { parseProductsCSV, productsCSV } from '../lib/csv.mjs';
type Tab = 'Satış' | 'Ürünler' | 'Stok' | 'Kasa' | 'Veresiye' | 'Raporlar' | 'Yedekleme' | 'Müşteriler' | 'Tedarikçiler';
type Line = {
    id: string;
    quantity: number;
    unit: 'pack' | 'carton';
};
const tabs = [{ name: 'Satış', icon: ShoppingCart }, { name: 'Ürünler', icon: Package }, { name: 'Stok', icon: Boxes }, { name: 'Kasa', icon: Wallet }, { name: 'Veresiye', icon: Users }, { name: 'Müşteriler', icon: Users }, { name: 'Tedarikçiler', icon: Truck }, { name: 'Raporlar', icon: ChartNoAxesCombined }, { name: 'Yedekleme', icon: Database }] as const;
const money = (n: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n / 100);
const day = (d: string) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Istanbul' }).format(new Date(d));
const dateText = (d: string) => new Date(d).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const paymentText = (p: string) => ({ cash: 'Nakit', card: 'Kart', credit: 'Veresiye' }[p] || p);
const blank: Product = { id: '', name: '', brand: '', barcode: '', price: 0, cost: 0, stock: 0, threshold: 5, packsPerCarton: 10, verified: false };
function saveFile(content: string, name: string, type = 'application/json') { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
export default function BayiApp({localMode=false,requestState=fetch}:{localMode?:boolean;requestState?: (url:string,options?:RequestInit)=>Promise<Response>}={}) {
    const pendingKey=localMode?'tekel-local-pending-v1':'trocki-pending-v1';
    const [data, setData] = useState<Envelope | null>(null), [tab, setTab] = useState<Tab>('Satış'), [query, setQuery] = useState(''), [brand, setBrand] = useState('Tümü'), [cart, setCart] = useState<Line[]>([]), [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [error, setError] = useState(''), [modal, setModal] = useState<string | null>(null), [product, setProduct] = useState<Product>(blank), [menu, setMenu] = useState(false), [showCart, setShowCart] = useState(false), [splash, setSplash] = useState(true), [customerId, setCustomerId] = useState(''), [selected, setSelected] = useState(''), [filter, setFilter] = useState('all');
    const today = day(new Date().toISOString());
    const [from, setFrom] = useState(today), [to, setTo] = useState(today);
    const dataRef = useRef<Envelope | null>(null), writeLock = useRef(false), searchRef = useRef<HTMLInputElement>(null), saleId = useRef('');
    const [pending, setPending] = useState(false);
    const [completionEpoch,setCompletionEpoch]=useState(0);
    const [stockSection,setStockSection]=useState<'inventory'|'purchase'|'sale'>('inventory');
    const [cameraOpen,setCameraOpen]=useState(false),[unknownBarcode,setUnknownBarcode]=useState(''),[barcodeProductId,setBarcodeProductId]=useState(''),[barcodeQuery,setBarcodeQuery]=useState('');
    const replace = useCallback((d: Envelope) => { dataRef.current = d; setData(d); }, []);
    const load = useCallback(async () => { const r = await requestState('/api/state', { cache: 'no-store' }); const body = await r.json() as Envelope & {
        error?: string;
    }; if (!r.ok)
        throw new Error(body.error || 'Kayıtlar yüklenemedi.'); replace(body); }, [replace,requestState]);
    useEffect(() => { try {
        setPending(!!localStorage.getItem(pendingKey));
    }
    catch {
        setError('Tarayıcı depolaması kapalı. Güvenli işlem tekrarı için depolamaya izin verin.');
    } load().catch(e => setError(e.message)); const timer = setTimeout(() => setSplash(false), 1500); const poll = setInterval(() => { if (!writeLock.current)
        load().catch(() => { }); }, 20000); return () => { clearTimeout(timer); clearInterval(poll); }; }, [load,pendingKey]);
    useEffect(() => { const key = (e: KeyboardEvent) => { if (e.key === 'F2') {
        e.preventDefault();
        searchRef.current?.focus();
    } if (e.key === 'Escape') {
        setModal(null);
        setShowCart(false);
        setMenu(false);
    } }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); }, []);
    useEffect(() => { if (!notice)
        return; const t = setTimeout(() => setNotice(''), 4500); return () => clearTimeout(t); }, [notice]);
    async function act(action: Record<string, unknown>, message: string) {
        if (writeLock.current || !dataRef.current)
            return false;
        writeLock.current = true;
        setBusy(true);
        setError('');
        try {
            const stored = localStorage.getItem(pendingKey);
            const request = stored ? JSON.parse(stored) : { operationId: crypto.randomUUID(), version: dataRef.current.version, action };
            if (JSON.stringify(request.action) !== JSON.stringify(action))
                throw new Error('Önce bekleyen işlemi kontrol edin. Sonucu belirsizken yeni kayıt yapılmaz.');
            localStorage.setItem(pendingKey, JSON.stringify(request));
            setPending(true);
            const r = await requestState('/api/state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request) });
            const body = await r.json() as Envelope & {
                error?: string;
            };
            if (!r.ok) {
                if (r.status < 500) {
                    localStorage.removeItem(pendingKey);
                    setPending(false);
                }
                if (r.status === 409)
                    await load();
                throw new Error(body.error || 'Kaydedilemedi.');
            }
            localStorage.removeItem(pendingKey);
            setPending(false);
            replace(body);
            setNotice(message);
            setModal(null);
            return true;
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Bağlantı kesildi. Bekleyen işlemi kontrol edin.');
            return false;
        }
        finally {
            setBusy(false);
            writeLock.current = false;
        }
    }
    async function retryPending() { try {
        const raw = localStorage.getItem(pendingKey);
        if (!raw) {
            setPending(false);
            return;
        }
        const request = JSON.parse(raw);
        if (await act(request.action, 'İşlem sonucu doğrulandı.')) {
            setCompletionEpoch(n=>n+1);
            if (request.action.type === 'sale') {
                setCart([]);
                saleId.current = '';
                setShowCart(false);
            }
        }
    }
    catch {
        setError('Bekleyen işlem okunamadı. Tarayıcı verilerini silmeden destek alın.');
    } }
    const state = data?.state, products = state?.products || [], brands = ['Tümü', ...new Set(products.map(p => p.brand))];
    const listed = products.filter(p => (brand === 'Tümü' || p.brand === brand) && (`${p.name} ${p.barcode}`.toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr'))) && (filter !== 'low' || p.stock <= p.threshold));
    const total = cart.reduce((sum, line) => { const p = products.find(x => x.id === line.id); return sum + (p ? p.price * line.quantity * (line.unit === 'carton' ? p.packsPerCarton : 1) : 0); }, 0);
    const daySales = state?.sales.filter(s => day(s.date) === today) || [], daily = daySales.reduce((s, x) => s + x.total, 0), packs = daySales.reduce((s, x) => s + x.items.reduce((n, i) => n + i.packs, 0), 0), low = products.filter(p => p.verified && p.stock <= p.threshold).length;
    const reports = state?.sales.filter(s => day(s.date) >= from && day(s.date) <= to) || [], expenses = state?.expenses.filter(s => day(s.date) >= from && day(s.date) <= to) || [], collections = state?.collections.filter(s => day(s.date) >= from && day(s.date) <= to) || [];
    const supplierPayments = state?.supplierPayments.filter(s => day(s.date) >= from && day(s.date) <= to) || [];
    const supplierCash = supplierPayments.filter(p=>p.payment==='cash').reduce((n,p)=>n+p.amount,0);
    const salesTotal = reports.reduce((s, x) => s + x.total, 0), expenseTotal = expenses.reduce((s, x) => s + x.amount, 0), profit = reports.reduce((s, x) => s + x.profit, 0) - expenseTotal;
    const cash = reports.filter(x => x.payment === 'cash').reduce((s, x) => s + x.total, 0) + collections.filter(x => x.payment === 'cash').reduce((s, x) => s + x.amount, 0) - expenseTotal - supplierCash;
    function navigate(t: Tab) { setStockSection('inventory'); setTab(t); setQuery(''); setBrand('Tümü'); setFilter('all'); setMenu(false); }
    function add(p: Product) { if (!p.verified || !p.price || p.cost < 0) {
        setProduct(p);
        setModal('Ürün düzenle');
        setError('Satıştan önce ürün fiyatlarını ve kontrol onayını tamamlayın.');
        return;
    } if (p.stock < 1) {
        setError('Bu ürünün stoku yok. Stok ekranından giriş yapın.');
        return;
    } const reserved=cart.filter(l=>l.id===p.id).reduce((n,l)=>n+l.quantity*(l.unit==='carton'?p.packsPerCarton:1),0);
    if(reserved>=p.stock){setError('Sepetteki miktar mevcut stok sınırına ulaştı.');return false;}
    const index = cart.findIndex(x => x.id === p.id && x.unit === 'pack'); if (index >= 0) {
        change(index, 1);
    }
    else
        setCart([...cart, { id: p.id, quantity: 1, unit: 'pack' }]); return true; }
    function scanForSale(raw:string){
        setCameraOpen(false);setError('');const code=normalizeBarcode(raw);if(!code){setError('Ürün barkodu okunamadı.');return;}
        const p=findProductByBarcode(products,code) as Product|null;
        if(p){if(add(p)){setNotice(p.name+' sepete eklendi.');setShowCart(true);}return;}
        if(products.filter(p=>barcodeKey(p.barcode)===barcodeKey(code)).length>1){setError('Barkod birden fazla ürüne karşılık geliyor. Ürünler ekranından barkodları kontrol edin.');return;}
        setUnknownBarcode(code);setBarcodeProductId('');setBarcodeQuery('');setModal('Barkod tanımla');
    }
    async function bindScannedBarcode(){const p=products.find(p=>p.id===barcodeProductId);if(!p)return;
        if(await act({type:'bindBarcode',productId:p.id,barcode:unknownBarcode,expectedProduct:p},'Barkod ürüne bağlandı.')){
            const saved=dataRef.current?.state.products.find(x=>x.id===p.id);if(saved&&add(saved)){setNotice(saved.name+' sepete eklendi.');setShowCart(true);}
        }
    }
    function change(index: number, delta: number) { setCart(c => c.map((l, n) => n === index ? { ...l, quantity: l.quantity + delta } : l).filter(l => l.quantity > 0)); }
    async function checkout(payment: string) { if (!cart.length)
        return; if (!saleId.current)
        saleId.current = crypto.randomUUID(); const ok = await act({ type: 'sale', id: saleId.current, payment, customerId, items: cart }, 'Satış kaydedildi. Stok ve kasa güncellendi.'); if (ok) {
        setCart([]);
        setCustomerId('');
        setShowCart(false);
        saleId.current = '';
    } }
    async function importFile(file: File | undefined, kind: 'csv' | 'json') { if (!file)
        return; try {
        if (file.size > 8000000)
            throw new Error('En fazla 8 MB dosya yükleyin.');
        const text = await file.text();
        if (kind === 'csv') {
            const rows = parseProductsCSV(text);
            if (confirm(`${rows.length} ürün içe aktarılacak. Aynı barkod veya adlı ürünler güncellenir. Devam edilsin mi?`))
                await act({ type: 'importProducts', products: rows }, 'Ürünler içe aktarıldı.');
        }
        else {
            const raw = JSON.parse(text);
            if (confirm('Mevcut TÜM kayıtlar bu yedek ile değiştirilecek. Önce mevcut yedeği indirdiğinizden emin olun. Devam edilsin mi?'))
                await act({ type: 'restore', state: raw.state || raw }, 'Yedek geri yüklendi.');
        }
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Dosya okunamadı.');
    } }
    const stats = <div className="stats"><div className="stat"><span className="stat-icon cyan"><ShoppingCart size={22}/></span><div><small>Bugünkü satış</small><strong>{money(daily)}</strong><em>{daySales.length} işlem · İstanbul saati</em></div></div><div className="stat"><span className="stat-icon green"><Package size={22}/></span><div><small>Satılan paket</small><strong>{packs}<b> paket</b></strong><em>Bugünün toplam adedi</em></div></div><button className="stat" onClick={() => { navigate('Stok'); setFilter('low'); }}><span className="stat-icon amber"><AlertTriangle size={22}/></span><div><small>Azalan stok</small><strong>{low}<b> ürün</b></strong><em className={low ? 'orange' : ''}>{low ? 'Stok kontrolü gerekli' : 'Stoklar kontrol altında'}</em></div><ChevronRight size={16}/></button></div>;
    const cartPanel = <aside className={'cart-panel ' + (showCart ? 'is-open' : '')}><div className="panel-heading"><h2>Sepet <span className="count">{cart.length}</span></h2><button className="icon-btn" aria-label="Sepeti temizle" disabled={busy} onClick={() => { setCart([]); saleId.current = ''; }}><Trash2 size={17}/></button><button className="icon-btn mobile-only" aria-label="Sepeti kapat" onClick={() => setShowCart(false)}><X /></button></div><div className="cart-items">{cart.length === 0 ? <div className="empty cart-empty"><ShoppingCart size={38}/><h3>İlk ürünü ekleyin</h3><p>Barkod okutun veya listeden<br />bir ürün seçin.</p></div> : cart.map((line, i) => { const p = products.find(p => p.id === line.id); if (!p)
        return null; const multiplier = line.unit === 'carton' ? p.packsPerCarton : 1; return <div className="cart-item" key={i}><div className="mini-pack"><Package size={20}/></div><div className="cart-detail"><strong>{p.name}</strong><small>{money(p.price)} / paket</small><div className="cart-controls"><div className="stepper"><button aria-label="Azalt" disabled={busy} onClick={() => change(i, -1)}><Minus size={12}/></button><span>{line.quantity}</span><button aria-label="Artır" disabled={busy} onClick={() => change(i, 1)}><Plus size={12}/></button></div><select aria-label="Satış birimi" disabled={busy} value={line.unit} onChange={e => setCart(c => c.map((l, n) => n === i ? { ...l, unit: e.target.value as 'pack' | 'carton' } : l))}><option value="pack">Paket</option><option value="carton">Karton ({p.packsPerCarton})</option></select></div></div><div className="cart-right"><button className="icon-btn" aria-label="Ürünü kaldır" disabled={busy} onClick={() => setCart(c => c.filter((_, n) => i !== n))}><X size={14}/></button><strong>{money(p.price * line.quantity * multiplier)}</strong></div></div>; })}</div><div className="cart-footer"><div className="sub-total"><span>Toplam paket</span><span>{cart.reduce((n, l) => n + l.quantity * (l.unit === 'carton' ? (products.find(p => p.id === l.id)?.packsPerCarton || 1) : 1), 0)}</span></div><div className="total"><span>Toplam</span><strong>{money(total)}</strong></div><div className="payment-buttons"><button disabled={busy || !cart.length} className="btn cash" onClick={() => checkout('cash')}><Banknote size={20}/> Nakit</button><button disabled={busy || !cart.length} className="btn primary" onClick={() => checkout('card')}><CreditCard size={20}/> Kart</button></div><button className="btn ghost full" disabled={busy || !cart.length} onClick={() => setModal('Veresiye satış')}><Users size={17}/> Veresiye kaydet</button><small className="secure-note"><Check size={12}/> {localMode?'İşlemler bu tarayıcıya kaydedilir':'İşlemler ortak veritabanına kaydedilir'}</small></div></aside>;
    return <div className="app">{splash && <div className="splash"><div className="app-mark">T<span>•</span></div><h1>Troçki Studio</h1><p>SUNAR</p><span className="splash-line"/></div>}
 <aside className={'sidebar ' + (menu ? 'expanded' : '')}><a className="brand" href={localMode?'/TEKEL/':"/"}><Store size={29}/><span>TEKEL<small>Bayi Yönetim</small></span></a><p className="nav-label">ÇALIŞMA ALANI</p><nav>{tabs.map(t => <button key={t.name} className={tab === t.name ? 'active' : ''} onClick={() => navigate(t.name)}><t.icon size={21}/><span>{t.name}</span>{t.name === 'Stok' && low > 0 && <b className="nav-badge">{low}</b>}</button>)}</nav><div className="sidebar-bottom"><div className="owner-avatar">TE</div><div><strong>Mağaza yönetimi</strong><small>{localMode?'Bu cihazdaki kayıtlar':'Özel çalışma alanı'}</small></div>{!localMode&&<a href="/signout-with-chatgpt?return_to=/" title="Çıkış yap"><LogOut size={17}/></a>}</div></aside>
 <div className="workspace"><header className="topbar"><button className="icon-btn mobile-only" aria-label="Menü" onClick={() => setMenu(!menu)}><Menu /></button><div className="breadcrumb">Çalışma alanı <ChevronRight size={13}/><strong>{tab}</strong></div><div className="topbar-right"><span className="connection"><i />{data ? (localMode?'Bu cihazda kayıt':'Bulut bağlantısı') : 'Yükleniyor'}</span><button className="icon-btn" aria-label="Kayıtları yenile" disabled={busy} onClick={() => load().then(() => setNotice('Kayıtlar güncellendi.')).catch(e => setError(e.message))}><RefreshCw size={17}/></button><span className="today">{new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' })}</span></div></header>
 <main className="main"><div className="page-heading"><div><p className="eyebrow">TEKEL / BAYİ YÖNETİM</p><h1>{tab === 'Satış' ? 'Yeni satış' : tab}<span className="heading-dot">.</span></h1><p>{({ Satış: 'Hızlı satış, düzenli stok. Her şey kontrolünüzde.', Ürünler: 'Tütün ürünlerinizi ve fiyatlarınızı yönetin.', Stok: 'Stok takibi, ürün girişleri ve alış/satış faturaları.', Kasa: 'Satışlar, tahsilatlar ve günlük giderler.', Veresiye: 'Müşteri hesapları ve tahsilatlar.', Raporlar: 'İşletmenizin rakamlarını yakından takip edin.', Yedekleme: 'Kayıtlarınızı dışa aktarın ve güvenle saklayın.', Müşteriler:'Müşteri kartları, iletişim bilgileri ve hesap hareketleri.', Tedarikçiler:'Tedarikçi kartları, borçlar ve ödemeler.' })[tab]}</p></div><span className="workspace-badge"><span /> MAĞAZA PANELİ</span></div>
 {error && <div role="alert" className="banner error"><AlertTriangle size={18}/><span>{error}</span><button aria-label="Uyarıyı kapat" onClick={() => setError('')}><X size={16}/></button></div>}{notice && <div role="status" className="toast"><Check size={18}/>{notice}</div>}
 {pending && <div className="banner"><span>Son işlemin sonucu bekliyor.</span><button className="btn ghost small" disabled={busy} onClick={retryPending}>Bekleyen işlemi kontrol et</button></div>}{!data ? <div className="empty panel"><Database size={32}/><h2>{error ? 'Kayıtlara erişilemedi' : 'Kayıtlar yükleniyor…'}</h2><button className="btn primary" onClick={() => load().catch(e => setError(e.message))}>Yeniden dene</button></div> : <>
 {(tab === 'Müşteriler' || tab === 'Tedarikçiler') && <ContactsPanel key={tab+completionEpoch} kind={tab==='Tedarikçiler'?'supplier':'customer'} state={data.state} busy={busy} error={error} onAction={act}/>}
 {tab === 'Stok' && <nav className="stock-sections no-print" aria-label="Stok bölümleri">{([{id:'inventory',label:'Stok Takibi'},{id:'purchase',label:'Alış Faturaları'},{id:'sale',label:'Satış Faturaları'}] as const).map(s=><button key={s.id} type="button" aria-pressed={stockSection===s.id} className={stockSection===s.id?'selected':''} onClick={()=>setStockSection(s.id)}>{s.label}</button>)}</nav>}
 {tab === 'Stok' && stockSection !== 'inventory' && <InvoicesPanel key={stockSection+completionEpoch} kind={stockSection} state={data.state} busy={busy} error={error} onAction={act}/>}
 {tab === 'Satış' && <>{stats}{!products.some(p => p.verified) && <div className="setup-banner"><div><strong>Mağazanızı satışa hazırlayın</strong><p>{products.length} ürün taslağı hazır. Fiyat, barkod ve başlangıç stoklarını kontrol ederek ürünleri etkinleştirin.</p></div><button className="btn ghost" onClick={() => navigate('Ürünler')}>Ürünleri düzenle <ArrowUpRight size={16}/></button></div>}<div className="sales-layout"><section className="catalog"><div className="camera-action"><button type="button" className="btn primary" disabled={busy||pending} onClick={()=>{setError('');setCameraOpen(true);}}><Camera size={19}/>Kamerayla okut</button><span className="hint">Telefon kamerasıyla barkodu okutun, ürünü sepete ekleyin.</span></div><form className="search-box" onSubmit={e => { e.preventDefault(); if(normalizeBarcode(query)){scanForSale(query);setQuery('');return;} const p = findProductByBarcode(products,query) as Product|null; if (p) {
            add(p);
            setQuery('');
        }
        else if (listed.length === 1)
            add(listed[0]);
        else
            setError('Barkod bulunamadı. Ürünler ekranından tanımlayabilirsiniz.'); }}><Barcode size={23}/><input ref={searchRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="Barkod okut veya ürün ara" aria-label="Barkod okut veya ürün ara"/><kbd>F2</kbd><button aria-label="Ürün ara"><Search size={20}/></button></form><div className="section-heading"><h2>Ürünler <span className="count">{listed.length}</span></h2><span className="hint">Markaya göre filtrele</span></div><div className="brand-filters">{brands.map(b => <button key={b} className={brand === b ? 'selected' : ''} onClick={() => setBrand(b)}>{b}</button>)}</div><div className="product-grid">{listed.slice(0, 150).map((p, i) => <button key={p.id} className={'product-card ' + (!p.verified ? 'unverified' : '')} disabled={busy} onClick={() => add(p)}><div className={'pack-shape tone-' + (i % 4)}><span>{p.brand}</span><div className="pack-rule"/><Package size={26}/><small>TÜTÜN MAMULÜ</small></div><strong>{p.name}</strong><span className="product-price">{p.price ? money(p.price) : 'Fiyat tanımla'}</span><div className="product-bottom"><small className={p.stock <= p.threshold ? 'orange' : ''}>{p.verified ? `Stok: ${p.stock} paket` : 'Kontrol bekliyor'}</small><span className="add-button"><Plus size={17}/></span></div></button>)}</div>{!listed.length && <div className="empty"><Search size={30}/><h3>Ürün bulunamadı</h3><p>Aramayı veya marka filtresini değiştirin.</p></div>}<p className="catalog-note">Başlangıç kataloğu taslaktır; çeşit, barkod ve fiyatları tedarikçinizle doğrulayın.</p></section>{cartPanel}</div></>}
 {(tab === 'Ürünler' || (tab === 'Stok' && stockSection === 'inventory')) && <><div className="toolbar"><div className="search-box compact"><Search size={19}/><input placeholder="Ürün adı veya barkod ara" aria-label="Ürün ara" value={query} onChange={e => setQuery(e.target.value)}/></div><select value={brand} onChange={e => setBrand(e.target.value)} aria-label="Marka filtresi">{brands.map(b => <option key={b}>{b}</option>)}</select>{tab === 'Stok' && <select aria-label="Stok filtresi" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">Tüm stoklar</option><option value="low">Azalan stoklar</option></select>}<button className="btn primary" onClick={() => { if (tab === 'Ürünler') {
            setProduct(blank);
            setModal('Yeni ürün');
        }
        else {
            setSelected(products[0]?.id || '');
            setModal('Stok girişi');
        } }}><Plus size={17}/>{tab === 'Ürünler' ? 'Yeni ürün' : 'Stok girişi'}</button></div><div className="panel table-wrap"><table><thead><tr><th>ÜRÜN / MARKA</th><th>BARKOD</th><th>ALIŞ</th><th>SATIŞ</th><th>STOK</th><th>DURUM</th><th /></tr></thead><tbody>{listed.map(p => <tr key={p.id}><td><strong>{p.name}</strong><small>{p.brand} · {p.packsPerCarton} paket / karton</small></td><td className="mono">{p.barcode || 'Tanımlanmadı'}</td><td>{money(p.cost)}</td><td>{money(p.price)}</td><td><b>{p.stock}</b> paket</td><td><span className={'tag ' + (!p.verified ? 'muted' : p.stock <= p.threshold ? 'warning' : 'success')}>{!p.verified ? 'Kontrol bekliyor' : p.stock <= p.threshold ? 'Azalan stok' : 'Hazır'}</span></td><td><button className="btn small ghost" onClick={() => { setProduct(p); setModal('Ürün düzenle'); }}>Düzenle</button></td></tr>)}</tbody></table>{!listed.length && <div className="empty">Kayıt bulunamadı.</div>}</div><p className="hint">Stoklar paket bazında tutulur. Karton içindeki paket sayısını ürün üzerinden değiştirebilirsiniz.</p>{tab === 'Stok' && <section className="panel history"><h2>Son stok girişleri</h2>{state?.receipts.slice(0, 15).map(r => <div className="history-row" key={r.id}><span>{products.find(p => p.id === r.productId)?.name}<small>{dateText(r.date)}</small></span><strong className="green-text">+{r.quantity} paket</strong><span>{money(r.cost)} / paket</span></div>)}{!state?.receipts.length && <p className="hint">Henüz stok girişi yapılmadı.</p>}</section>}</>}
 {(tab === 'Kasa' || tab === 'Raporlar') && <><div className="toolbar"><label className="date-label">Başlangıç<input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)}/></label><label className="date-label">Bitiş<input type="date" value={to} min={from} onChange={e => setTo(e.target.value)}/></label><button className="btn ghost" onClick={() => { setFrom(today); setTo(today); }}>Bugün</button>{tab === 'Kasa' ? <button className="btn primary" onClick={() => setModal('Gider ekle')}><Plus size={17}/>Gider ekle</button> : <button className="btn ghost" onClick={() => saveFile('\uFEFF' + ['Tarih;Ödeme;Ciro TL;Brüt kar TL', ...reports.map(s => `${s.date};${paymentText(s.payment)};${(s.total / 100).toFixed(2)};${(s.profit / 100).toFixed(2)}`)].join('\n'), 'satis-raporu.csv', 'text/csv;charset=utf-8')}><Download size={16}/>CSV indir</button>}</div><div className="stats report-stats"><Metric label="Toplam ciro" value={money(salesTotal)} detail={`${reports.length} satış`}/><Metric label="Gider sonrası kâr" value={money(profit)} detail="Satış kârı − giderler"/><Metric label="Nakit hareketi" value={money(cash)} detail="Satış + tahsilat − gider − tedarikçi"/><Metric label="Toplam gider" value={money(expenseTotal)} detail={`${expenses.length} kayıt`}/></div><div className="two-columns"><section className="panel history"><div className="section-heading"><h2>Satış hareketleri</h2><span className="count">{reports.length}</span></div>{reports.slice(0, 100).map(s => <details className="sale-record" key={s.id}><summary><span className="record-icon"><ArrowUpRight size={18}/></span><span><strong>{paymentText(s.payment)} satış</strong><small>{dateText(s.date)} · {s.items.reduce((n, x) => n + x.packs, 0)} paket</small></span><b>{money(s.total)}</b></summary><div className="sale-lines">{s.items.map((i, n) => <p key={n}>{i.name} × {i.packs}<span>{money(i.price * i.packs)}</span></p>)}{s.invoiceId && <p>Fatura iskontosu<span>−{money(s.items.reduce((n,i)=>n+i.price*i.packs,0)-s.total)}</span></p>}<p>Brüt kâr<span>{money(s.profit)}</span></p><small>İşlem: {s.id}</small></div></details>)}{!reports.length && <div className="empty"><Wallet size={30}/><h3>Henüz satış yok</h3><p>Seçilen tarihteki satışlar burada görünür.</p></div>}</section><section className="panel history"><h2>Giderler ve tahsilatlar</h2>{expenses.map(x => <div className="history-row" key={x.id}><span>{x.note}<small>{dateText(x.date)}</small></span><strong className="orange">−{money(x.amount)}</strong></div>)}{collections.map(x => <div className="history-row" key={x.id}><span>{state?.customers.find(c => c.id === x.customerId)?.name}<small>{dateText(x.date)} · {paymentText(x.payment)} tahsilat</small></span><strong className="green-text">+{money(x.amount)}</strong></div>)}{supplierPayments.map(x=><div className="history-row" key={x.id}><span>{state?.suppliers.find(p=>p.id===x.supplierId)?.name}<small>{dateText(x.date)} · {paymentText(x.payment)} tedarikçi ödemesi</small></span><strong className="orange">−{money(x.amount)}</strong></div>)}{!expenses.length && !collections.length && !supplierPayments.length && <p className="empty hint">Bu dönemde gider veya tahsilat yok.</p>}<div className="info-box">Nakit hareketine nakit tedarikçi ödemeleri dahildir; bu ödemeler kârdan ikinci kez düşülmez. Açılış kasa sayımı dahil değildir. Faturasız stok girişleri otomatik ödeme oluşturmaz.</div></section></div></>}
 {tab === 'Veresiye' && <><div className="toolbar"><div className="search-box compact"><Search size={19}/><input placeholder="Müşteri adı ara" value={query} onChange={e => setQuery(e.target.value)}/></div><span className="debt-total">Toplam alacak <b>{money(state?.customers.reduce((n, c) => n + c.debt, 0) || 0)}</b></span><button className="btn primary" onClick={() => setModal('Müşteri ekle')}><Plus size={17}/>Müşteri ekle</button></div><div className="customer-grid">{state?.customers.filter(c => c.name.toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr'))).map(c => <section className="panel customer" key={c.id}><div className="customer-top"><div className="owner-avatar">{c.name.slice(0, 2).toLocaleUpperCase('tr')}</div><div><h3>{c.name}</h3><small>{c.phone || 'Telefon belirtilmedi'}</small></div></div><small>Güncel borç</small><strong className="customer-debt">{money(c.debt)}</strong><button className="btn ghost full" onClick={() => { setSelected(c.id); setModal('Müşteri hesabı'); }}>Hesap hareketleri <ChevronRight size={16}/></button><button disabled={!c.debt} className="btn primary full" onClick={() => { setSelected(c.id); setModal('Tahsilat al'); }}><ArrowDownLeft size={16}/>Tahsilat al</button></section>)}</div>{!state?.customers.length && <div className="empty panel"><Users size={38}/><h3>Müşteri hesaplarınız burada</h3><p>İlk müşterinizi ekleyerek veresiye takibine başlayın.</p></div>}</>}
 {tab === 'Yedekleme' && <><div className="two-columns"><section className="panel backup-card"><span className="stat-icon cyan"><Download /></span><h2>Tüm kayıtları yedekle</h2><p>Ürünler, satışlar, müşteriler ve tüm hareketleri tek bir JSON dosyası olarak indirin.</p><button className="btn primary" onClick={() => saveFile(JSON.stringify({ exportedAt: new Date().toISOString(), state }, null, 2), `tekel-yedek-${today}.json`)}><Download size={17}/>Yedeği indir</button><small>Yedek dosyası müşteri ve işletme bilgileri içerir.</small></section><section className="panel backup-card"><span className="stat-icon amber"><Upload /></span><h2>Yedekten geri yükle</h2><p>TEKEL JSON yedeğini yükleyin. Mevcut kayıtlar seçtiğiniz yedekle değiştirilir.</p><label className="btn ghost file-label"><Upload size={17}/>Yedek dosyası seç<input type="file" accept=".json" disabled={busy} onChange={e => { importFile(e.target.files?.[0], 'json'); e.target.value = ''; }}/></label><small>Geri yüklemeden önce mevcut yedeğinizi indirin.</small></section></div><section className="panel backup-card"><h2>Ürün kataloğu aktarımı</h2><p>Ürünleri CSV ile toplu düzenleyin. Aynı barkod veya ürün adı varsa kayıt güncellenir. Fiyatlar TL, stoklar pakettir.</p><div className="button-row"><button className="btn ghost" onClick={() => saveFile('\uFEFF' + productsCSV(products), 'urun-katalogu.csv', 'text/csv;charset=utf-8')}><Download size={17}/>Ürün CSV indir</button><label className="btn ghost file-label"><Upload size={17}/>Ürün CSV yükle<input type="file" accept=".csv" disabled={busy} onChange={e => { importFile(e.target.files?.[0], 'csv'); e.target.value = ''; }}/></label></div><p className="hint">Kataloğu önce indirerek sütun düzenini kullanın. Barkod hücrelerini metin biçiminde saklayın.</p></section><div className="info-box">{localMode?'Kayıtlar yalnızca bu cihazın bu tarayıcısında saklanır. Diğer cihazlarla eşitlenmez. Tarayıcı verilerini temizlemek kayıtları siler. Düzenli JSON yedeği alın; başka cihaza taşımak için yedeği geri yükleyin.':'Ortak kayıtlar sunucudaki veritabanındadır. Satış ve eşitleme için internet bağlantısı gerekir. Son otomatik eşitleme aralığı: 20 saniye.'}</div></>}
 </>}
 <footer className="app-footer"><span>TEKEL <b>•</b> Bayi Yönetim</span><span>v1.0 · Özel işletme paneli</span></footer></main></div>
 {tab === 'Satış' && cart.length > 0 && <button className="mobile-cart" onClick={() => setShowCart(true)}><ShoppingCart size={20}/><span>Sepet ({cart.length})</span><strong>{money(total)}</strong><ChevronRight size={19}/></button>}
 <nav className="bottom-nav">{tabs.slice(0, 5).map(t => <button className={tab === t.name ? 'active' : ''} key={t.name} onClick={() => navigate(t.name)}><t.icon size={20}/><span>{t.name}</span></button>)}</nav>
 {modal && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget && !busy)
            setModal(null); }}><section className="modal" role="dialog" aria-modal="true" aria-label={modal}><div className="panel-heading"><h2>{modal}</h2><button className="icon-btn" disabled={busy} aria-label="Pencereyi kapat" onClick={() => setModal(null)}><X /></button></div>{error && <p className="banner error">{error}</p>}
 {(modal === 'Yeni ürün' || modal === 'Ürün düzenle') && <ProductForm product={product} busy={busy} onSave={p => act({ type: 'product', product: p, expectedProduct: product.id ? product : undefined }, 'Ürün kaydedildi.')}/>}
 {modal === 'Barkod tanımla' && <div className="barcode-binding"><p>Bu barkod henüz kayıtlı değil. Mevcut bir ürünle eşleştirin veya yeni ürün oluşturun.</p><p className="scan-code">{unknownBarcode}</p><label>Ürün adı ara<input value={barcodeQuery} onChange={e=>setBarcodeQuery(e.target.value)} placeholder="Ürün adı"/></label><label>Barkodu boş ürün<select value={barcodeProductId} onChange={e=>setBarcodeProductId(e.target.value)}><option value="">Ürün seçin</option>{products.filter(p=>!p.barcode&&p.name.toLocaleLowerCase('tr').includes(barcodeQuery.toLocaleLowerCase('tr'))).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><p>Stok ve fiyatı hazırsa ürün sepete eklenir. Başka bir barkodun üzerine yazılmaz.</p><button type="button" className="btn primary full" disabled={busy||!barcodeProductId} onClick={bindScannedBarcode}>Barkodu bağla ve sepete ekle</button><div className="button-row"><button type="button" className="btn ghost full" disabled={busy} onClick={()=>{setProduct({...blank,barcode:unknownBarcode});setModal('Yeni ürün');}}>Bu barkodla yeni ürün ekle</button></div></div>}
 {modal === 'Müşteri ekle' && <form className="form-grid" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); act({ type: 'customer', name: f.get('name'), phone: f.get('phone') }, 'Müşteri eklendi.'); }}><label className="wide">Ad soyad<input autoFocus name="name" required maxLength={140}/></label><label className="wide">Telefon<input name="phone" type="tel" maxLength={40}/></label><button className="btn primary wide" disabled={busy}>Müşteriyi kaydet</button></form>}
 {modal === 'Stok girişi' && <form className="form-grid" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); act({ type: 'receipt', productId: f.get('productId'), quantity: Number(f.get('quantity')), cost: Math.round(Number(f.get('cost')) * 100) }, 'Stok girişi kaydedildi.'); }}><label className="wide">Ürün<select name="productId" value={selected} onChange={e => setSelected(e.target.value)}>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Gelen paket sayısı<input autoFocus type="number" name="quantity" required min="1" step="1"/></label><label>Yeni alış fiyatı (₺ / paket)<input key={selected} type="number" name="cost" required min="0.01" step="0.01" defaultValue={(products.find(p => p.id === selected)?.cost || 0) / 100}/></label><p className="hint wide">Alış fiyatı güncellenir. Eski satışların kârı değişmez. Bu kayıt kasadan otomatik düşülmez.</p><button className="btn primary wide" disabled={busy}>Stok girişini kaydet</button></form>}
 {modal === 'Gider ekle' && <form className="form-grid" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); act({ type: 'expense', amount: Math.round(Number(f.get('amount')) * 100), note: f.get('note') }, 'Nakit gider kaydedildi.'); }}><label className="wide">Açıklama<input name="note" required maxLength={140} autoFocus/></label><label className="wide">Nakit gider tutarı (₺)<input name="amount" type="number" min="0.01" step="0.01" required/></label><button className="btn primary wide" disabled={busy}>Gideri kaydet</button></form>}
 {modal === 'Tahsilat al' && <form className="form-grid" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); act({ type: 'collection', customerId: selected, amount: Math.round(Number(f.get('amount')) * 100), payment: f.get('payment') }, 'Tahsilat kaydedildi.'); }}><p className="wide">{state?.customers.find(c => c.id === selected)?.name} · Borç: <b>{money(state?.customers.find(c => c.id === selected)?.debt || 0)}</b></p><label>Tutar (₺)<input autoFocus name="amount" type="number" min="0.01" step="0.01" max={(state?.customers.find(c => c.id === selected)?.debt || 0) / 100} required/></label><label>Ödeme<select name="payment"><option value="cash">Nakit</option><option value="card">Kart</option></select></label><button className="btn primary wide" disabled={busy}>Tahsilatı kaydet</button></form>}
 {modal === 'Veresiye satış' && <div className="form-grid"><label className="wide">Müşteri seç<select value={customerId} onChange={e => setCustomerId(e.target.value)}><option value="">Müşteri seçin</option>{state?.customers.map(c => <option key={c.id} value={c.id}>{c.name} · {money(c.debt)}</option>)}</select></label><p className="hint wide">Yeni müşteri eklemek için Veresiye ekranını kullanın. Sepetiniz korunur.</p><div className="total wide"><span>Borca eklenecek</span><strong>{money(total)}</strong></div><button disabled={!customerId || busy} className="btn primary wide" onClick={() => checkout('credit')}>Veresiye satışı kaydet</button></div>}
 {modal === 'Müşteri hesabı' && <div className="history"><h3>{state?.customers.find(c => c.id === selected)?.name}</h3>{state?.sales.filter(s => s.customerId === selected && s.payment === 'credit').map(s => <div key={s.id} className="history-row"><span>Veresiye satış<small>{dateText(s.date)}</small></span><b className="orange">+{money(s.total)}</b></div>)}{state?.collections.filter(c => c.customerId === selected).map(c => <div key={c.id} className="history-row"><span>{paymentText(c.payment)} tahsilat<small>{dateText(c.date)}</small></span><b className="green-text">−{money(c.amount)}</b></div>)}</div>}
 </section></div>}
 {cameraOpen && <CameraScanner onClose={()=>setCameraOpen(false)} onScan={scanForSale}/>}
 </div>;
}
function Metric({ label, value, detail }: {
    label: string;
    value: string;
    detail: string;
}) { return <div className="stat metric"><small>{label}</small><strong>{value}</strong><em>{detail}</em></div>; }
