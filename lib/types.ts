export type Product = {
    id: string;
    name: string;
    brand: string;
    barcode: string;
    price: number;
    cost: number;
    stock: number;
    threshold: number;
    packsPerCarton: number;
    verified: boolean;
};
export type Customer = {
    id: string;
    name: string;
    phone: string;
    debt: number;
    address?: string;
    taxNo?: string;
};
export type Sale = {
    id: string;
    date: string;
    payment: 'cash' | 'card' | 'credit';
    customerId: string | null;
    total: number;
    profit: number;
    invoiceId?: string;
    items: {
        id: string;
        name: string;
        packs: number;
        price: number;
        cost: number;
    }[];
};
export type State = {
    schema: number;
    products: Product[];
    customers: Customer[];
    sales: Sale[];
    suppliers: Customer[];
    invoices: Invoice[];
    supplierPayments: {
        id: string;
        supplierId: string;
        invoiceId: string | null;
        date: string;
        amount: number;
        payment: 'cash' | 'card';
    }[];
    expenses: {
        id: string;
        date: string;
        amount: number;
        note: string;
    }[];
    collections: {
        id: string;
        date: string;
        amount: number;
        customerId: string;
        payment: string;
    }[];
    receipts: {
        id: string;
        date: string;
        productId: string;
        quantity: number;
        cost: number;
        invoiceId?: string;
    }[];
};
export type InvoiceLine = {
    productId: string;
    name: string;
    barcode: string;
    quantity: number;
    unit: 'pack' | 'carton';
    packsPerCarton: number;
    packs: number;
    unitPrice: number;
    cost: number;
    gross: number;
    net: number;
};
export type Invoice = {
    id: string;
    kind: 'purchase' | 'sale';
    number: string;
    date: string;
    createdAt: string;
    partyId: string;
    party: {
        name: string;
        phone: string;
        address: string;
        taxNo: string;
    };
    payment: 'cash' | 'card' | 'credit';
    dueDate: string | null;
    note: string;
    lines: InvoiceLine[];
    subtotal: number;
    discounts: number[];
    discountAmounts: number[];
    total: number;
    saleId: string | null;
};
export type Envelope = {
    state: State & {
        operations?: {
            id: string;
            hash: string;
        }[];
    };
    version: number;
};
