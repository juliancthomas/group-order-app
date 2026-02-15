import { createClient } from "@supabase/supabase-js";
import type { RealtimeChannel } from "@supabase/supabase-js";

import type { Database } from "@/types/db";

let browserClient: ReturnType<typeof createClient<Database>> | null = null;

function getSupabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return { supabaseUrl, supabaseAnonKey };
}

export function createSupabaseBrowserClient() {
  if (browserClient) {
    return browserClient;
  }

  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();

  browserClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  return browserClient;
}

type GroupRealtimeSubscriptionInput = {
  groupId: string;
  accessToken?: string;
  onCartChange: () => void;
  onGroupChange?: () => void;
  onStatusChange?: (status: string) => void;
};

export function subscribeToGroupRealtime({
  groupId,
  accessToken,
  onCartChange,
  onGroupChange,
  onStatusChange
}: GroupRealtimeSubscriptionInput): RealtimeChannel {
  const supabase = createSupabaseBrowserClient();

  // Set auth token if provided for RLS-aware Realtime
  if (accessToken) {
    supabase.realtime.setAuth(accessToken);
  }

  const channel = supabase
    .channel(`group-sync:${groupId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "cart_items",
        filter: `group_id=eq.${groupId}`
      },
      () => {
        onCartChange();
      }
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "groups",
        filter: `id=eq.${groupId}`
      },
      () => {
        onGroupChange?.();
      }
    )
    .subscribe((status) => {
      onStatusChange?.(status);
    });

  return channel;
}

export function unsubscribeFromRealtime(channel: RealtimeChannel): void {
  const supabase = createSupabaseBrowserClient();
  void supabase.removeChannel(channel);
}
