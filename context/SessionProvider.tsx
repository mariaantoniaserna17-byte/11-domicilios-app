import { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useEffect } from 'react';

export type Session = {
  id: string;
  name: string;
  address: string;
  email?: string;
  token?: string;
};

type SessionContextValue = {
  session: Session | null;
  signIn: (session: Session) => void;
  signOut: () => void;
};

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    void SecureStore.getItemAsync('domicilios_session')
      .then((storedSession) => {
        if (storedSession) {
          setSession(JSON.parse(storedSession) as Session);
        }
      })
      .catch(() => setSession(null));
  }, []);

  const signIn = (nextSession: Session) => {
    setSession(nextSession);
    void SecureStore.setItemAsync(
      'domicilios_session',
      JSON.stringify(nextSession),
    );
  };

  const signOut = () => {
    setSession(null);
    void SecureStore.deleteItemAsync('domicilios_session');
  };

  const value = useMemo(
    () => ({
      session,
      signIn,
      signOut,
    }),
    [session],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error('useSession debe usarse dentro de SessionProvider');
  }

  return context;
}
