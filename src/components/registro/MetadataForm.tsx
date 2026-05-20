import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { calcFechaFin } from '../../lib/dateUtils';
import { Button } from '../ui/button';

export interface MetadataValues {
  numero_semana: string;
  periodo: string;
  fecha_inicio: string;
  fecha_fin: string;
  validado_por: string;
  observaciones: string;
}

interface Props {
  initialValues?: Partial<MetadataValues>;
  onSubmit: (values: MetadataValues) => void;
  submitting?: boolean;
  submitLabel?: string;
}

export function MetadataForm({ initialValues, onSubmit, submitting, submitLabel = 'Continuar →' }: Props) {
  const [values, setValues] = useState<MetadataValues>({
    numero_semana: initialValues?.numero_semana ?? '',
    periodo: initialValues?.periodo ?? '',
    fecha_inicio: initialValues?.fecha_inicio ?? '',
    fecha_fin: initialValues?.fecha_fin ?? '',
    validado_por: initialValues?.validado_por ?? '',
    observaciones: initialValues?.observaciones ?? '',
  });
  const [errors, setErrors] = useState<Partial<MetadataValues>>({});

  useEffect(() => {
    if (values.fecha_inicio) {
      setValues((v) => ({ ...v, fecha_fin: calcFechaFin(v.fecha_inicio) }));
    }
  }, [values.fecha_inicio]);

  function setField(campo: keyof MetadataValues, valor: string) {
    setValues((v) => ({ ...v, [campo]: valor }));
    setErrors((e) => ({ ...e, [campo]: undefined }));
  }

  function validate(): boolean {
    const errs: Partial<MetadataValues> = {};

    if (!values.numero_semana) {
      errs.numero_semana = 'Requerido';
    }
    if (!values.periodo) {
      errs.periodo = 'Requerido';
    }
    if (!values.fecha_inicio) {
      errs.fecha_inicio = 'Requerido';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (validate()) {
      onSubmit(values);
    }
  }

  const inputClass = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Semana #</label>
          <input
            type="number"
            min={1}
            className={inputClass}
            value={values.numero_semana}
            onChange={(e) => setField('numero_semana', e.target.value)}
          />
          {errors.numero_semana && <p className="text-red-500 text-xs mt-1">{errors.numero_semana}</p>}
        </div>
        <div>
          <label className={labelClass}>Período</label>
          <input
            type="number"
            min={2024}
            className={inputClass}
            value={values.periodo}
            onChange={(e) => setField('periodo', e.target.value)}
          />
          {errors.periodo && <p className="text-red-500 text-xs mt-1">{errors.periodo}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Fecha Inicio</label>
          <input
            type="date"
            className={inputClass}
            value={values.fecha_inicio}
            onChange={(e) => setField('fecha_inicio', e.target.value)}
          />
          {errors.fecha_inicio && <p className="text-red-500 text-xs mt-1">{errors.fecha_inicio}</p>}
        </div>
        <div>
          <label className={labelClass}>Fecha Fin (auto)</label>
          <input
            type="date"
            className={`${inputClass} bg-gray-50 cursor-not-allowed`}
            value={values.fecha_fin}
            readOnly
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Revisado y validado por</label>
        <input
          type="text"
          className={inputClass}
          placeholder="Ej: Ing. Erick Marte – Dirección de Movilidad Sostenible"
          value={values.validado_por}
          onChange={(e) => setField('validado_por', e.target.value)}
        />
      </div>

      <div>
        <label className={labelClass}>Observaciones</label>
        <textarea
          className={`${inputClass} h-20 resize-none`}
          value={values.observaciones}
          onChange={(e) => setField('observaciones', e.target.value)}
        />
      </div>

      <Button type="submit" disabled={submitting} className="bg-navy text-white hover:bg-navy-dark">
        {submitting ? 'Guardando...' : submitLabel}
      </Button>
    </form>
  );
}
