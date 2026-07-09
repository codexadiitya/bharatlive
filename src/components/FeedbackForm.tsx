import { useState } from "react";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { submitFeedback } from "@/lib/feedback.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";

const schema = z.object({
  name: z.string().max(100).optional(),
  email: z.string().email("Invalid email").max(255).optional().or(z.literal("")),
  message: z.string().min(1, "Message is required").max(2000),
});

export default function FeedbackForm({ labels }: { labels: { title: string; subtitle: string; name: string; email: string; message: string; send: string; sending: string; success: string; error: string } }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const submit = useServerFn(submitFeedback);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const parsed = schema.safeParse({ name, email, message });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const key = issue.path[0] as string;
        fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setLoading(true);
    try {
      await submit({ data: parsed.data });
      toast.success(labels.success);
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      toast.error(labels.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h3 className="font-display text-xl font-semibold tracking-tight">{labels.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{labels.subtitle}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{labels.name}</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            disabled={loading}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{labels.email}</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={loading}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">{labels.message}</label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us what needs to change or improve..."
          rows={4}
          disabled={loading}
        />
        {errors.message && <p className="text-xs text-destructive">{errors.message}</p>}
      </div>
      <Button type="submit" disabled={loading} className="bg-saffron hover:bg-saffron/90 text-primary-foreground">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {loading ? labels.sending : labels.send}
      </Button>
    </form>
  );
}
