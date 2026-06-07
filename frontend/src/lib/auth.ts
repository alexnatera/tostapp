import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  token: string | null;
  roasteryName: string | null;
  setToken: (token: string, roasteryName: string) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      roasteryName: null,
      setToken: (token, roasteryName) => {
        set({ token, roasteryName });
      },
      logout: () => {
        set({ token: null, roasteryName: null });
      },
    }),
    { name: "tostapp-auth" }
  )
);
