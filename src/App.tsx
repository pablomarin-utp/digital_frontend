import { useCallback, useEffect, useRef, useState } from 'react';
import { CameraFeed } from './components/CameraFeed';
import { ControlsPanel } from './components/ControlsPanel';
import { ResultsPanel } from './components/ResultsPanel';
import { UploadImage } from './components/UploadImage';
import { faceApi, BACKEND_HEADERS } from './services/api';
import type { UiResult, DevicesResponse } from './types/api';

const API_BASE_URL = 'https://sternum-untaxed-vigorous.ngrok-free.dev/api/v1';

function App() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [personName, setPersonName] = useState('');
  const [lastFrame, setLastFrame] = useState<Blob | null>(null);
  const [currentResult, setCurrentResult] = useState<UiResult | null>(null);
  const [history, setHistory] = useState<UiResult[]>([]);
  const [systemMessage, setSystemMessage] = useState('Conecta cámara o sube una imagen para comenzar.');
  const [ledState, setLedState] = useState(false);
  const [motionDetected, setMotionDetected] = useState(false);
  const [sensorDistance, setSensorDistance] = useState<number | null>(null);
  const [devices, setDevices] = useState<DevicesResponse>({ bridge: null, cam: null });
  const prevMotionRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [motionRes, devicesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/esp/motion`, { headers: BACKEND_HEADERS }).catch(() => null),
          fetch(`${API_BASE_URL}/esp/devices`, { headers: BACKEND_HEADERS }).catch(() => null),
        ]);

        if (motionRes && motionRes.ok) {
          const data = await motionRes.json();
          const detected: boolean = data.motion === true;
          const dist: number | null = typeof data.distance === 'number' && data.distance >= 0 ? data.distance : null;
          setMotionDetected(detected);
          setSensorDistance(dist);
          if (detected && !prevMotionRef.current) {
            setSystemMessage('Objeto detectado — cámara activada.');
            setIsStreaming(true);
          } else if (!detected && prevMotionRef.current) {
            setSystemMessage('Sin objeto — cámara desactivada.');
            setIsStreaming(false);
          }
          prevMotionRef.current = detected;
        }

        if (devicesRes && devicesRes.ok) {
          const text = await devicesRes.text();
          if (!text.startsWith('<')) {
            const data: DevicesResponse = JSON.parse(text);
            setDevices(data);
          }
        }
      } catch {
        // Silencioso si el backend no está disponible
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const pushResult = useCallback((result: UiResult) => {
    setCurrentResult(result);
    setHistory((prev) => [result, ...prev].slice(0, 20));
  }, []);

  const handleFrameReady = useCallback(
    async (frame: Blob) => {
      setLastFrame(frame);

      if (!isStreaming) {
        return;
      }

      try {
        const response = await faceApi.recognize(frame);
        const result: UiResult = {
          name: response.person_name ?? 'Desconocido',
          confidence: response.confidence ?? 0,
          message: response.message,
          timestamp: Date.now(),
        };
        pushResult(result);
        setSystemMessage('Reconocimiento en tiempo real activo.');
      } catch {
        setSystemMessage('Error al reconocer en tiempo real. Verifica el backend FastAPI.');
      }
    },
    [isStreaming, pushResult],
  );

  const handleRecognize = useCallback(async () => {
    if (!lastFrame) {
      setSystemMessage('No hay imagen disponible para reconocer.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await faceApi.recognize(lastFrame);
      const result: UiResult = {
        name: response.person_name ?? 'Desconocido',
        confidence: response.confidence ?? 0,
        message: response.message,
        timestamp: Date.now(),
      };
      pushResult(result);
      setSystemMessage('Reconocimiento completado.');
    } catch {
      setSystemMessage('No se pudo reconocer el rostro.');
    } finally {
      setIsLoading(false);
    }
  }, [lastFrame, pushResult]);

  const handleAddPerson = useCallback(async () => {
    if (!lastFrame) {
      setSystemMessage('Necesitas una imagen o frame actual para añadir persona.');
      return;
    }

    if (!personName.trim()) {
      setSystemMessage('Ingresa un nombre válido.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await faceApi.addPerson(personName.trim(), lastFrame);
      setSystemMessage(response.message);
    } catch {
      setSystemMessage('No se pudo añadir la persona.');
    } finally {
      setIsLoading(false);
    }
  }, [lastFrame, personName]);

  const handleTrain = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await faceApi.train();
      setSystemMessage(
        `${response.message} (personas: ${response.total_people}, muestras: ${response.total_samples})`,
      );
    } catch {
      setSystemMessage('Error al reentrenar clasificador.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleImageSelected = useCallback((file: File) => {
    setLastFrame(file);
    setSystemMessage(`Imagen cargada: ${file.name}`);
  }, []);

  const toggleStreaming = useCallback(() => {
    setIsStreaming((prev) => !prev);
  }, []);

  const handleToggleLed = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/esp/led`, {
        method: 'POST',
        headers: BACKEND_HEADERS,
      });
      const data = await response.json();
      setLedState(data.led);
      setSystemMessage(data.led ? 'LED encendido' : 'LED apagado');
    } catch {
      setSystemMessage('Error al controlar LED');
    }
  }, []);

  const handleRefreshDevices = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/esp/devices`, { headers: BACKEND_HEADERS });
      const text = await response.text();
      console.log('Response text:', text);
      if (text.startsWith('<')) {
        setSystemMessage('Proxy error - revisa el servidor Vite');
      } else {
        const data = JSON.parse(text);
        setDevices(data);
        setSystemMessage(`Bridge: ${data.bridge || '—'}, CAM: ${data.cam || '—'}`);
      }
    } catch (e) {
      console.error('Error fetching devices:', e);
      setSystemMessage('Error al refrescar dispositivos');
    }
  }, []);

  return (
    <main className="appLayout">
      <header>
        <h1>Face Recognition Web</h1>
      </header>

      <div className="grid">
        {motionDetected ? (
          <CameraFeed onFrameReady={handleFrameReady} isStreaming={isStreaming} />
        ) : (
          <section className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '240px', color: '#555', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontSize: '2.5rem' }}>📷</span>
            <p style={{ margin: 0 }}>Esperando detección del sensor...</p>
          </section>
        )}
        <UploadImage onImageSelected={handleImageSelected} />
        <ControlsPanel
          personName={personName}
          setPersonName={setPersonName}
          onRecognize={handleRecognize}
          onAddPerson={handleAddPerson}
          onTrain={handleTrain}
          isLoading={isLoading}
          isStreaming={isStreaming}
          toggleStreaming={toggleStreaming}
          onToggleLed={handleToggleLed}
          ledState={ledState}
          onRefreshDevices={handleRefreshDevices}
        />
        <ResultsPanel
          currentResult={currentResult}
          history={history}
          systemMessage={systemMessage}
          motionDetected={motionDetected}
          sensorDistance={sensorDistance}
          devices={devices}
        />
      </div>
    </main>
  );
}

export default App;