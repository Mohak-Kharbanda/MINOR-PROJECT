import { initials } from "@/lib/format";
import { cn } from "@/lib/cn";

const GRADIENTS = [
  "from-violet-500 to-indigo-500",
  "from-sky-500 to-cyan-400",
  "from-emerald-500 to-lime-400",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
  "from-fuchsia-500 to-purple-500",
  "from-teal-500 to-emerald-400",
  "from-blue-600 to-sky-400",
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const SIZES = { xs: "h-6 w-6 text-[10px]", sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-14 w-14 text-lg" };

export function Avatar({ name, size = "sm", className, title }: { name: string; size?: keyof typeof SIZES; className?: string; title?: string }) {
  return (
    <span
      title={title ?? name}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white ring-2 ring-surface",
        GRADIENTS[hash(name) % GRADIENTS.length],
        SIZES[size],
        className
      )}
    >
      {initials(name)}
    </span>
  );
}

export function AvatarStack({ names, max = 4, size = "xs" }: { names: string[]; max?: number; size?: keyof typeof SIZES }) {
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  return (
    <div className="flex -space-x-2">
      {shown.map((n, i) => (
        <Avatar key={`${n}-${i}`} name={n} size={size} />
      ))}
      {extra > 0 && (
        <span className={cn("inline-flex items-center justify-center rounded-full bg-surface-3 font-semibold text-ink-muted ring-2 ring-surface", SIZES[size])}>
          +{extra}
        </span>
      )}
    </div>
  );
}
