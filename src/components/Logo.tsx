import { Sparkles } from "lucide-react";

type LogoProps = {
  className?: string;
};

export default function Logo({ className = "h-8 w-auto" }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-saffron via-primary to-india-green">
        <Sparkles className="h-4 w-4 text-background" />
      </div>
      <span className="font-display text-xl font-bold tracking-tight text-foreground">
        BharatLive
      </span>
    </div>
  );
}
