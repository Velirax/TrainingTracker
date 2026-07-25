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
  createdAt: string;
  updatedAt: string;
}