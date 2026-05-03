import type { UiResult, DevicesResponse } from '../types/api';

interface ResultsPanelProps {
  currentResult: UiResult | null;
  history: UiResult[];
  systemMessage: string;
  motionDetected: boolean;
  sensorDistance: number | null;
  devices: DevicesResponse;
  doorOpen: boolean;
}

export function ResultsPanel({
  currentResult,
  history,
  systemMessage,
  motionDetected,
  sensorDistance,
  devices,
  doorOpen,
}: ResultsPanelProps) {
  const isUnknown =
    currentResult?.name === 'Desconocido' || currentResult?.name === 'Persona desconocida';

  return (
    <section className="card">
      <h2>Resultados en tiempo real</h2>

      {/* Estado de dispositivos */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
        {(['bridge', 'cam'] as const).map((key) => (
          <div
            key={key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              background: devices[key] ? '#22c55e22' : '#1e2535',
              border: `1px solid ${devices[key] ? '#22c55e' : '#444'}`,
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: devices[key] ? '#22c55e' : '#444',
              }}
            />
            <span style={{ color: '#888', fontSize: '0.85rem' }}>
              {key === 'bridge' ? 'Bridge' : 'CAM'}:
            </span>
            <span style={{ color: devices[key] ? '#22c55e' : '#666', fontSize: '0.85rem', fontWeight: 600 }}>
              {devices[key] ?? '—'}
            </span>
          </div>
        ))}
      </div>

      {/* Sensor */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '20px',
            background: motionDetected ? '#ff3b3b22' : '#1e2535',
            border: `1px solid ${motionDetected ? '#ff3b3b' : '#444'}`,
            color: motionDetected ? '#ff6b6b' : '#888',
            fontWeight: 600,
            fontSize: '0.9rem',
            transition: 'all 0.3s ease',
          }}
        >
          <span
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: motionDetected ? '#ff3b3b' : '#444',
              boxShadow: motionDetected ? '0 0 8px #ff3b3b' : 'none',
              transition: 'all 0.3s ease',
            }}
          />
          {motionDetected ? 'Objeto detectado' : 'Sin objeto cerca'}
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'baseline',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '20px',
            background: '#1e2535',
            border: '1px solid #444',
            fontSize: '0.9rem',
          }}
        >
          <span style={{ color: '#888' }}>Distancia:</span>
          <span style={{ color: '#7eb8ff', fontWeight: 700, fontSize: '1.1rem' }}>
            {sensorDistance !== null ? `${sensorDistance.toFixed(1)} cm` : '—'}
          </span>
        </div>
      </div>

      {/* Estado de la puerta */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 20px',
          borderRadius: '12px',
          background: doorOpen ? '#22c55e18' : '#1e2535',
          border: `2px solid ${doorOpen ? '#22c55e' : '#374151'}`,
          marginBottom: '10px',
          transition: 'all 0.4s ease',
        }}
      >
        <span style={{ fontSize: '1.8rem' }}>{doorOpen ? '🔓' : '🔒'}</span>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', color: doorOpen ? '#22c55e' : '#9ca3af' }}>
            {doorOpen ? 'PUERTA ABIERTA' : 'PUERTA CERRADA'}
          </p>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>
            {doorOpen ? 'Persona autorizada — bombillo encendido' : 'Sin acceso — bombillo apagado'}
          </p>
        </div>
      </div>

      <p className="status">{systemMessage}</p>

      {/* Resultado actual */}
      {currentResult ? (
        <div className="resultBox">
          <p>
            <strong>Nombre:</strong>{' '}
            <span style={{ color: isUnknown ? '#ff6b6b' : '#22c55e', fontWeight: 700 }}>
              {currentResult.name}
            </span>
          </p>
          <p>
            <strong>Similitud:</strong> {(currentResult.confidence * 100).toFixed(1)}%
          </p>
          <p style={{ color: '#888', fontSize: '0.85rem' }}>{currentResult.message}</p>
        </div>
      ) : (
        <p className="muted">Sin resultados todavía.</p>
      )}

      {/* Historial */}
      <h3>Historial</h3>
      <ul className="historyList">
        {history.map((item) => (
          <li key={item.timestamp}>
            <span style={{ color: item.name === 'Desconocido' ? '#ff6b6b' : '#22c55e' }}>
              {item.name}
            </span>
            {' '}({(item.confidence * 100).toFixed(1)}%)
            {' — '}
            {new Date(item.timestamp).toLocaleTimeString()}
          </li>
        ))}
      </ul>
    </section>
  );
}
