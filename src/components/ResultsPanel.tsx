import type { UiResult, DevicesResponse } from '../types/api';

interface ResultsPanelProps {
  currentResult: UiResult | null;
  history: UiResult[];
  systemMessage: string;
  motionDetected: boolean;
  sensorDistance: number | null;
  devices: DevicesResponse;
}

export function ResultsPanel({ currentResult, history, systemMessage, motionDetected, sensorDistance, devices }: ResultsPanelProps) {
  return (
    <section className="card">
      <h2>Resultados en tiempo real</h2>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '8px',
            background: devices.bridge ? '#22c55e22' : '#1e2535',
            border: `1px solid ${devices.bridge ? '#22c55e' : '#444'}`,
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: devices.bridge ? '#22c55e' : '#444',
            }}
          />
          <span style={{ color: '#888', fontSize: '0.85rem' }}>Bridge:</span>
          <span style={{ color: devices.bridge ? '#22c55e' : '#666', fontSize: '0.85rem', fontWeight: 600 }}>
            {devices.bridge ? devices.bridge : '—'}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '8px',
            background: devices.cam ? '#22c55e22' : '#1e2535',
            border: `1px solid ${devices.cam ? '#22c55e' : '#444'}`,
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: devices.cam ? '#22c55e' : '#444',
            }}
          />
          <span style={{ color: '#888', fontSize: '0.85rem' }}>CAM:</span>
          <span style={{ color: devices.cam ? '#22c55e' : '#666', fontSize: '0.85rem', fontWeight: 600 }}>
            {devices.cam ? devices.cam : '—'}
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          borderRadius: '20px',
          marginBottom: '10px',
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
          marginBottom: '10px',
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

      <p className="status">{systemMessage}</p>

      {currentResult ? (
        <div className="resultBox">
          <p>
            <strong>Nombre:</strong> {currentResult.name}
          </p>
          <p>
            <strong>Confianza:</strong> {(currentResult.confidence * 100).toFixed(2)}%
          </p>
          <p>
            <strong>Mensaje:</strong> {currentResult.message}
          </p>
        </div>
      ) : (
        <p className="muted">Sin resultados todavía.</p>
      )}

      <h3>Historial</h3>
      <ul className="historyList">
        {history.map((item) => (
          <li key={item.timestamp}>
            {new Date(item.timestamp).toLocaleTimeString()} - {item.name} ({(item.confidence * 100).toFixed(1)}%)
          </li>
        ))}
      </ul>
    </section>
  );
}
