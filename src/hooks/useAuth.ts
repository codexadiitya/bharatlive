import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/integrations/supabase/client";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      setSession(null);
      setReady(true);
      return;
    }

    const { data: sub } = client.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    client.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const client = getSupabaseClient();
    await client?.auth.signOut();
  };

  const user: User | null = session?.user ?? null;
  return { session, user, ready, signedIn: !!user, signOut };
}
