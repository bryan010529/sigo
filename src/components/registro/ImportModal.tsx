import { useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { AlertCircle, Upload, X } from 'lucide-react';
import { Button } from '../ui/button';
import {
  detectHeaders,
  parseCSV,
  parseExcel,
  applyMapping,
  type RawRow,
} from '../../lib/importParser';
import type { RegistroRow } from '../../hooks/useRegistros';

interface Props {
  fechasSemana: string[];
  onImport: (rows: RegistroRow[]) => void;
  onClose: () => void;
}

type Step = 'upload' | 'preview' | 'confirm';

export function ImportModal({ fechasSemana, onImport, onClose }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<RawRow[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const CAMPOS = [
    'fecha',
    'kms_programados',
    'kms_ejecutados',
    'kms_efectivos',
    'total_pasajeros',
    'servicios_programados',
    'servicios_ejecutados',
    'servicios_puntuales',
    'ica',
    'ick',
    'icd',
    'ip',
    'ie',
  ];

  async function handleFile(file: File) {
    setError(null);
    try {
      let result: { headers: string[]; rows: RawRow[] };
      if (file.name.toLowerCase().endsWith('.csv')) {
        const text = await file.text();
        result = parseCSV(text);
      } else {
        const buffer = await file.arrayBuffer();
        result = parseExcel(buffer);
      }

      setHeaders(result.headers);
      setRawRows(result.rows);
      const detected = detectHeaders(result.headers);
      const initialMap: Record<string, string> = {};
      for (const [col, campo] of Object.entries(detected)) {
        initialMap[col] = campo ?? '';
      }
      setMapping(initialMap);
      setStep('preview');
    } catch {
      setError('Error al leer el archivo. Verifica que sea CSV o Excel válido.');
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleFile(file);
    }
  }

  function handleConfirm() {
    const casted = mapping as unknown as Record<string, keyof RegistroRow | null>;
    const rows = applyMapping(rawRows, casted, fechasSemana);
    onImport(rows);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-navy">Importar Archivo</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {step === 'upload' && (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragging ? 'border-navy bg-navy/5' : 'border-gray-300'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-3">Arrastra un archivo CSV o Excel aquí, o</p>
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                Seleccionar archivo
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    void handleFile(file);
                  }
                }}
              />
              <p className="text-xs text-gray-400 mt-2">Formatos: CSV, .xlsx, .xls</p>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Se encontraron <strong>{rawRows.length}</strong> filas. Verifica el mapeo de columnas:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {headers.map((col) => (
                  <div key={col} className="flex items-center gap-2">
                    <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded flex-1 truncate">{col}</span>
                    <span className="text-gray-400 text-xs">→</span>
                    <select
                      className="text-xs border rounded px-1 py-1 flex-1"
                      value={mapping[col] ?? ''}
                      onChange={(e) => setMapping((m) => ({ ...m, [col]: e.target.value }))}
                    >
                      <option value="">Ignorar</option>
                      {CAMPOS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">Vista previa (5 primeras filas):</p>
                <div className="overflow-x-auto border rounded">
                  <table className="text-xs w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        {headers.map((h) => (
                          <th key={h} className="px-2 py-1 text-left whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rawRows.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="border-t">
                          {headers.map((h) => (
                            <td key={h} className="px-2 py-1 whitespace-nowrap">
                              {row[h]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          {step === 'preview' && (
            <Button
              onClick={() => {
                void handleConfirm();
              }}
              className="bg-navy text-white hover:bg-navy-dark"
            >
              Confirmar Importación
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
