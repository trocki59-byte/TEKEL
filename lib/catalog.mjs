// Başlangıç taslağı: barkodlar ve fiyatlar mağazada doğrulanmalıdır.
export const catalogSources = [
    { title: 'JTI marka portföyü', url: 'https://www.jti.com/en/our-brands' },
    { title: 'Türkiye marka ve seri araştırması (ikincil kaynak)', url: 'https://www.karekod.org/blog/turkiyede-satilan-sigara-markalari/' }
];
const groups = {
    Marlboro: ['Red', 'Touch', 'Touch Blue', 'Touch Gray', 'Touch White', 'Edge', 'Edge Blue', 'Edge Sky', 'Roll 50 g'],
    Parliament: ['Aqua Blue', 'Night Blue', 'Reserve', 'Midnight Blue', 'Aqua Slims', 'Aqua Blue Long'],
    Muratti: ['Rosso', 'Blu', 'Bianco'], Lark: ['Red', 'Blue'], Chesterfield: ['Red', 'Blue'], 'L&M': ['Red', 'Blue'],
    Winston: ['Dark Blue', 'Deep Blue', 'Slender Blue', 'Slender Gray', 'Slims Blue', 'Slims Gray', 'Xsence Blue', 'Xsence Gray'],
    Camel: ['Yellow', 'Brown', 'Deep Blue', 'Black', 'White', 'Slender Blue', 'Slender Gray', 'Tütün 100 g'],
    LD: ['Blue', 'Slims'], 'Monte Carlo': ['Slender', 'Blue'],
    Kent: ['Blue', 'Dark Blue', 'D-Range Blue', 'D-Range Gray', 'D-Range Long', 'Slims', 'White'],
    Rothmans: ['Blue', 'Gray'], 'Tekel 2000': [''], 'Tekel 2001': [''], Viceroy: ['Blue', 'Red'], 'Pall Mall': ['Blue', 'Red'], Maltepe: [''], Samsun: [''],
    Davidoff: ['Classic', 'Burgundy', 'Ivory', 'White', 'Slims', 'C Line'], West: ['Blue', 'Gray'], Polo: [''], Bianca: [''],
    Winner: [''], HD: [''], President: [''], Violet: [''], Medley: [''], Hazar: [''], MMC: [''], Point: [''], 'Toros 2005': ['']
};
export function initialProducts() { return Object.entries(groups).flatMap(([brand, variants]) => variants.map((variant, index) => ({ id: brand.toLowerCase().replace(/[^a-z0-9]/g, '') + '-' + index, brand, name: (brand + ' ' + variant).trim(), barcode: '', price: 0, cost: 0, stock: 0, threshold: 5, packsPerCarton: 10, verified: false }))); }
