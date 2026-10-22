
import { useState, type ChangeEvent, type FormEvent } from 'react';
import * as XLSX from 'xlsx';
import {
  bulkImportManagedTrees,
  createManagedTree,
  type CreateManagedTreeInput,
} from '@/services/tree.service';
import { addNotification } from '@/services/notification.service';

const initialForm: CreateManagedTreeInput = {
  treeName: '',
  wardNumber: '',
  departmentCode: '',
  kgisTreeId: '',
  kgisCode: '',
  latitude: 13.0827,
  longitude: 80.2707,
  notes: '',
};

const inputClass =
  'mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100';

type PreviewRow = {
  row: number;
  data: CreateManagedTreeInput;
  error: string;
};

type Tab = 'excel' | 'manual';

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[\s_-]/g, '');
}

function readCell(
  row: Record<string, unknown>,
  aliases: string[],
): unknown {
  const key = Object.keys(row).find((item) =>
    aliases.includes(normalizeHeader(item)),
  );

  return key === undefined ? undefined : row[key];
}

function cellText(value: unknown): string {
  return value === undefined || value === null ? '' : String(value).trim();
}

function parseExcelRows(rows: Record<string, unknown>[]): PreviewRow[] {
  return rows.map((row, index) => {
    const treeName = cellText(readCell(row, ['treename', 'name', 'species']));
    const wardNumber = cellText(readCell(row, ['wardnumber', 'ward']));
    const latitudeText = cellText(readCell(row, ['latitude', 'lat']));
    const longitudeText = cellText(readCell(row, ['longitude', 'long', 'lng']));
    const latitude = Number(latitudeText);
    const longitude = Number(longitudeText);

    const data: CreateManagedTreeInput = {
      treeName,
      wardNumber,
      latitude,
      longitude,
      departmentCode:
        cellText(readCell(row, ['departmentcode', 'department'])) || undefined,
      kgisTreeId:
        cellText(readCell(row, ['kgistreeid', 'treeid'])) || undefined,
      kgisCode: cellText(readCell(row, ['kgiscode', 'code'])) || undefined,
      notes:
        cellText(readCell(row, ['notes', 'remarks', 'comments'])) || undefined,
    };

    const issues: string[] = [];

    if (!treeName) issues.push('Tree name is missing');
    if (!wardNumber) issues.push('Ward number is missing');

    if (
      !latitudeText ||
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90
    ) {
      issues.push('Invalid latitude');
    }

    if (
      !longitudeText ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      issues.push('Invalid longitude');
    }

    if (treeName.length > 200) issues.push('Tree name is too long');
    if (wardNumber.length > 50) issues.push('Ward number is too long');

    return {
      row: index + 2,
      data,
      error: issues.join('; '),
    };
  });
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const response = err.response;

    if (typeof response === 'object' && response !== null && 'data' in response) {
      const data = response.data;

      if (
        typeof data === 'object' &&
        data !== null &&
        'message' in data &&
        typeof data.message === 'string'
      ) {
        return data.message;
      }
    }
  }

  return err instanceof Error ? err.message : fallback;
}

