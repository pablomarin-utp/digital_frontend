interface ControlsPanelProps {
  personName: string;
  setPersonName: (value: string) => void;
  onRecognize: () => void;
  onAddPerson: () => void;
  onTrain: () => void;
  isLoading: boolean;
  isStreaming: boolean;
  toggleStreaming: () => void;
  onToggleLed: () => void;
  ledState: boolean;
  onToggleFan: () => void;
  fanState: boolean;
  onRefreshDevices?: () => void;
  onOpenEnrollModal?: () => void;
}

export function ControlsPanel({
  personName,
  setPersonName,
  onRecognize,
  onAddPerson,
  onTrain,
  isLoading,
  isStreaming,
  toggleStreaming,
  onToggleLed,
  ledState,
  onToggleFan,
  fanState,
  onRefreshDevices,
  onOpenEnrollModal,
}: ControlsPanelProps) {
  return (
    <section className="card">
      <h2>Controles</h2>

      <label className="field">
        Nombre de persona
        <input
          type="text"
          value={personName}
          onChange={(event) => setPersonName(event.target.value)}
          placeholder="Ej: Juan"
        />
      </label>

      <div className="actions">
        {onRefreshDevices && (
          <button onClick={onRefreshDevices}>
            🔄 Refrescar ESPs
          </button>
        )}
        <button onClick={onToggleLed} disabled={isLoading}>
          {ledState ? '💡 Apagar bombillo' : '💡 Encender bombillo'}
        </button>
        <button onClick={onToggleFan} disabled={isLoading}>
          {fanState ? '🌀 Apagar ventilador' : '🌀 Encender ventilador'}
        </button>
        <button onClick={toggleStreaming} disabled={isLoading}>
          {isStreaming ? 'Detener tiempo real' : 'Iniciar tiempo real'}
        </button>
        <button onClick={onRecognize} disabled={isLoading}>
          Reconocer rostro
        </button>
        {onOpenEnrollModal ? (
          <button onClick={onOpenEnrollModal} disabled={isLoading}>
            📷 Añadir persona
          </button>
        ) : (
          <button onClick={onAddPerson} disabled={isLoading || !personName.trim()}>
            Añadir nueva persona
          </button>
        )}
        <button onClick={onTrain} disabled={isLoading}>
          Reentrenar clasificador
        </button>
      </div>
    </section>
  );
}
