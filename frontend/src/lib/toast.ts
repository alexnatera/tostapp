import { create } from "zustand";

export interface ToastItem {
  id: number;
  type: "success" | "error";
  message: string;
}

let nextId = 1;

interface ToastState {
  toasts: ToastItem[];
  dismiss: (id: number) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

function push(type: ToastItem["type"], message: string) {
  const id = nextId++;
  useToastStore.setState((s) => ({ toasts: [...s.toasts, { id, type, message }] }));
  setTimeout(() => {
    useToastStore.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  }, 5000);
}

export const toast = {
  success: (message: string) => push("success", message),
  error: (message: string) => push("error", message),
};