export function TreeUpload() {
  const [activeTab, setActiveTab] = useState<Tab>('excel');

  const [form, setForm] = useState<CreateManagedTreeInput>(initialForm);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [readingFile, setReadingFile] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [importError, setImportError] = useState('');

  function updateField(
    field: keyof CreateManagedTreeInput,
    value: string | number,
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    setSuccess('');
    setError('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSuccess('');
    setError('');

    try {
      const saved = await createManagedTree({
        ...form,
        treeName: form.treeName.trim(),
        wardNumber: form.wardNumber.trim(),
        departmentCode: form.departmentCode?.trim() || undefined,
        kgisTreeId: form.kgisTreeId?.trim() || undefined,
        kgisCode: form.kgisCode?.trim() || undefined,
        notes: form.notes?.trim() || undefined,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
      });

      setSuccess(`Tree "${saved.treeName}" was saved successfully.`);

      addNotification(
        'Tree Added Successfully',
        `Tree "${saved.treeName}" was registered successfully.`,
        'success',
      );

      setForm({ ...initialForm });
    } catch (err: unknown) {
      const message = getErrorMessage(
        err,
        'Could not save the tree. Check the backend and try again.',
      );

      setError(message);

      addNotification(
        'Tree Registration Failed',
        message,
        'error',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setPreview([]);
    setFileName('');
    setImportMessage('');
    setImportError('');

    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();

    if (!['xlsx', 'xls', 'csv'].includes(extension ?? '')) {
      const message = 'Please select an Excel (.xlsx, .xls) or CSV (.csv) file.';
      setImportError(message);

      addNotification('Invalid File', message, 'warning');

      event.target.value = '';
      return;
    }

    setReadingFile(true);
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

      if (!firstSheet) {
        throw new Error('The selected file does not contain a worksheet.');
      }

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        firstSheet,
        { defval: '' },
      );

      if (rows.length === 0) {
        throw new Error('No records found. Check the column headings.');
      }

      if (rows.length > 500) {
        throw new Error(
          'Maximum 500 rows per import. Split the file into smaller files.',
        );
      }

      const parsedRows = parseExcelRows(rows);
      setPreview(parsedRows);

      const invalidRows = parsedRows.filter((item) => item.error).length;

      if (invalidRows > 0) {
        addNotification(
          'Spreadsheet Validation',
          `${file.name}: ${parsedRows.length} row(s) checked, ${invalidRows} row(s) need correction.`,
          'warning',
        );
      } else {
        addNotification(
          'File Ready for Import',
          `${file.name} was read successfully. ${parsedRows.length} row(s) are ready for review.`,
          'info',
        );
      }
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Could not read this file.');

      setImportError(message);
      setFileName('');

      addNotification('File Reading Failed', message, 'error');
    } finally {
      setReadingFile(false);
      event.target.value = '';
    }
  }

  async function handleBulkImport() {
    const validRows = preview.filter((item) => !item.error);

    if (validRows.length === 0) {
      const message = 'No valid rows to import. Please correct your file.';
      setImportError(message);

      addNotification('Import Not Started', message, 'warning');
      return;
    }

    setImporting(true);
    setImportMessage('');
    setImportError('');

    try {
      const result = await bulkImportManagedTrees(
        validRows.map((item) => item.data),
      );

      const message =
        `${result.meta.imported} tree(s) imported successfully. ` +
        `${result.meta.failed} row(s) failed.`;

      setImportMessage(message);

      addNotification(
        result.meta.failed === 0
          ? 'Tree Import Completed'
          : 'Tree Import Partially Completed',
        message,
        result.meta.failed === 0 ? 'success' : 'warning',
      );

      if (result.meta.failed === 0) {
        setPreview([]);
        setFileName('');
      } else {
        setImportError(
          result.errors
            .map((item) => `Row ${item.row}: ${item.message}`)
            .join('\n'),
        );
      }
    } catch (err: unknown) {
      const message = getErrorMessage(
        err,
        'Import failed. Check the backend and try again.',
      );

      setImportError(message);

      addNotification('Tree Import Failed', message, 'error');
    } finally {
      setImporting(false);
    }
  }

  const validCount = preview.filter((item) => !item.error).length;
  const invalidCount = preview.length - validCount;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
          Urban Green Management
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Add New Tree
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Choose how you want to add tree records.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-2xl border border-emerald-100 bg-white p-2 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab('excel')}
          className={`flex items-center justify-center gap-2 rounded-xl px-3 py-4 text-sm font-semibold transition sm:text-base ${
            activeTab === 'excel'
              ? 'bg-emerald-800 text-white shadow-md'
              : 'text-slate-600 hover:bg-emerald-50'
          }`}
        >
          <span className="text-xl">📊</span>
          Excel / CSV Upload
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('manual')}
          className={`flex items-center justify-center gap-2 rounded-xl px-3 py-4 text-sm font-semibold transition sm:text-base ${
            activeTab === 'manual'
              ? 'bg-emerald-800 text-white shadow-md'
              : 'text-slate-600 hover:bg-emerald-50'
          }`}
        >
          <span className="text-xl">🌳</span>
          Manual Entry
        </button>
      </div>

      {activeTab === 'excel' && (
        <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="rounded-2xl bg-emerald-950 p-6 text-white">
            <h2 className="text-xl font-semibold">Bulk Tree Import</h2>
            <p className="mt-2 text-sm text-emerald-100">
              Upload a spreadsheet to register multiple trees at once.
            </p>
          </div>

          <div className="mt-6 rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 p-6 text-center">
            <div className="text-4xl">📁</div>
            <h3 className="mt-3 font-semibold text-slate-900">
              Upload Excel or CSV
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              .xlsx, .xls, .csv · Maximum 500 rows
            </p>

            <label className="mt-5 inline-flex cursor-pointer items-center justify-center rounded-xl bg-emerald-800 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-900">
              {readingFile ? 'Reading file...' : 'Choose File'}
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                disabled={readingFile || importing}
                onChange={handleFileChange}
              />
            </label>

            {fileName && (
              <p className="mt-3 break-all text-sm font-medium text-emerald-800">
                Selected: {fileName}
              </p>
            )}
          </div>

          <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-800">
              Required Excel column headings
            </p>
            <p className="mt-2">
              <code>treeName</code>, <code>wardNumber</code>,{' '}
              <code>latitude</code>, <code>longitude</code>
            </p>
            <p className="mt-2">
              Optional: <code>departmentCode</code>, <code>kgisTreeId</code>,{' '}
              <code>kgisCode</code>, <code>notes</code>
            </p>
            <p className="mt-2">
              “Tree Name” and “Ward Number” are also accepted.
            </p>
          </div>

          {importError && (
            <div
              role="alert"
              className="mt-4 whitespace-pre-wrap rounded-xl bg-red-50 p-4 text-sm text-red-700"
            >
              {importError}
            </div>
          )}

          {importMessage && (
            <div
              role="status"
              className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"
            >
              {importMessage}
            </div>
          )}

          {preview.length > 0 && (
            <div className="mt-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-semibold text-slate-900">Import Preview</h3>
                <div className="flex gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">
                    {validCount} valid
                  </span>
                  <span className="rounded-full bg-red-100 px-3 py-1 text-red-700">
                    {invalidCount} invalid
                  </span>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[650px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Row</th>
                      <th className="px-4 py-3">Tree Name</th>
                      <th className="px-4 py-3">Ward</th>
                      <th className="px-4 py-3">Latitude</th>
                      <th className="px-4 py-3">Longitude</th>
                      <th className="px-4 py-3">Validation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {preview.map((item) => (
                      <tr key={item.row}>
                        <td className="px-4 py-3">{item.row}</td>
                        <td className="px-4 py-3">{item.data.treeName || '—'}</td>
                        <td className="px-4 py-3">{item.data.wardNumber || '—'}</td>
                        <td className="px-4 py-3">{String(item.data.latitude)}</td>
                        <td className="px-4 py-3">{String(item.data.longitude)}</td>
                        <td className="px-4 py-3">
                          {item.error ? (
                            <span className="text-xs text-red-700">{item.error}</span>
                          ) : (
                            <span className="font-medium text-emerald-700">Ready</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                onClick={handleBulkImport}
                disabled={importing || readingFile || validCount === 0}
                className="mt-5 w-full rounded-xl bg-emerald-800 px-6 py-3 font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {importing
                  ? 'Importing Trees...'
                  : `Import ${validCount} Valid Tree(s)`}
              </button>
            </div>
          )}
        </section>
      )}

      {activeTab === 'manual' && (
        <section className="overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm">
          <div className="bg-emerald-950 p-6 text-white sm:p-8">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-3xl">
                🌱
              </div>
              <div>
                <h2 className="text-xl font-semibold">Manual Tree Registration</h2>
                <p className="mt-1 text-sm text-emerald-100">
                  Enter details for one tree.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-7 p-6 sm:p-8">
            <section>
              <h3 className="font-semibold text-slate-900">Basic Information</h3>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  Tree Name *
                  <input
                    className={inputClass}
                    value={form.treeName}
                    onChange={(e) => updateField('treeName', e.target.value)}
                    placeholder="e.g. Neem"
                    maxLength={200}
                    required
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Ward Number *
                  <input
                    className={inputClass}
                    value={form.wardNumber}
                    onChange={(e) => updateField('wardNumber', e.target.value)}
                    placeholder="e.g. 12"
                    maxLength={50}
                    required
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Department Code
                  <input
                    className={inputClass}
                    value={form.departmentCode ?? ''}
                    onChange={(e) => updateField('departmentCode', e.target.value)}
                    placeholder="Optional"
                    maxLength={100}
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  KGIS Tree ID
                  <input
                    className={inputClass}
                    value={form.kgisTreeId ?? ''}
                    onChange={(e) => updateField('kgisTreeId', e.target.value)}
                    placeholder="Optional"
                    maxLength={100}
                  />
                </label>

                <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                  KGIS Code
                  <input
                    className={inputClass}
                    value={form.kgisCode ?? ''}
                    onChange={(e) => updateField('kgisCode', e.target.value)}
                    placeholder="Optional"
                    maxLength={100}
                  />
                </label>
              </div>
            </section>

            <section className="border-t border-slate-100 pt-6">
              <h3 className="font-semibold text-slate-900">Location Details</h3>
              <p className="mt-1 text-sm text-slate-500">
                Enter the actual tree coordinates. Default values point to Chennai.
              </p>

              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  Latitude *
                  <input
                    className={inputClass}
                    type="number"
                    step="any"
                    min="-90"
                    max="90"
                    value={form.latitude}
                    onChange={(e) => updateField('latitude', e.target.value)}
                    required
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Longitude *
                  <input
                    className={inputClass}
                    type="number"
                    step="any"
                    min="-180"
                    max="180"
                    value={form.longitude}
                    onChange={(e) => updateField('longitude', e.target.value)}
                    required
                  />
                </label>
              </div>
            </section>

            <section className="border-t border-slate-100 pt-6">
              <h3 className="font-semibold text-slate-900">Additional Notes</h3>
              <textarea
                className={inputClass}
                rows={4}
                value={form.notes ?? ''}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder="Add optional observations or comments..."
                maxLength={1000}
              />
            </section>

            {success && (
              <div role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
                {success}
              </div>
            )}

            {error && (
              <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setForm({ ...initialForm });
                  setSuccess('');
                  setError('');
                }}
                className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Reset Form
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-emerald-800 px-7 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Saving Tree...' : 'Save Tree'}
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
