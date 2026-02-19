import type { UiResult } from '../types/api';

interface ResultsPanelProps {
  currentResult: UiResult | null;
  history: UiResult[];
  systemMessage: string;
}

export function ResultsPanel({ currentResult, history, systemMessage }: ResultsPanelProps) {
  return (
    <section className="card">
      <h2>Resultados en tiempo real</h2>

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
