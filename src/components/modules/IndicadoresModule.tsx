import { useFiscalData } from "@/contexts/FiscalDataContext";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { CustomChartTooltip } from "@/components/CustomTooltip";
import { NotePopover } from "@/components/NotePopover";
import { TrendingDown, TrendingUp, Landmark, PiggyBank } from "lucide-react";

function formatCurrency(val: number) {
  if (val >= 1e9) return `R$ ${(val / 1e9).toFixed(2)} bi`;
  if (val >= 1e6) return `R$ ${(val / 1e6).toFixed(1)} mi`;
  return `R$ ${val.toLocaleString("pt-BR")}`;
}

export function IndicadoresModule() {
  const { data } = useFiscalData();
  const { indicadores, dividaConsolidada, resultadoPrimario } = data;

  if (!data.loaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] text-muted-foreground">
        <p className="text-sm">Carregue um arquivo Excel para visualizar os indicadores.</p>
      </div>
    );
  }

  const chartData = indicadores.map((r) => ({
    name: String(r.periodo),
    Endividamento: r.endividamento,
    "Desp. Pessoal": r.despesaPessoal,
    "Desp. Corr/Rec. Corr": r.despCorrentesRecCorrente,
  }));

  const latest = indicadores[indicadores.length - 1];
  const prev = indicadores.length > 1 ? indicadores[indicadores.length - 2] : null;

  const endVar = prev ? ((latest?.endividamento ?? 0) - prev.endividamento) : 0;
  const pesVar = prev ? ((latest?.despesaPessoal ?? 0) - prev.despesaPessoal) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Indicadores Fiscais</h2>
        <p className="text-sm text-muted-foreground mt-1">Evolução histórica dos indicadores de saúde fiscal do Estado</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Dívida Consolidada</span>
            <Landmark className="h-4 w-4 text-primary" />
          </div>
          <p className="text-xl font-bold">{formatCurrency(dividaConsolidada)}</p>
          <p className="text-xs text-muted-foreground mt-1">Projeção 2026</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Resultado Primário</span>
            <PiggyBank className="h-4 w-4 text-chart-positive" />
          </div>
          <p className="text-xl font-bold">{formatCurrency(resultadoPrimario)}</p>
          <p className="text-xs text-chart-positive mt-1">Projeção 2026</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Endividamento</span>
            {endVar > 0 ? <TrendingUp className="h-4 w-4 text-chart-negative" /> : <TrendingDown className="h-4 w-4 text-chart-positive" />}
          </div>
          <p className="text-xl font-bold">{latest?.endividamento.toFixed(2)}%</p>
          <p className={`text-xs mt-1 ${endVar > 0 ? "text-chart-negative" : "text-chart-positive"}`}>
            {endVar > 0 ? "+" : ""}{endVar.toFixed(2)} p.p. vs anterior
          </p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Limite Desp. Pessoal</span>
            {pesVar > 0 ? <TrendingUp className="h-4 w-4 text-chart-negative" /> : <TrendingDown className="h-4 w-4 text-chart-positive" />}
          </div>
          <p className="text-xl font-bold">{latest?.despesaPessoal.toFixed(2)}%</p>
          <p className={`text-xs mt-1 ${pesVar > 0 ? "text-chart-negative" : "text-chart-positive"}`}>
            {pesVar > 0 ? "+" : ""}{pesVar.toFixed(2)} p.p. vs anterior
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold mb-4">Evolução dos Indicadores (%)</h3>
        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${v}%`} />
            <Tooltip content={<CustomChartTooltip formatter={(v) => `${v.toFixed(2)}%`} />} />
            <Legend />
            <Line type="monotone" dataKey="Endividamento" stroke="hsl(var(--chart-indigo))" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="Desp. Pessoal" stroke="hsl(var(--chart-cyan))" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="Desp. Corr/Rec. Corr" stroke="hsl(var(--chart-slate))" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border/50">
          <h3 className="text-sm font-semibold">Tabela de Indicadores</h3>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="text-left p-3 font-medium text-muted-foreground">Período</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Endividamento</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Limite Desp. Pessoal</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Desp. Corr/Rec. Corr</th>
                <th className="text-center p-3 font-medium text-muted-foreground w-10">📝</th>
              </tr>
            </thead>
            <tbody>
              {indicadores.map((row) => (
                <tr key={row.periodo} className="data-table-row">
                  <td className="p-3 font-medium">{row.periodo}</td>
                  <td className="p-3 text-right">{row.endividamento.toFixed(2)}%</td>
                  <td className="p-3 text-right">{row.despesaPessoal.toFixed(2)}%</td>
                  <td className="p-3 text-right">{row.despCorrentesRecCorrente.toFixed(2)}%</td>
                  <td className="p-3 text-center">
                    <NotePopover noteKey={`ind-${row.periodo}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
