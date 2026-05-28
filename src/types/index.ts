export type Rol = 'admin' | 'digitador' | 'supervisor' | 'analista';
export type EstadoSemana = 'borrador' | 'en_revision' | 'validado' | 'publicado';
export type FuenteDato = 'manual' | 'importado';

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Corredor {
  id: string;
  codigo: string;
  nombre: string;
  activo: boolean;
  orden: number;
  notas?: string;
  created_at: string;
}

export interface Semana {
  id: string;
  numero_semana: number;
  periodo: number;
  fecha_inicio: string;
  fecha_fin: string;
  estado: EstadoSemana;
  observaciones?: string;
  comentario_rechazo?: string;
  creado_por: string;
  validado_por?: string;
  validado_en?: string;
  created_at: string;
  updated_at: string;
}

export interface RegistroDiario {
  id: string;
  semana_id: string;
  corredor_id: string;
  fecha: string;
  kms_programados?: number;
  kms_ejecutados?: number;
  kms_efectivos?: number;
  total_pasajeros?: number;
  servicios_programados?: number;
  servicios_ejecutados?: number;
  servicios_puntuales?: number;
  ica?: number;
  ick?: number;
  icd?: number;
  ic?: number;
  ip?: number;
  ie?: number;
  ics?: number;
  tiene_datos: boolean;
  fuente: FuenteDato;
  creado_por: string;
  updated_at: string;
}

export interface TotalesCorredor {
  kms_programados: number;
  kms_ejecutados: number;
  kms_efectivos: number;
  total_pasajeros: number;
  servicios_programados: number;
  servicios_ejecutados: number;
  servicios_puntuales: number;
  ica_prom: number;
  ick_prom: number;
  icd_prom: number;
  ic_prom: number;
  ip_prom: number;
  ie_prom: number;
  ics_prom: number;
}

export interface SemanaConTotales extends Semana {
  corredor: Corredor;
  totales: TotalesCorredor;
}

export interface CanastaCosto {
  id: string;
  corredor_id: string;
  año: number;
  costo_por_km: number;
  combustible_pct: number;
  conductores_pct: number;
  patio_pct: number;
  administracion_pct: number;
  mantenimiento_pct: number;
  otros_pct: number;
  created_at: string;
  updated_at: string;
}

export interface CanastaCostoConCorredor extends CanastaCosto {
  corredor: { codigo: string; nombre: string };
}
