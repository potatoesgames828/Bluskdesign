"use client";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import type { Plan, Profile } from "@/lib/types";
import { setFormatPrefs } from "@/lib/utils";

interface AppCtx { profile: Profile; plan: Plan }
const Ctx = createContext<AppCtx | null>(null);

export function AppProvider({ profile, plan, children }: AppCtx & { children: ReactNode }) {
  setFormatPrefs(profile.preferences ?? {});
  useEffect(() => {
    document.documentElement.dataset.theme = profile.preferences?.theme ?? "dark";
  }, [profile.preferences?.theme]);
  return <Ctx.Provider value={{ profile, plan }}>{children}</Ctx.Provider>;
}

export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp fora do AppProvider");
  return c;
}
