import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ImpersonationState {
  originalToken: string;
  originalName: string;
  targetName: string;
}

interface AuthState {
  token: string | null;
  roasteryName: string | null;
  isAdmin: boolean;
  impersonating: ImpersonationState | null;
  setToken: (token: string, roasteryName: string, isAdmin: boolean) => void;
  startImpersonation: (token: string, targetName: string) => void;
  stopImpersonation: () => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      roasteryName: null,
      isAdmin: false,
      impersonating: null,
      setToken: (token, roasteryName, isAdmin) => {
        set({ token, roasteryName, isAdmin, impersonating: null });
      },
      startImpersonation: (token, targetName) => {
        const { token: originalToken, roasteryName: originalName } = get();
        set({
          token,
          roasteryName: targetName,
          isAdmin: false,
          impersonating: { originalToken: originalToken!, originalName: originalName!, targetName },
        });
      },
      stopImpersonation: () => {
        const { impersonating } = get();
        if (!impersonating) return;
        set({
          token: impersonating.originalToken,
          roasteryName: impersonating.originalName,
          isAdmin: true,
          impersonating: null,
        });
      },
      logout: () => {
        set({ token: null, roasteryName: null, isAdmin: false, impersonating: null });
      },
    }),
    { name: "tostapp-auth" }
  )
);
