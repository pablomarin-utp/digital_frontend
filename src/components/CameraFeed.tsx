import { useEffect, useRef, useState } from 'react';

interface CameraFeedProps {
  onFrameReady: (blob: Blob) => void;
  isStreaming: boolean;
}

export function CameraFeed({ onFrameReady, isStreaming }: CameraFeedProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
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

  useEffect(() => {
    if (!isStreaming) {
      return;
    }

    const interval = setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) {
        return;
      }

      const context = canvas.getContext('2d');
      if (!context) {
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            onFrameReady(blob);
          }
        },
        'image/jpeg',
        0.9,
      );
    }, 1200);

    return () => clearInterval(interval);
  }, [isStreaming, onFrameReady]);

  return (
    <section className="card">
      <h2>Video en vivo</h2>
      {error ? <p className="error">{error}</p> : null}
      <video ref={videoRef} className="video" muted playsInline />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </section>
  );
}
