import { create } from 'zustand';
import type { Usuario } from '../types';

interface AuthState {
  usuario: Usuario | null;
  loading: boolean;
  setUsuario: (usuario: Usuario | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  usuario: null,
  loading: true,
  setUsuario: (usuario) => set({ usuario }),
  setLoading: (loading) => set({ loading }),
  reset: () => set({ usuario: null, loading: false }),
}));
