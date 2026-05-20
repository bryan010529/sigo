import { create } from 'zustand';
import type { Semana, RegistroDiario } from '../types';

interface RegistroState {
  semanaActual: Semana | null;
  registros: RegistroDiario[];
  corredorActivoId: string | null;
  dirty: boolean;
  setSemana: (semana: Semana | null) => void;
  setRegistros: (registros: RegistroDiario[]) => void;
  setCorredorActivo: (id: string | null) => void;
  setDirty: (dirty: boolean) => void;
  reset: () => void;
}

export const useRegistroStore = create<RegistroState>((set) => ({
  semanaActual: null,
  registros: [],
  corredorActivoId: null,
  dirty: false,
  setSemana: (semanaActual) => set({ semanaActual }),
  setRegistros: (registros) => set({ registros }),
  setCorredorActivo: (corredorActivoId) => set({ corredorActivoId }),
  setDirty: (dirty) => set({ dirty }),
  reset: () => set({ semanaActual: null, registros: [], corredorActivoId: null, dirty: false }),
}));
