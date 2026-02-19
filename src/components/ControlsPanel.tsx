interface ControlsPanelProps {
  personName: string;
  setPersonName: (value: string) => void;
  onRecognize: () => void;
  onAddPerson: () => void;
  onTrain: () => void;
  isLoading: boolean;
  isStreaming: boolean;
  toggleStreaming: () => void;
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
        <button onClick={toggleStreaming} disabled={isLoading}>
          {isStreaming ? 'Detener tiempo real' : 'Iniciar tiempo real'}
        </button>
        <button onClick={onRecognize} disabled={isLoading}>
          Reconocer rostro
        </button>
        <button onClick={onAddPerson} disabled={isLoading || !personName.trim()}>
          Añadir nueva persona
        </button>
        <button onClick={onTrain} disabled={isLoading}>
          Reentrenar clasificador
        </button>
      </div>
    </section>
  );
}
