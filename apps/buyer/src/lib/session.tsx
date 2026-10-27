import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, ApiError, type User } from "./api";
import { sessionStore } from "./session-store";

type Session =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "signed-in"; token: string; user: User };

type SessionContextValue = {
  session: Session;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>({ status: "loading" });

  useEffect(() => {
    (async () => {
      const stored = await sessionStore.get();
      if (!stored) return setSession({ status: "signed-out" });
      // Show the saved session right away, then confirm the token with the server.
      setSession({ status: "signed-in", ...stored });
      try {
        await api.me(stored.token);
      } catch (error) {
        // Stay signed in while offline; only drop a token the server rejects.
        if (error instanceof ApiError && error.status === 401) {
          await sessionStore.clear();
          setSession({ status: "signed-out" });
        }
      }
    })();
  }, []);

  const signIn = useCallback(async (token: string, user: User) => {
    await sessionStore.set({ token, user });
    setSession({ status: "signed-in", token, user });
  }, []);

  const signOut = useCallback(async () => {
    await sessionStore.clear();
    setSession({ status: "signed-out" });
  }, []);

  const value = useMemo(() => ({ session, signIn, signOut }), [session, signIn, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}
