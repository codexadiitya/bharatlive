import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listFeedback } from "@/lib/feedback.functions";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Mail, User, Clock } from "lucide-react";

export const Route = createFileRoute("/feedback")({
  component: FeedbackPage,
  head: () => ({
    meta: [{ title: "Feedback — BharatLive" }],
  }),
});

function FeedbackPage() {
  const { signedIn, ready } = useAuth();
  const fetchList = useServerFn(listFeedback);
  const { data: items, isLoading } = useQuery({
    queryKey: ["feedback"],
    queryFn: () => fetchList(),
    enabled: signedIn,
  });

  if (!ready || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
        <div className="max-w-sm text-center">
          <h1 className="font-display text-2xl font-semibold">Sign in required</h1>
          <p className="mt-2 text-sm text-muted-foreground">You must be signed in to view feedback submissions.</p>
          <div className="mt-6">
            <Link
              to="/auth"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
        <h1 className="mt-6 font-display text-3xl font-bold tracking-tight">Feedback Submissions</h1>
        <p className="mt-1 text-sm text-muted-foreground">Messages sent from the contact form.</p>

        <div className="mt-8 space-y-4">
          {!items || items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
              No feedback yet.
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    {item.name || "Anonymous"}
                  </span>
                  {item.email && (
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      {item.email}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(item.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{item.message}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
