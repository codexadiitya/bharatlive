import { useLang } from "@/hooks/useLang";
import { Languages } from "lucide-react";

export default function LangToggle() {
  const { lang, toggle } = useLang();
  return (
    <button
      onClick={toggle}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium transition hover:border-saffron/50"
      aria-label="Toggle language"
      title={lang === "en" ? "Switch to Hindi" : "अंग्रेज़ी में बदलें"}
    >
      <Languages className="h-3.5 w-3.5 text-saffron" />
      <span className={lang === "en" ? "text-foreground" : "text-muted-foreground"}>EN</span>
      <span className="text-muted-foreground">/</span>
      <span className={lang === "hi" ? "text-foreground" : "text-muted-foreground"}>हिं</span>
    </button>
  );
}
