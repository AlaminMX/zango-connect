import * as React from "react";
import { Sparkles, Layers, Zap, Crown, Flame } from "lucide-react";
import { quickTemplates } from "@/lib/product-card/templates";
import type { QuickTemplateId } from "@/lib/product-card/types";
import { cn } from "@/lib/utils";

interface QuickTemplatesBarProps {
  activeTemplateId: QuickTemplateId | null;
  onSelectTemplate: (templateId: QuickTemplateId) => void;
  className?: string;
}

const templateIcons: Record<QuickTemplateId, React.ReactNode> = {
  "modern-minimalist": <Sparkles className="h-3.5 w-3.5 text-amber-500" />,
  "rustic-bazaar": <Layers className="h-3.5 w-3.5 text-emerald-600" />,
  "high-impact-sale": <Flame className="h-3.5 w-3.5 text-red-500" />,
  "kano-royal": <Crown className="h-3.5 w-3.5 text-indigo-500" />,
  "flash-deal": <Zap className="h-3.5 w-3.5 text-amber-500" />,
};

export function QuickTemplatesBar({
  activeTemplateId,
  onSelectTemplate,
  className,
}: QuickTemplatesBarProps) {
  const templatesList = Object.values(quickTemplates);

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Zap className="h-3.5 w-3.5 text-primary" />
          <span>Quick Style Presets</span>
        </div>
        <span className="text-[11px] text-muted-foreground">1-click theme & badges</span>
      </div>

      {/* Horizontal Scrollable Presets Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar">
        {templatesList.map((tpl) => {
          const isActive = activeTemplateId === tpl.id;
          return (
            <button
              key={tpl.id}
              type="button"
              onClick={() => onSelectTemplate(tpl.id)}
              title={`${tpl.name} — ${tpl.subtitle}`}
              className={cn(
                "group relative flex items-center gap-2 px-3 py-2 rounded-xl text-left border transition-all shrink-0 whitespace-nowrap",
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background border-border/70 hover:border-primary/40 hover:bg-muted/40 text-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-lg transition-transform group-hover:scale-110 shrink-0",
                  isActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground",
                )}
              >
                {templateIcons[tpl.id]}
              </span>

              <div className="flex flex-col text-left">
                <span className="text-xs font-bold leading-tight">{tpl.name}</span>
                <span
                  className={cn(
                    "text-[10px] leading-tight truncate max-w-[130px]",
                    isActive ? "text-primary-foreground/80" : "text-muted-foreground",
                  )}
                >
                  {tpl.subtitle}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
