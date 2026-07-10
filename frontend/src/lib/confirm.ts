import { create } from "zustand";

interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  resolve?: (value: boolean) => void;
}

export const useConfirmStore = create<ConfirmState>(() => ({
  open: false,
  title: "",
  message: "",
}));

/** Promise-based replacement for window.confirm(), styled to match the app and themeable. */
export function confirmDestructive(message: string, title = "¿Confirmar?"): Promise<boolean> {
  return new Promise((resolve) => {
    useConfirmStore.setState({ open: true, title, message, resolve });
  });
}

export function resolveConfirm(result: boolean) {
  const { resolve } = useConfirmStore.getState();
  useConfirmStore.setState({ open: false, resolve: undefined });
  resolve?.(result);
}
