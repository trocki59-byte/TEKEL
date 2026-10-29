// Invoice amounts are integer kuruş; discount rates are basis points (100 = 1%).
const MAX = 1000000000;
const fail = message => { throw new Error(message); };
const int = (x, min = 0) => Number.isSafeInteger(x) && x >= min && x <= MAX;
const str = (x, max = 140) => typeof x === 'string' && x.trim().length > 0 && x.length <= max;
const payment = x => ['cash', 'card', 'credit'].includes(x);
const dateOnly = x => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && Number.isFinite(Date.parse(x)) && new Date(x).toISOString().slice(0, 10) === x;
const timestamp = x => typeof x === 'string' && Number.isFinite(Date.parse(x));
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export function normalizeInvoiceState(s) { return { ...s, invoices: s.invoices ?? [], suppliers: s.suppliers ?? [], supplierPayments: s.supplierPayments ?? [] }; }
export function calculateInvoice(lines, discounts) {
    if (!Array.isArray(lines) || !lines.length || lines.length > 100)
        fail('Faturaya 1–100 ürün ekleyin.');
    if (!Array.isArray(discounts) || discounts.length !== 3 || discounts.some(x => !int(x) || x > 10000))
        fail('Üç iskonto oranı %0–100 arasında olmalıdır.');
    const grosses = lines.map(l => { if (!int(l.packs, 1) || !int(l.unitPrice, 1) || !int(l.packs * l.unitPrice, 1))
        fail('Fatura miktarı veya birim fiyatı geçersiz.'); return l.packs * l.unitPrice; });
    const subtotal = grosses.reduce((s, x) => s + x, 0);
    if (!int(subtotal, 1))
        fail('Fatura tutarı sınırı aşıldı.');
    let total = subtotal;
    const discountAmounts = discounts.map(rate => { const amount = Math.floor((total * rate + 5000) / 10000); total -= amount; return amount; });
    // Largest-remainder allocation uses BigInt to preserve kuruş for large amounts.
    const shares = grosses.map((gross, index) => ({ index, base: Number(BigInt(gross) * BigInt(total) / BigInt(subtotal)), remainder: BigInt(gross) * BigInt(total) % BigInt(subtotal) }));
    let residual = total - shares.reduce((s, x) => s + x.base, 0);
    const sorted = [...shares].sort((a, b) => a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1);
    for (let i = 0; i < residual; i++)
        sorted[i].base++;
    return { subtotal, discounts: [...discounts], discountAmounts, total, lineTotals: shares.map(x => x.base) };
}
function partySnapshot(p) { return { name: p.name, phone: p.phone, address: p.address || '', taxNo: p.taxNo || '' }; }
function validateParty(p) { if (!p || !str(p.id) || !str(p.name) || typeof p.phone !== 'string' || p.phone.length > 40 || !int(p.debt) || p.address !== undefined && (typeof p.address !== 'string' || p.address.length > 500) || p.taxNo !== undefined && (typeof p.taxNo !== 'string' || p.taxNo.length > 32))
    fail('Cari kart bilgileri geçersiz.'); }
