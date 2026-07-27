import { apiFetch } from './apiClient';
export interface WorkoutTemplate { id: number; name: string; sportFolderId: number; exercises: { exerciseId: number; trackingValues: Record<string, string> }[]; }
const base = 'http://localhost:5205/api/workout-templates';
export async function getWorkoutTemplates(sportFolderId: number) { const r = await apiFetch(`${base}?sportFolderId=${sportFolderId}`); if (!r.ok) throw new Error(); return r.json() as Promise<WorkoutTemplate[]>; }
export async function createWorkoutTemplate(name: string, sportFolderId: number, exercises: WorkoutTemplate['exercises']) { const r = await apiFetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, sportFolderId, exercises }) }); if (!r.ok) throw new Error(); return r.json() as Promise<WorkoutTemplate>; }
export async function deleteWorkoutTemplate(id: number) { const r = await apiFetch(`${base}/${id}`, { method: 'DELETE' }); if (!r.ok) throw new Error(); }
export async function updateWorkoutTemplate(id: number, name: string, sportFolderId: number, exercises: WorkoutTemplate['exercises']) { const r = await apiFetch(`${base}/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, sportFolderId, exercises }) }); if (!r.ok) throw new Error(); return r.json() as Promise<WorkoutTemplate>; }
