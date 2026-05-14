import type {
  AddPersonResponse,
  EnrollResponse,
  RecognitionResponse,
  StatusResponse,
  TrainResponse,
} from '../types/api';

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? 'http://pablo.local:8000/api/v1';

async function postFormData<T>(endpoint: string, formData: FormData): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Error HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function postJson<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Error HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const faceApi = {
  recognize: async (imageFile: Blob): Promise<RecognitionResponse> => {
    const formData = new FormData();
    formData.append('image', imageFile, 'frame.jpg');
    return postFormData<RecognitionResponse>('/recognize', formData);
  },

  addPerson: async (name: string, imageFile: Blob): Promise<AddPersonResponse> => {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('image', imageFile, `${name}.jpg`);
    return postFormData<AddPersonResponse>('/add_person', formData);
  },

  train: async (): Promise<TrainResponse> => {
    return postJson<TrainResponse>('/train');
  },

  enrollCapture: async (name: string, filePath: string): Promise<EnrollResponse> => {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('file_path', filePath);
    return postFormData<EnrollResponse>('/enroll_capture', formData);
  },

  status: async (): Promise<StatusResponse> => {
    const response = await fetch(`${API_BASE_URL}/status`);

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(detail || `Error HTTP ${response.status}`);
    }

    return response.json() as Promise<StatusResponse>;
  },
};
