import { useEffect, useRef, useState } from 'react';
import { faceApi, BACKEND_HEADERS } from '../services/api';

const API_BASE_URL = 'https://sternum-untaxed-vigorous.ngrok-free.dev/api/v1';
const CAPTURE_URL = `${API_BASE_URL}/esp/cam/capture`;

interface EnrollModalProps {
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function EnrollModal({ onClose, onSuccess }: EnrollModalProps) {
  const [liveUrl, setLiveUrl] = useState('');
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedUrl, setCapturedUrl] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const prevLiveUrl = useRef('');

  // Preview en vivo: fetch cada 1 s mientras no se haya tomado la foto
  useEffect(() => {
    if (capturedBlob) return;

    let cancelled = false;

    const fetchFrame = async () => {
      try {
        const res = await fetch(CAPTURE_URL, { headers: BACKEND_HEADERS });
        if (!res.ok) return;
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        if (!cancelled) {
          if (prevLiveUrl.current) URL.revokeObjectURL(prevLiveUrl.current);
          prevLiveUrl.current = url;
          setLiveUrl(url);
        } else {
          URL.revokeObjectURL(url);
        }
      } catch { /* cámara no disponible */ }
    };

    fetchFrame();
    const id = setInterval(fetchFrame, 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
      if (prevLiveUrl.current) URL.revokeObjectURL(prevLiveUrl.current);
    };
  }, [capturedBlob]);

  const handleCapture = async () => {
    setError('');
    try {
      const res = await fetch(CAPTURE_URL, { headers: BACKEND_HEADERS });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      setCapturedBlob(blob);
      setCapturedUrl(URL.createObjectURL(blob));
    } catch {
      setError('No se pudo capturar la foto. ¿Está la cámara conectada?');
    }
  };

  const handleRetake = () => {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedBlob(null);
    setCapturedUrl('');
    setError('');
  };

  const handleSave = async () => {
    if (!capturedBlob || !name.trim()) return;
    setSaving(true);
    setError('');
    try {
      const res = await faceApi.addPerson(name.trim(), capturedBlob);
      onSuccess(res.message);
      onClose();
    } catch {
      setError('No se detectó ningún rostro. Intenta con mejor iluminación o más de frente.');
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: '#192236',
          border: '1px solid #2c3b58',
          borderRadius: '14px',
          padding: '24px',
          width: '100%',
          maxWidth: '440px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <h2 style={{ margin: 0 }}>Añadir persona</h2>

        {/* Vista de cámara */}
        <div
          style={{
            background: '#0d1525',
            borderRadius: '10px',
            overflow: 'hidden',
            aspectRatio: '4/3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {(capturedUrl || liveUrl) ? (
            <img
              src={capturedUrl || liveUrl}
              alt="preview"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <span style={{ color: '#555' }}>Conectando cámara…</span>
          )}
        </div>

        {/* Controles */}
        {!capturedBlob ? (
          <button onClick={handleCapture} style={{ fontSize: '1rem' }}>
            📸 Tomar foto
          </button>
        ) : (
          <>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="Nombre de la persona"
              autoFocus
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleRetake}
                style={{ flex: 1, background: '#1e2535', border: '1px solid #444' }}
              >
                🔄 Repetir
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                style={{ flex: 2 }}
              >
                {saving ? 'Guardando…' : '✅ Guardar'}
              </button>
            </div>
          </>
        )}

        {error && (
          <p style={{ margin: 0, color: '#ff6b6b', fontSize: '0.85rem' }}>{error}</p>
        )}

        <button
          onClick={onClose}
          style={{ background: 'transparent', color: '#888', border: '1px solid #444' }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
