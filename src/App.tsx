import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE_URL } from './services/api';
import type { UiResult, DevicesResponse } from './types/api';

const USE_ESP32_CAM = import.meta.env.VITE_USE_ESP32_CAM === 'true';
const CAPTURES_URL = `${API_BASE_URL}/esp/captures`;

function initials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function timeAgo(ts: number): string {
  const diff = Math.max(0, Date.now() - ts);
  const s = Math.floor(diff / 1000);
  if (s < 5) return 'ahora';
  if (s < 60) return `hace ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  return `hace ${h}h`;
}

function App() {
  const [currentResult, setCurrentResult] = useState<UiResult | null>(null);
  const [history, setHistory] = useState<UiResult[]>([]);
  const [systemMessage, setSystemMessage] = useState(
    'Esperando detección del sensor de movimiento...',
  );
  const [motionDetected, setMotionDetected] = useState(false);
  const [sensorDistance, setSensorDistance] = useState<number | null>(null);
  const [devices, setDevices] = useState<DevicesResponse>({ bridge: null, cam: null });
  const [, setTick] = useState(0); // refresca el "hace Xs"

  const prevMotionRef = useRef(false);
  const lastSeenTimestampRef = useRef<string>('');

  const pushResult = useCallback((result: UiResult) => {
    setCurrentResult(result);
    setHistory((prev) => [result, ...prev].slice(0, 12));
  }, []);

  // Refresca el "hace Xs" cada segundo
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Polling: sensor + dispositivos + reconocimientos
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [motionRes, devicesRes, recognitionsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/esp/motion`).catch(() => null),
          fetch(`${API_BASE_URL}/esp/devices`).catch(() => null),
          USE_ESP32_CAM
            ? fetch(`${API_BASE_URL}/esp/recognitions`).catch(() => null)
            : Promise.resolve(null),
        ]);

        if (motionRes && motionRes.ok) {
          const data = await motionRes.json();
          const detected: boolean = data.motion === true;
          const dist: number | null =
            typeof data.distance === 'number' && data.distance >= 0 ? data.distance : null;
          setMotionDetected(detected);
          setSensorDistance(dist);
          if (detected && !prevMotionRef.current) {
            setSystemMessage('Movimiento detectado — analizando rostro...');
          } else if (!detected && prevMotionRef.current) {
            setSystemMessage('Zona despejada. Esperando movimiento...');
          }
          prevMotionRef.current = detected;
        }

        if (devicesRes && devicesRes.ok) {
          const text = await devicesRes.text();
          if (!text.startsWith('<')) {
            setDevices(JSON.parse(text) as DevicesResponse);
          }
        }

        if (recognitionsRes && recognitionsRes.ok) {
          const events: Array<{
            name: string;
            confidence: number;
            message: string;
            timestamp: string;
            file?: string;
            door?: boolean;
          }> = await recognitionsRes.json();

          const newEvents = events.filter(
            (e) => e.timestamp > lastSeenTimestampRef.current,
          );

          if (newEvents.length > 0) {
            lastSeenTimestampRef.current = newEvents[0].timestamp;
            for (const e of newEvents) {
              pushResult({
                name: e.name,
                confidence: e.confidence,
                message: e.message,
                timestamp: new Date(e.timestamp).getTime(),
                door: e.door,
                file: e.file ?? null,
              });
            }
            const latest = newEvents[0];
            setSystemMessage(
              latest.name !== 'Desconocido'
                ? `Reconocido: ${latest.name} · ${(latest.confidence * 100).toFixed(0)}% similitud`
                : `Persona no registrada · ${(latest.confidence * 100).toFixed(0)}% similitud`,
            );
          }
        }
      } catch {
        // silencioso
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [pushResult]);

  const isUnknown = useMemo(
    () =>
      currentResult?.name === 'Desconocido' ||
      currentResult?.name === 'Persona desconocida',
    [currentResult],
  );

  const doorOpen = currentResult?.door === true;

  const heroClass = !currentResult
    ? 'resultHero empty'
    : isUnknown
      ? 'resultHero unknown'
      : 'resultHero known';

  return (
    <main className="appLayout">
      {/* ── Top bar ────────────────────────────────────────── */}
      <div className="topBar">
        <div className="brand">
          <div className="brand-logo">🛡️</div>
          <div>
            <h1>Sistema de Control de Acceso</h1>
            <p>Reconocimiento facial · sensor de movimiento</p>
          </div>
        </div>

        <div className="deviceBar">
          <div className={`devicePill ${devices.bridge ? 'online' : ''}`}>
            <span className="dot" />
            <span>Bridge ESP32</span>
            <span className="muted">·</span>
            <span>{devices.bridge ?? 'sin conexión'}</span>
          </div>
          <div className={`devicePill ${devices.cam ? 'online' : ''}`}>
            <span className="dot" />
            <span>ESP32-CAM</span>
            <span className="muted">·</span>
            <span>{devices.cam ?? 'sin conexión'}</span>
          </div>
        </div>
      </div>

      {/* ── Grid principal ─────────────────────────────────── */}
      <div className="mainGrid">
        {/* Panel izquierdo: foto del último reconocimiento + sensor */}
        <section className="glass">
          <h2>Última captura del reconocimiento</h2>

          <div className="stage">
            {/* HUD esquinas */}
            <div className="hud-corner tl" />
            <div className="hud-corner tr" />
            <div className="hud-corner bl" />
            <div className="hud-corner br" />

            {currentResult && currentResult.file ? (
              <>
                <img
                  src={`${CAPTURES_URL}/${currentResult.file}`}
                  alt={`Captura de ${currentResult.name}`}
                />
                {motionDetected && <div className="scanLine" />}
              </>
            ) : (
              <div className="stage-placeholder">
                <div className="icon">{motionDetected ? '🔍' : '📷'}</div>
                <p>
                  {motionDetected
                    ? 'Analizando rostro...'
                    : 'Esperando movimiento para capturar...'}
                </p>
              </div>
            )}

            {/* HUD overlay */}
            <div className="hud">
              <div className="hud-top">
                <span
                  className={`hud-chip ${
                    currentResult?.file ? 'live' : 'idle'
                  }`}
                >
                  {currentResult?.file ? (
                    <>
                      <span className="dot" /> ÚLTIMA CAPTURA
                    </>
                  ) : (
                    '○ SIN CAPTURA'
                  )}
                </span>
                <span
                  className={`hud-chip ${motionDetected ? 'motion' : 'idle'}`}
                >
                  {motionDetected ? '● MOVIMIENTO' : '○ EN REPOSO'}
                </span>
              </div>
              <div className="hud-bottom">
                <span className="hud-chip">
                  {sensorDistance !== null
                    ? `📏 ${sensorDistance.toFixed(1)} cm`
                    : '📏 — cm'}
                </span>
                <span className="hud-chip">
                  {currentResult
                    ? new Date(currentResult.timestamp).toLocaleTimeString()
                    : new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>

          {/* Barra de sensor */}
          <div className="sensorBar">
            <div>
              <p className="label">Sensor ultrasónico</p>
              <p className="value">
                {sensorDistance !== null ? sensorDistance.toFixed(1) : '—'}
                <small>cm</small>
              </p>
            </div>
            <div className={`motionBadge ${motionDetected ? 'on' : 'off'}`}>
              <span className="dot" />
              {motionDetected ? 'Movimiento detectado' : 'Sin movimiento'}
            </div>
          </div>
        </section>

        {/* Panel derecho: resultado + historial */}
        <section className="glass">
          <h2>Resultado del reconocimiento</h2>

          <div className="systemMessage">{systemMessage}</div>

          <div className={heroClass}>
            <div className="topRow">
              <span className="status">
                {!currentResult
                  ? 'En espera'
                  : isUnknown
                    ? 'Acceso denegado'
                    : 'Acceso autorizado'}
              </span>
              {currentResult && (
                <span className="timeAgo">{timeAgo(currentResult.timestamp)}</span>
              )}
            </div>

            <div className="name">
              {currentResult ? currentResult.name : 'Sin detecciones aún'}
            </div>

            <div className="confidenceBar">
              <div className="row">
                <span>Similitud</span>
                <strong>
                  {currentResult
                    ? `${(currentResult.confidence * 100).toFixed(1)}%`
                    : '—'}
                </strong>
              </div>
              <div className="track">
                <div
                  className="fill"
                  style={{
                    width: currentResult
                      ? `${Math.min(100, currentResult.confidence * 100)}%`
                      : '0%',
                  }}
                />
              </div>
            </div>

            <div className={`doorState ${doorOpen ? 'open' : ''}`}>
              <div className="icon">{doorOpen ? '🔓' : '🔒'}</div>
              <div>
                <p className="label">Estado de la puerta</p>
                <p className="text">
                  {doorOpen ? 'PUERTA ABIERTA' : 'PUERTA CERRADA'}
                </p>
              </div>
            </div>
          </div>

          {/* Historial */}
          <div className="history">
            <h3>Historial reciente</h3>
            {history.length === 0 ? (
              <p className="empty-history">
                Aún no hay reconocimientos registrados
              </p>
            ) : (
              <ul className="timeline">
                {history.map((item) => {
                  const unknown =
                    item.name === 'Desconocido' ||
                    item.name === 'Persona desconocida';
                  return (
                    <li key={item.timestamp}>
                      <div
                        className={`avatar ${unknown ? 'unknown' : 'known'}`}
                      >
                        {initials(item.name)}
                      </div>
                      <div>
                        <div className="name">{item.name}</div>
                        <div className="meta">
                          {new Date(item.timestamp).toLocaleTimeString()} ·{' '}
                          {timeAgo(item.timestamp)}
                        </div>
                      </div>
                      <div className="conf">
                        {(item.confidence * 100).toFixed(0)}%
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default App;
