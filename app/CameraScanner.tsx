'use client';
import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Camera, ScanLine, X, RefreshCw, AlertTriangle } from 'lucide-react';
import { startCameraSession } from '../lib/camera.mjs';
import { cameraErrorMessage } from '../lib/barcodes.mjs';
export default function CameraScanner({ onScan, onClose }: {
    onScan: (code: string) => void;
    onClose: () => void;
}) {
    const videoRef = useRef<HTMLVideoElement>(null), controller = useRef<AbortController | null>(null), mounted = useRef(true), onScanRef = useRef(onScan), onCloseRef = useRef(onClose);
    const [phase, setPhase] = useState<'idle' | 'starting' | 'scanning' | 'error'>('idle'), [error, setError] = useState(''), [paused, setPaused] = useState(false);
    const [videoSession, setVideoSession] = useState(0);
    onScanRef.current = onScan;
    onCloseRef.current = onClose;
    function close() { controller.current?.abort(); onCloseRef.current(); }
    useEffect(() => { mounted.current = true; const key = (e: KeyboardEvent) => { if (e.key === 'Escape') {
        controller.current?.abort();
        onCloseRef.current();
    } }; const pause = () => { if (document.hidden) {
        controller.current?.abort();
        setPhase('idle');
        setPaused(true);
    } }; const pagehide = () => controller.current?.abort(); document.addEventListener('visibilitychange', pause); window.addEventListener('pagehide', pagehide); window.addEventListener('keydown', key); return () => { mounted.current = false; controller.current?.abort(); document.removeEventListener('visibilitychange', pause); window.removeEventListener('pagehide', pagehide); window.removeEventListener('keydown', key); }; }, []);
    async function start() {
        if (!videoRef.current)
            return;
        controller.current?.abort();
        // Each attempt owns a distinct DOM video. A late ZXing finalizer must never
        // detach the stream belonging to a newer attempt after visibility changes.
        flushSync(() => setVideoSession(n => n + 1));
        const video = videoRef.current;
        if (!video)
            return;
        const current = new AbortController();
        controller.current = current;
        setError('');
        setPaused(false);
        setPhase('starting');
        try {
            if (!window.isSecureContext) {
                setError('Kamera için uygulamayı HTTPS adresinden açın.');
                setPhase('error');
                return;
            }
            await startCameraSession({ video, signal: current.signal, onCode: (code: string) => { current.abort(); if (mounted.current)
                    onScanRef.current(code); } });
            if (mounted.current && !current.signal.aborted)
                setPhase('scanning');
        }
        catch (e) {
            if (mounted.current && !current.signal.aborted) {
                setError(cameraErrorMessage(e));
                setPhase('error');
            }
        }
    }
    return <div className="camera-backdrop" onMouseDown={e => { if (e.target === e.currentTarget)
        close(); }}><section className="camera-dialog" role="dialog" aria-modal="true" aria-label="Kamerayla barkod okut"><div className="panel-heading"><h2><ScanLine size={21}/> Kamerayla barkod okut</h2><button type="button" className="icon-btn" aria-label="Kamerayı kapat" onClick={close}><X /></button></div><div className="camera-body"><div className="camera-preview"><video key={videoSession} ref={videoRef} autoPlay muted playsInline aria-label="Barkod kamera görüntüsü"/><div className="scan-guide" aria-hidden="true"><span /><span /><span /><span /></div>{phase !== 'scanning' && <div className="camera-placeholder"><Camera size={38}/><span>{phase === 'starting' ? 'Kamera açılıyor…' : 'Paketin çizgili barkodunu okutun'}</span></div>}</div><p className="camera-status" role="status">{phase === 'scanning' ? 'Barkodu çerçevenin içinde yatay tutun. Okununca pencere kapanır.' : paused ? 'Kamera durduruldu. Devam etmek için yeniden başlatın.' : 'Arka kamera tercih edilir. Net ve aydınlık bir görüntü kullanın.'}</p>{error && <div className="banner error" role="alert"><AlertTriangle size={18}/><span>{error}</span></div>}{phase !== 'scanning' && <button type="button" className="btn primary full" disabled={phase === 'starting'} onClick={start}>{phase === 'error' ? <RefreshCw size={18}/> : <Camera size={18}/>} {phase === 'starting' ? 'Kamera izni bekleniyor…' : phase === 'error' ? 'Yeniden dene' : 'Kamerayı başlat'}</button>}<p className="camera-privacy">Görüntü cihazınızda işlenir; sunucuya gönderilmez. Her açılışta yalnızca bir barkod alınır.</p><button type="button" className="btn ghost full" onClick={close}>Kapat ve elle girişe dön</button></div></section></div>;
}
