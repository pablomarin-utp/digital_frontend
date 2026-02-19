import { useCallback, useState } from 'react';
import { CameraFeed } from './components/CameraFeed';
import { ControlsPanel } from './components/ControlsPanel';
import { ResultsPanel } from './components/ResultsPanel';
import { UploadImage } from './components/UploadImage';
import { faceApi } from './services/api';
import type { UiResult } from './types/api';

function App() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [personName, setPersonName] = useState('');
  const [lastFrame, setLastFrame] = useState<Blob | null>(null);
  const [currentResult, setCurrentResult] = useState<UiResult | null>(null);
  const [history, setHistory] = useState<UiResult[]>([]);
  const [systemMessage, setSystemMessage] = useState('Conecta cámara o sube una imagen para comenzar.');

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

  return (
    <main className="appLayout">
      <header>
        <h1>Face Recognition Web</h1>
      </header>

      <div className="grid">
        <CameraFeed onFrameReady={handleFrameReady} isStreaming={isStreaming} />
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
        />
        <ResultsPanel currentResult={currentResult} history={history} systemMessage={systemMessage} />
      </div>
    </main>
  );
}

export default App;
