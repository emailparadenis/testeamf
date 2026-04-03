import { useFiscalData } from "@/contexts/FiscalDataContext";

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  formatter?: (value: number) => string;
}

export function CustomChartTooltip({ active, payload, label, formatter }: CustomTooltipProps) {
  const { notes } = useFiscalData();
  if (!active || !payload?.length) return null;

  const fmt = formatter || ((v: number) => v.toLocaleString("pt-BR"));

  return (
    <div className="glass-card-elevated p-3 min-w-[200px] space-y-2">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-xs">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            {entry.name}
          </span>
          <span className="text-xs font-semibold">{fmt(entry.value)}</span>
        </div>
      ))}
      {notes[`chart-${label}`] && (
        <p className="text-xs text-primary/80 border-t border-border/50 pt-1.5 italic">
          📝 {notes[`chart-${label}`]}
        </p>
      )}
    </div>
  );
}
