import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "./supabase";

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
        supabase.auth.signOut();
        set({ token: null, roasteryName: null, isAdmin: false, impersonating: null });
      },
    }),
    { name: "tostapp-auth" }
  )
);

async function syncFromSession(session: { access_token: string; user: { id: string } } | null) {
  if (useAuth.getState().impersonating) return;
  if (!session) {
    useAuth.setState({ token: null, roasteryName: null, isAdmin: false });
    return;
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("roastery_name, is_admin")
    .eq("id", session.user.id)
    .single();
  useAuth.getState().setToken(session.access_token, profile?.roastery_name ?? "", profile?.is_admin ?? false);
}

supabase.auth.onAuthStateChange((_event, session) => {
  syncFromSession(session);
});
supabase.auth.getSession().then(({ data }) => syncFromSession(data.session));
