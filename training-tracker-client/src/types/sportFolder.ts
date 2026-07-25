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