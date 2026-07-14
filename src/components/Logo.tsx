import { Sparkles } from "lucide-react";

type LogoProps = {
  className?: string;
};

export default function Logo({ className = "" }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg className="h-8 w-8 sm:h-9 sm:w-9 text-saffron shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="2.2" fill="currentColor" />
        <path d="M12 2v20M2 12h20" />
        <path d="M12 12l7.07-7.07M12 12l-7.07 7.07" />
        <path d="M12 12l7.07 7.07M12 12l-7.07-7.07" />
        <path d="M12 12l9.66-2.59M12 12l-9.66 2.59" />
        <path d="M12 12l2.59-9.66M12 12l-2.59 9.66" />
        <path d="M12 12l9.66 2.59M12 12l-9.66-2.59" />
        <path d="M12 12l2.59 9.66M12 12l-2.59-9.66" />
      </svg>
      <div className="flex flex-col text-left">
        <span className="font-sans text-lg sm:text-xl font-bold tracking-tight leading-none text-foreground">
          Bharat<span className="text-saffron">Live</span>
        </span>
        <span className="mt-0.5 font-sans text-[7px] sm:text-[8px] font-extrabold tracking-[0.22em] text-muted-foreground/80 leading-none">
          INDIA · REAL TIME
        </span>
      </div>
    </div>
  );
}
