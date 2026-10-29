import { initialProducts } from './catalog.mjs';
import {normalizeBarcode,barcodeKey} from './barcodes.mjs';
import { normalizeInvoiceState, applyInvoiceAction, validateInvoiceRecords } from './invoices.mjs';
const MAX = 1000000000;
const fail = message => { throw new Error(message); };
const integer = (x, min = 0) => Number.isSafeInteger(x) && x >= min && x <= MAX;
const text = (x, max = 140) => typeof x === 'string' && x.trim().length > 0 && x.length <= max;
const newId = () => crypto.randomUUID();
export function createState() { return { schema: 1, products: initialProducts(), sales: [], customers: [], collections: [], expenses: [], receipts: [], operations: [], suppliers: [], invoices: [], supplierPayments: [] }; }
export function validateState(s) {
    if (!s || s.schema !== 1)
        fail('Yedek sürümü geçersiz.');
    s = normalizeInvoiceState(s);
    for (const key of ['products', 'sales', 'customers', 'collections', 'expenses', 'receipts'])
        if (!Array.isArray(s[key]) || s[key].length > 100000)
            fail('Yedek kayıtları geçersiz.');
    if (s.operations !== undefined && (!Array.isArray(s.operations) || s.operations.some(x => !text(x.id) || !text(x.hash, 128))))
        fail('İşlem kimlikleri geçersiz.');
    const ids = new Set(), barcodes = new Set();
    for (const p of s.products) {
        if (!text(p.id) || ids.has(p.id) || !text(p.name) || !text(p.brand) || typeof p.barcode !== 'string' || p.barcode.length > 32 || ![p.price, p.cost, p.stock, p.threshold].every(n => integer(n)) || !integer(p.packsPerCarton, 1) || p.packsPerCarton > 100 || typeof p.verified !== 'boolean')
            fail('Ürün bilgileri geçersiz.');
        ids.add(p.id);
        if (p.barcode) {
            if (!/^\d{8,14}$/.test(p.barcode) || barcodes.has(p.barcode))
                fail('Barkod 8–14 rakam olmalı ve benzersiz olmalıdır.');
            barcodes.add(p.barcode);
        }
    }
    const customers = new Set();
    for (const c of s.customers) {
        if (!text(c.id) || customers.has(c.id) || !text(c.name) || typeof c.phone !== 'string' || c.phone.length > 40 || !integer(c.debt))
            fail('Müşteri bilgileri geçersiz.');
        customers.add(c.id);
    }
    const saleIds = new Set();
    for (const sale of s.sales) {
        if (!text(sale.id) || saleIds.has(sale.id) || !['cash', 'card', 'credit'].includes(sale.payment) || !integer(sale.total, sale.invoiceId ? 0 : 1) || !Number.isSafeInteger(sale.profit) || !Number.isFinite(Date.parse(sale.date)) || !Array.isArray(sale.items) || !sale.items.length)
            fail('Satış kaydı geçersiz.');
        saleIds.add(sale.id);
        let total = 0, profit = 0;
        for (const i of sale.items) {
            if (!text(i.id) || !text(i.name) || !integer(i.packs, 1) || !integer(i.price, 1) || !integer(i.cost))
                fail('Satış kalemi geçersiz.');
            total += i.packs * i.price;
            profit += i.packs * (i.price - i.cost);
        }
        const invoice = sale.invoiceId ? s.invoices.find(x => x.id === sale.invoiceId) : null;
        if (sale.invoiceId && !invoice)
            fail('Satış faturası eksik.');
        if ((invoice ? (total !== invoice.subtotal || sale.total !== invoice.total || sale.profit !== profit - (total - invoice.total)) : (total !== sale.total || profit !== sale.profit)) || total > MAX)
            fail('Satış tutarı geçersiz.');
        if (sale.payment === 'credit' && !customers.has(sale.customerId))
            fail('Satış müşterisi bulunamadı.');
    }
    for (const [key] of [['expenses'], ['collections'], ['receipts']]) {
        const recordIds = new Set();
        for (const x of s[key]) {
            if (!text(x.id) || recordIds.has(x.id) || !Number.isFinite(Date.parse(x.date)))
                fail('Hareket kaydı geçersiz.');
            recordIds.add(x.id);
            if (key === 'receipts') {
                if (!ids.has(x.productId) || !integer(x.quantity, 1) || !integer(x.cost))
                    fail('Stok hareketi geçersiz.');
            }
            else if (!integer(x.amount, 1))
                fail('Tutar geçersiz.');
            if (key === 'expenses' && !text(x.note))
                fail('Gider açıklaması geçersiz.');
            if (key === 'collections' && (!customers.has(x.customerId) || !['cash', 'card'].includes(x.payment)))
                fail('Tahsilat geçersiz.');
        }
    }
    for (const c of s.customers) {
        const debt = s.sales.filter(x => x.payment === 'credit' && x.customerId === c.id).reduce((a, x) => a + x.total, 0) - s.collections.filter(x => x.customerId === c.id).reduce((a, x) => a + x.amount, 0);
        if (c.debt !== debt)
            fail('Müşteri borcu hareketlerle tutarsız.');
    }
    return validateInvoiceRecords(s);
}
export function applyAction(input, a) {
    if (!a || !text(a.type))
        fail('İşlem geçersiz.');
    if (a.type === 'restore')
        return structuredClone(validateState(a.state));
    const s = normalizeInvoiceState(structuredClone(input)), date = new Date().toISOString();
    if(a.type==='bindBarcode'){
        const p=s.products.find(p=>p.id===a.productId),code=normalizeBarcode(a.barcode);
        if(!p||!code)fail('Ürün veya barkod geçersiz.');
        if(p.barcode&&p.barcode!==code)fail('Ürünün barkodu zaten tanımlı. Ürünler ekranından kontrol edin.');
        if(s.products.some(x=>x.id!==p.id&&barcodeKey(x.barcode)===barcodeKey(code)))fail('Barkod başka ürüne kayıtlı.');
        return applyAction(s,{type:'product',product:{...p,barcode:code},expectedProduct:a.expectedProduct});
    }
    const invoiceResult = applyInvoiceAction(s, a, date);
    if (invoiceResult)
        return validateState(invoiceResult);
    if (a.type === 'product') {
        const p = a.product;
        if (!p)
            fail('Ürün eksik.');
        const index = s.products.findIndex(x => x.id === p.id);
        const clean = { id: index < 0 ? newId() : p.id, name: p.name?.trim(), brand: p.brand?.trim(), barcode: p.barcode?.trim() || '', price: p.price, cost: p.cost, stock: p.stock, threshold: p.threshold, packsPerCarton: p.packsPerCarton, verified: !!p.verified };
        if(clean.barcode&&s.products.some(x=>x.id!==clean.id&&barcodeKey(x.barcode)===barcodeKey(clean.barcode)))fail('Barkod başka ürüne kayıtlı.');
        if (index >= 0 && a.expectedProduct && JSON.stringify(s.products[index]) !== JSON.stringify(a.expectedProduct))
            fail('Ürün başka cihazda değişti. Düzenleme penceresini kapatıp yeniden açın.');
        if (index < 0)
            s.products.push(clean);
        else
            s.products[index] = clean;
    }
    else if (a.type === 'customer') {
        if (!text(a.name) || typeof a.phone !== 'string' || a.phone.length > 40)
            fail('Müşteri adı ve telefonunu kontrol edin.');
        s.customers.push({ id: newId(), name: a.name.trim(), phone: a.phone.trim(), debt: 0 });
    }
    else if (a.type === 'sale') {
        if (!text(a.id) || s.sales.some(x => x.id === a.id))
            fail('Bu satış kaydı zaten işlendi.');
        if (!['cash', 'card', 'credit'].includes(a.payment) || !Array.isArray(a.items) || !a.items.length || a.items.length > 100)
            fail('Sepet veya ödeme geçersiz.');
        const customer = s.customers.find(x => x.id === a.customerId);
        if (a.payment === 'credit' && !customer)
            fail('Veresiye için müşteri seçin.');
        const items = [];
        let total = 0, profit = 0;
        for (const line of a.items) {
            const p = s.products.find(x => x.id === line.id);
            if (!p || !integer(line.quantity, 1) || !['pack', 'carton'].includes(line.unit))
                fail('Sepette geçersiz ürün veya miktar.');
            const packs = line.quantity * (line.unit === 'carton' ? p.packsPerCarton : 1);
            if (!p.verified || p.price <= 0 || p.cost < 0)
                fail('Ürünün alış/satış fiyatını doğrulayın.');
            if (p.stock < packs)
                fail(p.name + ': yetersiz stok.');
            p.stock -= packs;
            total += packs * p.price;
            profit += packs * (p.price - p.cost);
            items.push({ id: p.id, name: p.name, packs, price: p.price, cost: p.cost });
        }
        if (!integer(total, 1))
            fail('Satış tutarı sınırı aşıldı.');
        if (a.payment === 'credit')
            customer.debt += total;
        s.sales.unshift({ id: a.id, date, payment: a.payment, customerId: customer?.id || null, items, total, profit });
    }
    else if (a.type === 'receipt') {
        const p = s.products.find(x => x.id === a.productId);
        if (!p || !integer(a.quantity, 1) || !integer(a.cost, 1))
            fail('Stok girişi geçersiz.');
        p.stock += a.quantity;
        p.cost = a.cost;
        s.receipts.unshift({ id: newId(), date, productId: p.id, quantity: a.quantity, cost: a.cost });
    }
    else if (a.type === 'expense') {
        if (!integer(a.amount, 1) || !text(a.note))
            fail('Gider tutarı ve açıklaması gerekli.');
        s.expenses.unshift({ id: newId(), date, amount: a.amount, note: a.note.trim() });
    }
    else if (a.type === 'collection') {
        const c = s.customers.find(x => x.id === a.customerId);
        if (!c || !integer(a.amount, 1) || a.amount > c.debt)
            fail('Tahsilat müşteri borcunu aşamaz.');
        if (!['cash', 'card'].includes(a.payment))
            fail('Ödeme türü geçersiz.');
        c.debt -= a.amount;
        s.collections.unshift({ id: newId(), date, customerId: c.id, amount: a.amount, payment: a.payment });
    }
    else if (a.type === 'importProducts') {
        if (!Array.isArray(a.products) || a.products.length > 2000)
            fail('En fazla 2000 ürün yükleyin.');
        let result = s;
        for (const p of a.products) {
            const existing = result.products.find(x => p.barcode && x.barcode === p.barcode) || result.products.find(x => x.name.toLocaleLowerCase('tr') === String(p.name).toLocaleLowerCase('tr'));
            result = applyAction(result, { type: 'product', product: { ...p, id: existing?.id } });
        }
        return result;
    }
    else
        fail('Bilinmeyen işlem.');
    return validateState(s);
}
