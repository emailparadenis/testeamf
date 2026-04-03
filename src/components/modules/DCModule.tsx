import { useFiscalData } from "@/contexts/FiscalDataContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { CustomChartTooltip } from "@/components/CustomTooltip";
import { NotePopover } from "@/components/NotePopover";

function formatBi(val: number) {
  if (Math.abs(val) >= 1e9) return `R$ ${(val / 1e9).toFixed(2)} bi`;
  if (Math.abs(val) >= 1e6) return `R$ ${(val / 1e6).toFixed(1)} mi`;
  return val.toLocaleString("pt-BR");
}

export function DCModule() {
  const { data } = useFiscalData();
  const { dc } = data;

  const dcRow = dc.find((r) => r.item.includes("DÍVIDA CONSOLIDADA - DC"));
  const deducoes = dc.find((r) => r.item.includes("DEDUÇÕES"));
  const dcl = dc.find((r) => r.item.includes("DÍVIDA CONSOLIDADA LÍQUIDA"));

  const years = dcRow ? Object.keys(dcRow.valores).sort() : [];

  const chartData = years.map((year) => ({
    name: year,
    "DC Bruta": (dcRow?.valores[year] || 0) / 1e9,
    "Deduções": (deducoes?.valores[year] || 0) / 1e9,
    "DCL": (dcl?.valores[year] || 0) / 1e9,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dívida Consolidada (DC)</h2>
        <p className="text-sm text-muted-foreground mt-1">Composição e evolução da dívida pública consolidada</p>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold mb-4">Evolução da Dívida (R$ bilhões)</h3>
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${v.toFixed(1)}bi`} />
            <Tooltip content={<CustomChartTooltip formatter={(v) => `R$ ${v.toFixed(2)} bi`} />} />
            <Legend />
            <Bar dataKey="DC Bruta" fill="hsl(var(--chart-indigo))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Deduções" fill="hsl(var(--chart-cyan))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="DCL" fill="hsl(var(--chart-slate))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border/50">
          <h3 className="text-sm font-semibold">Detalhamento da Dívida</h3>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="text-left p-3 font-medium text-muted-foreground min-w-[300px]">Item</th>
                {years.map((y) => (
                  <th key={y} className="text-right p-3 font-medium text-muted-foreground min-w-[140px]">{y}</th>
                ))}
                <th className="text-center p-3 font-medium text-muted-foreground w-10">📝</th>
              </tr>
            </thead>
            <tbody>
              {dc.map((row, i) => {
                const isMain = row.item.includes("DÍVIDA CONSOLIDADA");
                return (
                  <tr key={i} className={`data-table-row ${isMain ? "font-semibold bg-primary/5" : ""}`}>
                    <td className="p-3 text-xs">{row.item}</td>
                    {years.map((y) => (
                      <td key={y} className="p-3 text-right text-xs tabular-nums">{formatBi(row.valores[y] || 0)}</td>
                    ))}
                    <td className="p-3 text-center">
                      <NotePopover noteKey={`dc-${i}`} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
