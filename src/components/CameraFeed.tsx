import { useEffect, useRef, useState } from 'react';

interface CameraFeedProps {
  onFrameReady: (blob: Blob) => void;
  isStreaming: boolean;
}

const USE_ESP32_CAM = import.meta.env.VITE_USE_ESP32_CAM === 'true';

export function CameraFeed({ onFrameReady, isStreaming }: CameraFeedProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string>('');

  // Cámara local (webcam) — solo cuando no hay ESP32-CAM
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

  // Frames para reconocimiento (solo webcam local)
  useEffect(() => {
    if (!isStreaming || USE_ESP32_CAM) return;

    const interval = setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.videoWidth === 0) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => { if (blob) onFrameReady(blob); },
        'image/jpeg',
        0.85,
      );
    }, 2000);

    return () => clearInterval(interval);
  }, [isStreaming, onFrameReady]);

  if (USE_ESP32_CAM) {
    return (
      <section className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '240px', flexDirection: 'column', gap: '10px' }}>
        <span style={{ fontSize: '2.5rem' }}>📸</span>
        <p style={{ color: '#555' }}>Capturando imágenes en el servidor…</p>
      </section>
    );
  }

  return (
    <section className="card">
      <h2>Video en vivo — Cámara local</h2>
      {error ? <p className="error">{error}</p> : null}
      <video ref={videoRef} className="video" muted playsInline />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </section>
  );
}
