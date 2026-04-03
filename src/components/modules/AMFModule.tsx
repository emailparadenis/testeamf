import { useFiscalData } from "@/contexts/FiscalDataContext";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { CustomChartTooltip } from "@/components/CustomTooltip";
import { NotePopover } from "@/components/NotePopover";

function formatBi(val: number) {
  if (Math.abs(val) >= 1e9) return `R$ ${(val / 1e9).toFixed(2)} bi`;
  if (Math.abs(val) >= 1e6) return `R$ ${(val / 1e6).toFixed(1)} mi`;
  return val.toLocaleString("pt-BR");
}

export function AMFModule() {
  const { data } = useFiscalData();
  const { amf } = data;

  if (!data.loaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] text-muted-foreground">
        <p className="text-sm">Carregue um arquivo Excel para visualizar o AMF.</p>
      </div>
    );
  }

  // Resultado Primário sem RPPS
  const receitaPrimaria = amf.find((r) => r.especificacao.includes("Receita Primária") && !r.especificacao.includes("RPPS"));
  const despesaPrimaria = amf.find((r) => r.especificacao.includes("Despesa Primária") && !r.especificacao.includes("RPPS"));
  const resultadoPrimario = amf.find((r) => r.especificacao.includes("Resultado Primário (SEM RPPS)"));

  // Resultado Nominal Abaixo da Linha
  const resultadoNominal = amf.find((r) => r.especificacao.includes("Resultado Nominal") && r.especificacao.toLowerCase().includes("abaixo"));

  const years = resultadoPrimario
    ? Object.keys(resultadoPrimario.valores).sort()
    : receitaPrimaria
    ? Object.keys(receitaPrimaria.valores).sort()
    : [];

  const chartDataPrimario = years.map((year) => ({
    name: year,
    "Receita Primária": receitaPrimaria?.valores[year] || 0,
    "Despesa Primária": despesaPrimaria?.valores[year] || 0,
    "Resultado Primário": resultadoPrimario?.valores[year] || 0,
  }));

  const chartDataNominal = years.map((year) => ({
    name: year,
    "Resultado Nominal": resultadoNominal?.valores[year] || 0,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Anexo de Metas Fiscais (AMF)</h2>
        <p className="text-sm text-muted-foreground mt-1">Projeções de receita, despesa e resultado primário</p>
      </div>

      {/* Resultado Primário sem RPPS */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold mb-4">Resultado Primário sem RPPS</h3>
        <ResponsiveContainer width="100%" height={360}>
          <AreaChart data={chartDataPrimario}>
            <defs>
              <linearGradient id="gradRecPrim" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-indigo))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--chart-indigo))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradDespPrim" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-negative))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--chart-negative))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradResPrim" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-positive))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--chart-positive))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1e9).toFixed(0)}bi`} />
            <Tooltip content={<CustomChartTooltip formatter={formatBi} />} />
            <Legend />
            <Area type="monotone" dataKey="Receita Primária" stroke="hsl(var(--chart-indigo))" fill="url(#gradRecPrim)" strokeWidth={2.5} />
            <Area type="monotone" dataKey="Despesa Primária" stroke="hsl(var(--chart-negative))" fill="url(#gradDespPrim)" strokeWidth={2.5} />
            <Area type="monotone" dataKey="Resultado Primário" stroke="hsl(var(--chart-positive))" fill="url(#gradResPrim)" strokeWidth={2.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Resultado Nominal Abaixo da Linha */}
      {resultadoNominal && (
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold mb-4">Resultado Nominal Abaixo da Linha</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartDataNominal}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1e9).toFixed(1)}bi`} />
              <Tooltip content={<CustomChartTooltip formatter={formatBi} />} />
              <Legend />
              <Bar dataKey="Resultado Nominal" fill="hsl(var(--chart-cyan))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border/50">
          <h3 className="text-sm font-semibold">Detalhamento AMF</h3>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="text-left p-3 font-medium text-muted-foreground min-w-[280px]">Especificação</th>
                {years.map((y) => (
                  <th key={y} className="text-right p-3 font-medium text-muted-foreground min-w-[130px]">{y}</th>
                ))}
                <th className="text-center p-3 font-medium text-muted-foreground w-10">📝</th>
              </tr>
            </thead>
            <tbody>
              {amf.map((row, i) => {
                const isHighlight = row.especificacao.includes("Resultado Primário") || row.especificacao.includes("Receita Total") || row.especificacao.includes("Despesa Total") || row.especificacao.includes("Resultado Nominal");
                return (
                  <tr key={i} className={`data-table-row ${isHighlight ? "font-semibold bg-primary/5" : ""}`}>
                    <td className="p-3 text-xs">{row.especificacao}</td>
                    {years.map((y) => (
                      <td key={y} className="p-3 text-right text-xs tabular-nums">
                        {formatBi(row.valores[y] || 0)}
                      </td>
                    ))}
                    <td className="p-3 text-center">
                      <NotePopover noteKey={`amf-${i}`} />
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
