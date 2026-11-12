import { requireSession } from "@/lib/session";
import { AppProvider } from "@/components/app/AppContext";
import { AppShell } from "@/components/app/Shell";
import { FeedbackProvider } from "@/components/ui/Feedback";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile, plan, user } = await requireSession();
  await supabase.rpc("refresh_deadline_alerts");
  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null);
  return (
    <AppProvider profile={profile} plan={plan}>
      <FeedbackProvider>
        <AppShell unread={count ?? 0}>{children}</AppShell>
      </FeedbackProvider>
    </AppProvider>
  );
}
