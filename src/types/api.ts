export interface RecognitionResponse {
  success: boolean;
  person_name: string | null;
  confidence: number | null;
  message: string;
}

export interface AddPersonResponse {
  success: boolean;
  message: string;
  images_saved: number;
  person_name: string;
}

export interface TrainResponse {
  success: boolean;
  message: string;
  total_people: number;
  total_samples: number;
}

export interface StatusResponse {
  status: string;
  model_trained: boolean;
  total_people: number;
  total_samples: number;
}

export interface UiResult {
  name: string;
  confidence: number;
  message: string;
  timestamp: number;
}

export interface DevicesResponse {
  bridge: string | null;
  cam: string | null;
}
