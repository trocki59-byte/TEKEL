export function normalizeBarcode(raw) { if (typeof raw !== 'string')
    return null; const code = raw.trim(); return /^\d{8,14}$/.test(code) ? code : null; }
export function barcodeKey(raw) { const code = normalizeBarcode(raw); return code ? code.padStart(14, '0') : null; }
export function findProductByBarcode(products, raw) { const key = barcodeKey(raw); if (!key)
    return null; const matches = products.filter(p => barcodeKey(p.barcode) === key); return matches.length === 1 ? matches[0] : null; }
export function cameraErrorMessage(error) { switch (error?.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError': return 'Kamera izni verilmedi. Tarayıcı/site ayarlarından kamera iznini açıp yeniden deneyin.';
    case 'NotFoundError':
    case 'DevicesNotFoundError': return 'Bu cihazda kullanılabilir kamera bulunamadı.';
    case 'NotReadableError':
    case 'TrackStartError': return 'Kamera başka bir uygulamada açık veya başlatılamıyor. Diğer uygulamaları kapatıp yeniden deneyin.';
    case 'SecurityError': return 'Kamera için uygulamayı HTTPS adresinden açın.';
    case 'NotSupportedError': return 'Bu tarayıcı kameraya erişimi desteklemiyor. Telefon tarayıcısından uygulama bağlantısını açın.';
    default: return 'Kamera başlatılamadı. İzinleri ve bağlantıyı kontrol edip yeniden deneyin.';
} }