export function applyInvoiceAction(s, a, now) {
    if (a.type === 'contact') {
        if (!['customer', 'supplier'].includes(a.kind) || !a.contact)
            fail('Cari kart türü geçersiz.');
        const list = a.kind === 'customer' ? s.customers : s.suppliers, p = a.contact, index = list.findIndex(x => x.id === p.id);
        if (p.id && index < 0)
            fail('Cari kart bulunamadı.');
        if (index >= 0 && a.expectedContact && !equal(list[index], a.expectedContact))
            fail('Cari kart başka cihazda değişti. Yeniden açıp deneyin.');
        const c = { id: index >= 0 ? p.id : crypto.randomUUID(), name: typeof p.name === 'string' ? p.name.trim() : p.name, phone: typeof p.phone === 'string' ? p.phone.trim() : '', address: typeof p.address === 'string' ? p.address.trim() : '', taxNo: typeof p.taxNo === 'string' ? p.taxNo.trim() : '', debt: index >= 0 ? list[index].debt : 0 };
        validateParty(c);
        if (index < 0)
            list.push(c);
        else
            list[index] = c;
        return s;
    }
    if (a.type === 'supplierPayment') {
        const p = s.suppliers.find(x => x.id === a.supplierId);
        if (!p || !int(a.amount, 1) || a.amount > p.debt)
            fail('Ödeme tedarikçi borcunu aşamaz.');
        if (!['cash', 'card'].includes(a.payment))
            fail('Ödeme türü geçersiz.');
        p.debt -= a.amount;
        s.supplierPayments.unshift({ id: crypto.randomUUID(), supplierId: p.id, date: now, amount: a.amount, payment: a.payment, invoiceId: null });
        return s;
    }
    if (a.type !== 'invoice')
        return null;
    if (!['purchase', 'sale'].includes(a.kind) || !str(a.number, 80) || !dateOnly(a.date) || !payment(a.payment))
        fail('Fatura türü, numarası, tarihi veya ödeme şekli geçersiz.');
    if (a.dueDate && (!dateOnly(a.dueDate) || a.dueDate < a.date))
        fail('Vade tarihi fatura tarihinden önce olamaz.');
    if (typeof a.note !== 'string' || a.note.length > 500)
        fail('Fatura notu en fazla 500 karakter olmalıdır.');
    const party = (a.kind === 'purchase' ? s.suppliers : s.customers).find(x => x.id === a.partyId);
    if (!party)
        fail(a.kind === 'purchase' ? 'Tedarikçi seçin.' : 'Müşteri seçin.');
    const number = a.number.trim();
    if (s.invoices.some(x => x.kind === a.kind && x.number.toLocaleUpperCase('tr') === number.toLocaleUpperCase('tr') && (a.kind === 'sale' || x.partyId === party.id)))
        fail('Bu fatura numarası zaten kayıtlı.');
    if (!Array.isArray(a.lines) || !a.lines.length || a.lines.length > 100)
        fail('Faturaya ürün ekleyin.');
    const seen = new Set();
    const lines = a.lines.map(l => { const p = s.products.find(x => x.id === l.productId); if (!p || seen.has(p.id) || !int(l.quantity, 1) || !['pack', 'carton'].includes(l.unit))
        fail('Ürün, miktar veya tekrarlayan fatura satırı geçersiz.'); seen.add(p.id); const packs = l.quantity * (l.unit === 'carton' ? p.packsPerCarton : 1); if (!int(packs, 1))
        fail('Paket miktarı geçersiz.'); if (a.kind === 'sale' && (!p.verified || p.cost < 0))
        fail('Satış için ürün ve alış maliyetini doğrulayın.'); if (a.kind === 'sale' && p.stock < packs)
        fail(p.name + ': yetersiz stok.'); return { productId: p.id, name: p.name, barcode: p.barcode, quantity: l.quantity, unit: l.unit, packsPerCarton: p.packsPerCarton, packs, unitPrice: l.unitPrice, cost: p.cost }; });
    const totals = calculateInvoice(lines, a.discounts), id = crypto.randomUUID(), date = a.date + 'T12:00:00+03:00';
    const invoice = { id, kind: a.kind, number, date, createdAt: now, partyId: party.id, party: partySnapshot(party), payment: a.payment, dueDate: a.payment === 'credit' ? (a.dueDate || null) : null, note: a.note.trim(), lines: lines.map((l, i) => ({ ...l, gross: l.packs * l.unitPrice, net: totals.lineTotals[i] })), subtotal: totals.subtotal, discounts: totals.discounts, discountAmounts: totals.discountAmounts, total: totals.total, saleId: a.kind === 'sale' ? 'invoice-' + id : null };
    if (a.kind === 'purchase') {
        for (const [index, l] of invoice.lines.entries()) {
            const p = s.products.find(p => p.id === l.productId);
            p.stock += l.packs;
            p.cost = Math.round(l.net / l.packs);
            s.receipts.unshift({ id: crypto.randomUUID(), date, productId: p.id, quantity: l.packs, cost: p.cost, invoiceId: id, lineIndex: index });
        }
        party.debt += invoice.total;
        if (a.payment !== 'credit' && invoice.total > 0) {
            party.debt -= invoice.total;
            s.supplierPayments.unshift({ id: crypto.randomUUID(), date, supplierId: party.id, amount: invoice.total, payment: a.payment, invoiceId: id });
        }
    }
    else {
        for (const l of invoice.lines)
            s.products.find(p => p.id === l.productId).stock -= l.packs;
        if (a.payment === 'credit')
            party.debt += invoice.total;
        const items = invoice.lines.map(l => ({ id: l.productId, name: l.name, packs: l.packs, price: l.unitPrice, cost: l.cost }));
        s.sales.unshift({ id: invoice.saleId, date, payment: a.payment, customerId: party.id, items, total: invoice.total, profit: invoice.total - items.reduce((n, i) => n + i.packs * i.cost, 0), invoiceId: id });
    }
    s.invoices.unshift(invoice);
    return s;
}
export function validateInvoiceRecords(s) {
    for (const key of ['suppliers', 'invoices', 'supplierPayments'])
        if (!Array.isArray(s[key]) || s[key].length > 100000)
            fail('Fatura/cari kayıtları geçersiz.');
    const supplierIds = new Set();
    for (const p of s.suppliers) {
        validateParty(p);
        if (supplierIds.has(p.id))
            fail('Tekrarlayan tedarikçi.');
        supplierIds.add(p.id);
    }
    for (const c of s.customers)
        validateParty(c);
    const invoiceIds = new Set(), numbers = new Set();
    for (const x of s.invoices) {
        if (!str(x.id) || invoiceIds.has(x.id) || !['purchase', 'sale'].includes(x.kind) || !str(x.number, 80) || !timestamp(x.date) || !timestamp(x.createdAt) || !payment(x.payment) || !str(x.party?.name) || typeof x.party.phone !== 'string' || typeof x.party.address !== 'string' || typeof x.party.taxNo !== 'string' || typeof x.note !== 'string' || x.note.length > 500)
            fail('Fatura kaydı geçersiz.');
        if (!(x.kind === 'purchase' ? s.suppliers : s.customers).some(p => p.id === x.partyId))
            fail('Fatura cari kartı bulunamadı.');
        const key = x.kind + ':' + (x.kind === 'purchase' ? x.partyId : '') + ':' + x.number.toLocaleUpperCase('tr');
        if (numbers.has(key))
            fail('Tekrarlayan fatura numarası.');
        numbers.add(key);
        invoiceIds.add(x.id);
        if (x.dueDate && (!dateOnly(x.dueDate) || x.dueDate < x.date.slice(0, 10)))
            fail('Fatura vadesi geçersiz.');
        const totals = calculateInvoice(x.lines, x.discounts), seen = new Set();
        x.lines.forEach((l, i) => { if (!s.products.some(p => p.id === l.productId) || seen.has(l.productId) || !str(l.name) || !int(l.cost) || !int(l.quantity, 1) || !int(l.packsPerCarton, 1) || l.packsPerCarton > 100 || !['pack', 'carton'].includes(l.unit) || l.packs !== l.quantity * (l.unit === 'carton' ? l.packsPerCarton : 1) || l.gross !== l.packs * l.unitPrice || l.net !== totals.lineTotals[i])
            fail('Fatura satırları tutarsız.'); seen.add(l.productId); });
        if (x.subtotal !== totals.subtotal || x.total !== totals.total || !equal(x.discountAmounts, totals.discountAmounts))
            fail('Fatura iskonto/toplam bilgileri tutarsız.');
        if (x.kind === 'sale') {
            const sales = s.sales.filter(y => y.invoiceId === x.id), sale = sales[0];
            if (sales.length !== 1 || sale.id !== x.saleId || sale.total !== x.total || sale.customerId !== x.partyId || sale.payment !== x.payment || sale.date !== x.date || !equal(sale.items, x.lines.map(l => ({ id: l.productId, name: l.name, packs: l.packs, price: l.unitPrice, cost: l.cost }))))
                fail('Fatura satış hareketiyle tutarsız.');
        }
        else {
            if (x.saleId !== null)
                fail('Alış faturasının satış hareketi olamaz.');
            const receipts = s.receipts.filter(r => r.invoiceId === x.id);
            if (receipts.length !== x.lines.length || x.lines.some((l, i) => !receipts.some(r => r.lineIndex === i && r.productId === l.productId && r.quantity === l.packs && r.cost === Math.round(l.net / l.packs) && r.date === x.date)))
                fail('Fatura stok hareketleri tutarsız.');
            const paid = s.supplierPayments.filter(p => p.invoiceId === x.id);
            if (x.payment === 'credit' ? paid.length > 0 : x.total > 0 ? (paid.length !== 1 || paid[0].amount !== x.total || paid[0].payment !== x.payment || paid[0].supplierId !== x.partyId || paid[0].date !== x.date) : paid.length > 0)
                fail('Fatura ödemesi tutarsız.');
        }
    }
    for (const sale of s.sales)
        if (sale.invoiceId && !s.invoices.some(x => x.id === sale.invoiceId && x.kind === 'sale'))
            fail('Satış faturasının belgesi eksik.');
    for (const r of s.receipts)
        if (r.invoiceId && !s.invoices.some(x => x.id === r.invoiceId && x.kind === 'purchase'))
            fail('Stok faturasının belgesi eksik.');
    const paymentIds = new Set();
    for (const p of s.supplierPayments) {
        if (!str(p.id) || paymentIds.has(p.id) || !supplierIds.has(p.supplierId) || !int(p.amount, 1) || !['cash', 'card'].includes(p.payment) || !timestamp(p.date) || p.invoiceId && !s.invoices.some(x => x.id === p.invoiceId && x.kind === 'purchase'))
            fail('Tedarikçi ödemesi geçersiz.');
        paymentIds.add(p.id);
    }
    for (const p of s.suppliers) {
        const debt = s.invoices.filter(x => x.kind === 'purchase' && x.partyId === p.id).reduce((n, x) => n + x.total, 0) - s.supplierPayments.filter(x => x.supplierId === p.id).reduce((n, x) => n + x.amount, 0);
        if (debt !== p.debt)
            fail('Tedarikçi borcu hareketlerle tutarsız.');
    }
    return s;
}
