export interface TrainingSession {
  id: number;
  sportFolderId: number;
  sportFolderName: string;
  sportFolderColor: string;
  sportFolderIcon: string | null;
  title: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  sessionType: string;
  status: string;
  rating: number | null;
  notes: string | null;
  recurrenceGroupId: string | null;
  calories: number;
  exercises: TrainingSessionExercise[];
  createdAt: string;
  updatedAt: string;
}

export interface TrainingSessionExercise {
  exerciseId: number;
  exerciseName: string;
  trackingValues: Record<string, string>;
}

export interface CreateTrainingSessionRequest {
  sportFolderId: number;
  title: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  sessionType: string;
  status: string;
  rating: number | null;
  notes: string | null;
  recurrenceGroupId?: string | null;
  exercises?: CreateTrainingSessionExerciseRequest[];
}

export interface CreateTrainingSessionExerciseRequest {
  exerciseId: number;
  trackingValues: Record<string, string>;
}
