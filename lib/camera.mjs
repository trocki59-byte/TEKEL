import { normalizeBarcode } from './barcodes.mjs';
export async function createBarcodeReader() {
    const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([import('@zxing/browser'), import('@zxing/library')]);
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.CODE_128, BarcodeFormat.ITF]);
    return new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 150, delayBetweenScanSuccess: 500 });
}
export async function startCameraSession({ video, signal, onCode, mediaDevices = globalThis.navigator?.mediaDevices, createReader = createBarcodeReader }) {
    let stream, controls, stopped = false;
    const stop = () => { if (stopped)
        return; stopped = true; signal?.removeEventListener('abort', stop); try {
        controls?.stop();
    }
    catch { } if (stream) {
        for (const track of stream.getTracks()) {
            if (track.readyState !== 'ended')
                track.stop();
        }
        stream = undefined;
    } try {
        video.pause();
        video.srcObject = null;
    }
    catch { } };
    if (signal?.aborted)
        return stop;
    signal?.addEventListener('abort', stop, { once: true });
    try {
        if (!mediaDevices?.getUserMedia) {
            const e = new Error('Camera unsupported');
            e.name = 'NotSupportedError';
            throw e;
        }
        const acquired = await mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } });
        if (stopped) {
            acquired.getTracks().forEach(t => t.stop());
            return stop;
        }
        stream = acquired;
        const reader = await createReader();
        if (stopped)
            return stop;
        const created = await reader.decodeFromStream(stream, video, result => { if (stopped || !result)
            return; const code = normalizeBarcode(result.getText()); if (!code)
            return; stop(); onCode(code); });
        if (stopped)
            created.stop();
        else
            controls = created;
        return stop;
    }
    catch (error) {
        const wasStopped = stopped;
        stop();
        if (!wasStopped)
            throw error;
        return stop;
    }
}
