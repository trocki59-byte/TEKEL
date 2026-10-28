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
};
export type Sale = {
    id: string;
    date: string;
    payment: 'cash' | 'card' | 'credit';
    customerId: string | null;
    total: number;
    profit: number;
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
    }[];
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
