import { useEffect, useRef, useState } from 'react';

interface CameraFeedProps {
  onFrameReady: (blob: Blob) => void;
  isStreaming: boolean;
}

const API_BASE_URL = 'https://sternum-untaxed-vigorous.ngrok-free.dev/api/v1';
const USE_ESP32_CAM = import.meta.env.VITE_USE_ESP32_CAM === 'true';
const STREAM_URL = `${API_BASE_URL}/esp/cam/stream`;
const RECOGNITION_INTERVAL_MS = 2000;

export function CameraFeed({ onFrameReady, isStreaming }: CameraFeedProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string>('');

  // Cámara local (webcam) — sin cambios
  useEffect(() => {
    if (USE_ESP32_CAM) return;

    const startCamera = async () => {
      try {
        setError('');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        setError('No se pudo acceder a la cámara. Verifica permisos del navegador.');
      }
    };

    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  // Extracción de frames para reconocimiento facial
  // ESP32-CAM: dibuja desde el <img> MJPEG al canvas (sin requests adicionales)
  // Webcam: dibuja desde el <video> al canvas
  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (USE_ESP32_CAM) {
        const img = imgRef.current;
        if (!img || img.naturalWidth === 0) return;
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);
      } else {
        const video = videoRef.current;
        if (!video || video.videoWidth === 0) return;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }

      canvas.toBlob(
        (blob) => { if (blob) onFrameReady(blob); },
        'image/jpeg',
        0.85,
      );
    }, RECOGNITION_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isStreaming, onFrameReady]);

  return (
    <section className="card">
      <h2>Video en vivo {USE_ESP32_CAM ? '- ESP32-CAM' : '- Cámara local'}</h2>
      {error ? <p className="error">{error}</p> : null}
      {USE_ESP32_CAM ? (
        <img
          ref={imgRef}
          src={STREAM_URL}
          crossOrigin="anonymous"
          alt="ESP32-CAM Stream"
          className="video"
          style={{ width: '100%', maxWidth: '640px', aspectRatio: '4/3' }}
          onLoad={() => setError('')}
          onError={() => setError('No se pudo conectar con la ESP32-CAM.')}
        />
      ) : (
        <video ref={videoRef} className="video" muted playsInline />
      )}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </section>
  );
}
