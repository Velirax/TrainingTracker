export interface Exercise {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  trackingFields: string[];
  isBuiltIn: boolean;
  sportFolderIds: number[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateExerciseRequest {
  name: string;
  description: string | null;
  category: string | null;
  trackingFields: string[];
  sportFolderIds: number[];
}

export interface UpdateExerciseRequest extends CreateExerciseRequest {}
