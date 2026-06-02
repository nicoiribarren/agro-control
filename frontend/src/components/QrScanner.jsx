import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const REGION_ID = 'html5-qr-region';

/**
 * Extrae el CTG de los tres formatos posibles del QR de CPE AFIP:
 *   1. Sólo dígitos  → "13042026001584"
 *   2. URL con param → "https://ctg.afip.gob.ar/...?ctg=13042026001584"
 *   3. JSON          → {"ctg":"13042026001584", ...}
 * Como fallback, busca el primer bloque de 8-14 dígitos en el texto.
 */
function parseCTG(raw) {
  const text = raw.trim();

  if (/^\d{8,14}$/.test(text)) return text;

  try {
    const url = new URL(text);
    for (const k of ['ctg', 'CTG', 'codigo', 'nroCTG', 'nro_ctg']) {
      const v = url.searchParams.get(k);
      if (v && /^\d{8,14}$/.test(v)) return v;
    }
  } catch {}

  try {
    const obj = JSON.parse(text);
    for (const k of ['ctg', 'CTG', 'codigo', 'nroCTG', 'nro_ctg']) {
      const v = String(obj[k] ?? '');
      if (/^\d{8,14}$/.test(v)) return v;
    }
  } catch {}

  const m = text.match(/\b(\d{8,14})\b/);
  return m ? m[1] : null;
}

export default function QrScanner({ onDetected }) {
  const [open, setOpen] = useState(false);
  // 'idle' | 'starting' | 'scanning' | 'error'
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [frameError, setFrameError] = useState('');
  const scannerRef = useRef(null);

  const stopScanner = useCallback(async () => {
    const s = scannerRef.current;
    if (!s) return;
    try {
      if (s.isScanning) await s.stop();
      s.clear();
    } catch {}
    scannerRef.current = null;
  }, []);

  const handleClose = useCallback(async () => {
    await stopScanner();
    setOpen(false);
    setStatus('idle');
    setErrorMsg('');
    setFrameError('');
  }, [stopScanner]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function startScanner() {
      setStatus('starting');
      setErrorMsg('');
      setFrameError('');

      const scanner = new Html5Qrcode(REGION_ID, { verbose: false });
      scannerRef.current = scanner;

      const config = { fps: 12, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };

      function onSuccess(decoded) {
        if (cancelled) return;
        const ctg = parseCTG(decoded);
        if (!ctg) {
          setFrameError(`QR leído sin CTG reconocible: "${decoded.slice(0, 60)}"`);
          return;
        }
        setFrameError('');
        stopScanner().then(() => {
          if (!cancelled) {
            setOpen(false);
            setStatus('idle');
            onDetected(ctg);
          }
        });
      }

      async function tryStart(constraint) {
        await scanner.start(constraint, config, onSuccess, () => {});
      }

      try {
        try {
          // En móvil usa la cámara trasera; en desktop usa la primera disponible
          await tryStart({ facingMode: 'environment' });
        } catch {
          await tryStart({ facingMode: 'user' });
        }
        if (!cancelled) setStatus('scanning');
      } catch (e) {
        if (cancelled) return;
        const msg = e?.message ?? '';
        if (e?.name === 'NotAllowedError' || /permission|denied/i.test(msg)) {
          setErrorMsg('Permiso de cámara denegado. Verificá los permisos del navegador o ingresá el CTG manualmente.');
        } else if (/NotFound|no.*camera|not found/i.test(msg)) {
          setErrorMsg('No se detectó ninguna cámara. Ingresá el CTG manualmente.');
        } else {
          setErrorMsg('No se pudo iniciar la cámara. Verificá los permisos del navegador.');
        }
        setStatus('error');
      }
    }

    startScanner();
    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [open, stopScanner, onDetected]);

  return (
    <>
      {/* ── Botón disparador ── */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          width: '100%',
          background: 'var(--verde-claro)',
          color: 'var(--verde)',
          border: '2px dashed var(--verde-borde)',
          borderRadius: 'var(--radio)',
          padding: '12px',
          fontWeight: 700,
          fontSize: 15,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
        }}
      >
        <span style={{ fontSize: 20 }}>📷</span>
        Escanear QR de carta de porte
      </button>

      {/* ── Separador ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        color: 'var(--texto-suave)', fontSize: 12, userSelect: 'none',
      }}>
        <div style={{ flex: 1, height: 1, background: 'var(--gris-borde)' }} />
        o ingresá el CTG manualmente
        <div style={{ flex: 1, height: 1, background: 'var(--gris-borde)' }} />
      </div>

      {/* ── Modal ── */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Escáner QR carta de porte"
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,.82)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
          onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <div style={{
            background: '#fff', borderRadius: 14, padding: 24,
            width: '100%', maxWidth: 420,
            boxShadow: '0 20px 60px rgba(0,0,0,.5)',
            display: 'flex', flexDirection: 'column', gap: 16,
          }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Escanear QR — CPE AFIP</div>
                <div style={{ fontSize: 12, color: 'var(--texto-suave)', marginTop: 3 }}>
                  Apuntá la cámara al código QR impreso en la carta de porte o en el celular del chofer
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                style={{ background: '#f0f2f4', color: '#444', borderRadius: 20, padding: '5px 14px', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                ✕ Cancelar
              </button>
            </div>

            {/* Error de cámara */}
            {status === 'error' && (
              <div style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#b91c1c' }}>
                <strong>⚠️ Sin acceso a cámara</strong>
                <p style={{ margin: '6px 0 0', opacity: .85 }}>{errorMsg}</p>
              </div>
            )}

            {/* QR leído pero no reconocido (no cierra el modal) */}
            {frameError && status === 'scanning' && (
              <div style={{ background: '#fffbeb', border: '1px solid #fbbf24', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#92400e' }}>
                ⚠️ {frameError}
              </div>
            )}

            {/* Visor de cámara */}
            {status !== 'error' && (
              <div style={{ position: 'relative', minHeight: status === 'starting' ? 280 : undefined }}>
                {status === 'starting' && (
                  <div style={{
                    position: 'absolute', inset: 0, zIndex: 1,
                    background: '#f0f2f4', borderRadius: 8,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 10, color: 'var(--texto-suave)', fontSize: 14,
                  }}>
                    <span style={{ fontSize: 36 }}>📷</span>
                    Iniciando cámara…
                  </div>
                )}
                <div
                  id={REGION_ID}
                  style={{
                    borderRadius: 8, overflow: 'hidden',
                    background: '#000',
                    minHeight: status === 'starting' ? 280 : undefined,
                  }}
                />
              </div>
            )}

            {/* Instrucción de apuntado */}
            {status === 'scanning' && (
              <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--texto-suave)', lineHeight: 1.5 }}>
                Centrate en el recuadro — el CTG se detecta automáticamente
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
}
