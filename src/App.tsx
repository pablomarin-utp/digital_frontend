import { useCallback, useEffect, useRef, useState } from 'react';
import { CameraFeed } from './components/CameraFeed';
import { ControlsPanel } from './components/ControlsPanel';
import { EnrollModal } from './components/EnrollModal';
import { ResultsPanel } from './components/ResultsPanel';
import { UploadImage } from './components/UploadImage';
import { faceApi, BACKEND_HEADERS } from './services/api';
import { authApi } from './services/auth';
import type { UiResult, DevicesResponse } from './types/api';

const API_BASE_URL = 'https://sternum-untaxed-vigorous.ngrok-free.dev/api/v1';
const USE_ESP32_CAM = import.meta.env.VITE_USE_ESP32_CAM === 'true';

function App() {
  // Auth state
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loggedInUserId, setLoggedInUserId] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('user_id');
    if (saved) setLoggedInUserId(saved);
  }, []);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [personName, setPersonName] = useState('');
  const [lastFrame, setLastFrame] = useState<Blob | null>(null);
  const [currentResult, setCurrentResult] = useState<UiResult | null>(null);
  const [history, setHistory] = useState<UiResult[]>([]);
  const [systemMessage, setSystemMessage] = useState('Esperando detección del sensor...');
  const [ledState, setLedState] = useState(false);
  const [fanState, setFanState] = useState(false);
  const [motionDetected, setMotionDetected] = useState(false);
  const [sensorDistance, setSensorDistance] = useState<number | null>(null);
  const [devices, setDevices] = useState<DevicesResponse>({ bridge: null, cam: null });
  const [showEnrollModal, setShowEnrollModal] = useState(false);

  const prevMotionRef = useRef(false);
  // Timestamp ISO de la última captura ya procesada en el frontend
  const lastSeenTimestampRef = useRef<string>('');

  const pushResult = useCallback((result: UiResult) => {
    setCurrentResult(result);
    setHistory((prev) => [result, ...prev].slice(0, 20));
  }, []);

  const handleRegister = useCallback(async () => {
    try {
      const res = await authApi.register(usernameInput, passwordInput);
      setAuthMessage(res.message || 'Registrado');
    } catch (e: any) {
      setAuthMessage(String(e?.message ?? e));
    }
  }, [usernameInput, passwordInput]);

  const handleLogin = useCallback(async () => {
    try {
      const res = await authApi.login(usernameInput, passwordInput);
      if (res.success) {
        setLoggedInUserId(res.user_id);
        localStorage.setItem('user_id', res.user_id ?? '');
        setAuthMessage('Conectado');
      } else {
        setAuthMessage(res.message || 'Credenciales inválidas');
      }
    } catch (e: any) {
      setAuthMessage(String(e?.message ?? e));
    }
  }, [usernameInput, passwordInput]);

  const handleLogout = useCallback(() => {
    setLoggedInUserId(null);
    localStorage.removeItem('user_id');
    setAuthMessage('');
  }, []);

  // ── Polling principal: sensor, dispositivos y reconocimientos del servidor ──
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const requests = [
          fetch(`${API_BASE_URL}/esp/motion`, { headers: BACKEND_HEADERS }).catch(() => null),
          fetch(`${API_BASE_URL}/esp/devices`, { headers: BACKEND_HEADERS }).catch(() => null),
          USE_ESP32_CAM
            ? fetch(`${API_BASE_URL}/esp/recognitions`, { headers: BACKEND_HEADERS }).catch(() => null)
            : Promise.resolve(null),
        ];

        const [motionRes, devicesRes, recognitionsRes] = await Promise.all(requests);

        // Sensor de movimiento
        if (motionRes && motionRes.ok) {
          const data = await motionRes.json();
          const detected: boolean = data.motion === true;
          const dist: number | null =
            typeof data.distance === 'number' && data.distance >= 0 ? data.distance : null;
          setMotionDetected(detected);
          setSensorDistance(dist);
          if (detected && !prevMotionRef.current) {
            setSystemMessage('Objeto detectado — analizando en 2 s...');
            setIsStreaming(true);
          } else if (!detected && prevMotionRef.current) {
            setSystemMessage('Sin objeto cerca.');
            setIsStreaming(false);
          }
          prevMotionRef.current = detected;
        }

        // Dispositivos registrados
        if (devicesRes && devicesRes.ok) {
          const text = await devicesRes.text();
          if (!text.startsWith('<')) {
            setDevices(JSON.parse(text) as DevicesResponse);
          }
        }

        // Reconocimientos del servidor (solo modo ESP32-CAM)
        if (recognitionsRes && recognitionsRes.ok) {
          const events: Array<{
            name: string;
            confidence: number;
            message: string;
            timestamp: string;
            file: string;
          }> = await recognitionsRes.json();

          // Filtrar sólo los eventos más recientes que el último visto
          const newEvents = events.filter(
            (e) => e.timestamp > lastSeenTimestampRef.current,
          );

          if (newEvents.length > 0) {
            // El más reciente es el primero (el servidor los inserta al frente)
            lastSeenTimestampRef.current = newEvents[0].timestamp;

            for (const e of newEvents) {
              const result: UiResult = {
                name: e.name,
                confidence: e.confidence,
                message: e.message,
                timestamp: new Date(e.timestamp).getTime(),
                door: e.door,
              };
              pushResult(result);
            }

            const latest = newEvents[0];
            setSystemMessage(
              latest.name !== 'Desconocido'
                ? `✅ Reconocido: ${latest.name} (${(latest.confidence * 100).toFixed(0)}%)`
                : `❓ Persona desconocida (sim=${(latest.confidence * 100).toFixed(0)}%)`,
            );
          }
        }
      } catch {
        // Silencioso si el backend no está disponible
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [pushResult]);

  // ── Reconocimiento manual desde webcam o imagen subida ───────────────────
  const handleFrameReady = useCallback(
    async (frame: Blob) => {
      setLastFrame(frame);
      // En modo ESP32-CAM el reconocimiento es server-side; no duplicar llamadas
      if (!isStreaming || USE_ESP32_CAM) return;

      try {
        const response = await faceApi.recognize(frame);
        pushResult({
          name: response.person_name ?? 'Desconocido',
          confidence: response.confidence ?? 0,
          message: response.message,
          timestamp: Date.now(),
        });
        setSystemMessage('Reconocimiento en tiempo real activo.');
      } catch {
        setSystemMessage('Error al reconocer. Verifica el backend.');
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
      pushResult({
        name: response.person_name ?? 'Desconocido',
        confidence: response.confidence ?? 0,
        message: response.message,
        timestamp: Date.now(),
      });
      setSystemMessage('Reconocimiento completado.');
    } catch {
      setSystemMessage('No se pudo reconocer el rostro.');
    } finally {
      setIsLoading(false);
    }
  }, [lastFrame, pushResult]);

  const handleAddPerson = useCallback(async () => {
    if (!lastFrame) {
      setSystemMessage('Necesitas una imagen para añadir persona.');
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
        `${response.message} — ${response.total_people} personas, ${response.total_samples} fotos`,
      );
    } catch {
      setSystemMessage('Error al reentrenar.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleImageSelected = useCallback((file: File) => {
    setLastFrame(file);
    setSystemMessage(`Imagen cargada: ${file.name}`);
  }, []);

  const toggleStreaming = useCallback(() => setIsStreaming((prev) => !prev), []);

  const handleToggleLed = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/esp/led`, {
        method: 'POST',
        headers: BACKEND_HEADERS,
      });
      const data = await res.json();
      setLedState(data.led);
      setSystemMessage(data.led ? 'Bombillo encendido' : 'Bombillo apagado');
    } catch {
      setSystemMessage('Error al controlar bombillo');
    }
  }, []);

  const handleToggleFan = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/esp/fan`, {
        method: 'POST',
        headers: BACKEND_HEADERS,
      });
      const data = await res.json();
      setFanState(data.fan);
      setSystemMessage(data.fan ? 'Ventilador encendido' : 'Ventilador apagado');
    } catch {
      setSystemMessage('Error al controlar ventilador');
    }
  }, []);

  const handleRefreshDevices = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/esp/devices`, { headers: BACKEND_HEADERS });
      const text = await res.text();
      if (text.startsWith('<')) {
        setSystemMessage('Error de proxy — verifica ngrok');
      } else {
        const data: DevicesResponse = JSON.parse(text);
        setDevices(data);
        setSystemMessage(`Bridge: ${data.bridge || '—'} · CAM: ${data.cam || '—'}`);
      }
    } catch {
      setSystemMessage('Error al refrescar dispositivos');
    }
  }, []);

  return (
    <main className="appLayout">
      <header>
        <h1>Face Recognition</h1>
      </header>

      <div style={{ marginBottom: 12 }}>
        {!loggedInUserId ? (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input placeholder="usuario" value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} />
            <input placeholder="contraseña" type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} />
            <button onClick={handleRegister}>Registrar</button>
            <button onClick={handleLogin}>Ingresar</button>
            <span style={{ color: '#9db0d1' }}>{authMessage}</span>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ color: '#9db0d1' }}>Usuario: {loggedInUserId}</span>
            <button onClick={handleLogout}>Cerrar sesión</button>
          </div>
        )}
      </div>

      <div className="grid">
        {motionDetected ? (
          <CameraFeed onFrameReady={handleFrameReady} isStreaming={isStreaming} />
        ) : (
          <section
            className="card"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '240px',
              color: '#555',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
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
          onToggleFan={handleToggleFan}
          fanState={fanState}
          onRefreshDevices={handleRefreshDevices}
          onOpenEnrollModal={() => setShowEnrollModal(true)}
        />

        <ResultsPanel
          currentResult={currentResult}
          history={history}
          systemMessage={systemMessage}
          motionDetected={motionDetected}
          sensorDistance={sensorDistance}
          devices={devices}
          doorOpen={currentResult?.door === true}
        />
      </div>

      {showEnrollModal && (
        <EnrollModal
          onClose={() => setShowEnrollModal(false)}
          onSuccess={(message) => {
            setSystemMessage(`✅ ${message}`);
            setShowEnrollModal(false);
          }}
        />
      )}
    </main>
  );
}

export default App;
