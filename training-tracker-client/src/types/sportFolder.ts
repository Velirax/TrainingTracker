export interface SportFolder {
  id: number;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  isArchived: boolean;
  sessionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateSportFolderRequest {
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  isArchived: boolean;
}
