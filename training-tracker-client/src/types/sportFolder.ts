export interface SportFolder {
  id: number;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSportFolderRequest {
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
}

export interface UpdateSportFolderRequest extends CreateSportFolderRequest {
  isArchived: boolean;
}
