import { type ChangeEvent, useRef, useState } from 'react';
import {
  commitSamsungHealthImport,
  previewSamsungHealthImport,
  type SamsungHealthImportRow,
} from '../services/importService';
import type { SportFolder } from '../types/sportFolder';

interface SamsungHealthImportDialogProps {
  sportFolders: SportFolder[];
  onClose: () => void;
  onImported: (count: number) => void;
}

interface ReviewRow extends SamsungHealthImportRow {
  sportFolderId: number | null;
}

function SamsungHealthImportDialog({ sportFolders, onClose, onImported }: SamsungHealthImportDialogProps) {
  const [rows, setRows] = useState<ReviewRow[] | null>(null);
  const [bulkSportFolderId, setBulkSportFolderId] = useState('');
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChosen(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');
    setIsBusy(true);
    try {
      const previewRows = await previewSamsungHealthImport(file);
      setRows(previewRows.map((row) => ({ ...row, sportFolderId: row.suggestedSportFolderId })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that file.');
    } finally {
      setIsBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function updateRowSport(rowIndex: number, sportFolderId: number | null) {
    setRows((current) =>
      current?.map((row) => (row.rowIndex === rowIndex ? { ...row, sportFolderId } : row)) ?? null);
  }

  function applyBulkSport() {
    if (!bulkSportFolderId) return;
    const id = Number(bulkSportFolderId);
    setRows((current) => current?.map((row) => ({ ...row, sportFolderId: id })) ?? null);
  }

  const readyRows = rows?.filter((row) => row.sportFolderId !== null) ?? [];
  const allAssigned = rows !== null && rows.length > 0 && readyRows.length === rows.length;

  async function handleImport() {
    if (!rows || !allAssigned) return;

    setIsBusy(true);
    setError('');
    try {
      const result = await commitSamsungHealthImport(rows.map((row) => ({
        sessionDate: row.sessionDate,
        startTime: row.startTime,
        endTime: row.endTime,
        calories: row.calories,
        sportFolderId: row.sportFolderId!,
      })));
      onImported(result.imported);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not import these sessions.');
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <section aria-labelledby="samsung-import-title" aria-modal="true" className="session-dialog import-dialog" role="dialog">
        <div className="session-dialog-header">
          <h2 id="samsung-import-title">Import from Samsung Health</h2>
          <button aria-label="Close import dialog" type="button" onClick={onClose}>Close</button>
        </div>

        {!rows && (
          <div className="import-dialog-intro">
            <p>
              In the Samsung Health app: Settings &rarr; Download personal data, then request an export.
              Unzip it and upload the <b>exercise</b> CSV here (column names vary by app version — this
              reads several common formats).
            </p>
            <input ref={fileInputRef} accept=".csv" disabled={isBusy} type="file" onChange={handleFileChosen} />
            {isBusy && <p role="status">Reading file...</p>}
          </div>
        )}

        {rows && rows.length > 0 && (
          <>
            <div className="import-bulk-row">
              <label>
                Set all sports to
                <select value={bulkSportFolderId} onChange={(event) => setBulkSportFolderId(event.target.value)}>
                  <option value="">Choose a sport...</option>
                  {sportFolders.map((folder) => (
                    <option key={folder.id} value={folder.id}>{folder.name}</option>
                  ))}
                </select>
              </label>
              <button className="secondary-button" disabled={!bulkSportFolderId} type="button" onClick={applyBulkSport}>Apply to all</button>
            </div>

            <div className="import-table-wrap">
              <table className="import-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Duration</th>
                    <th>Calories</th>
                    <th>Sport</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.rowIndex}>
                      <td>{row.sessionDate}</td>
                      <td>{row.startTime.slice(0, 5)}–{row.endTime.slice(0, 5)}</td>
                      <td>{row.durationMinutes} min</td>
                      <td>{row.calories ? `${row.calories} kcal` : 'estimate'}</td>
                      <td>
                        <select
                          value={row.sportFolderId ?? ''}
                          onChange={(event) => updateRowSport(row.rowIndex, event.target.value ? Number(event.target.value) : null)}
                        >
                          <option value="">Choose...</option>
                          {sportFolders.map((folder) => (
                            <option key={folder.id} value={folder.id}>{folder.name}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="import-summary">
              {readyRows.length} of {rows.length} sessions have a sport assigned.
              {rows.some((row) => row.rawSportLabel) && ' Rows without a suggested match need one picked manually.'}
            </p>

            <div className="import-dialog-actions">
              <button className="secondary-button" type="button" onClick={onClose}>Cancel</button>
              <button disabled={!allAssigned || isBusy} type="button" onClick={handleImport}>
                {isBusy ? 'Importing...' : `Import ${rows.length} sessions`}
              </button>
            </div>
          </>
        )}

        {error && <p className="import-error" role="alert">{error}</p>}
      </section>
    </div>
  );
}

export default SamsungHealthImportDialog;
