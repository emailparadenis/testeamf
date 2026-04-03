import { useFiscalData } from "@/contexts/FiscalDataContext";
import { Brain, AlertTriangle, TrendingUp, TrendingDown, Info } from "lucide-react";

function formatBi(val: number) {
  if (Math.abs(val) >= 1e9) return `R$ ${(val / 1e9).toFixed(2)} bi`;
  if (Math.abs(val) >= 1e6) return `R$ ${(val / 1e6).toFixed(1)} mi`;
  return val.toLocaleString("pt-BR");
}

function pctChange(curr: number, prev: number) {
  if (prev === 0) return 0;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

interface Alert {
  type: "warning" | "info" | "positive";
  title: string;
  desc: string;
}

export function AIAnalysis() {
  const { data } = useFiscalData();
  const { amf, indicadores, dc } = data;

  const alerts: Alert[] = [];
  const insights: string[] = [];

  // Resultado Primário analysis
  const resPrim = amf.find((r) => r.especificacao.includes("Resultado Primário (SEM RPPS)"));
  if (resPrim) {
    const years = Object.keys(resPrim.valores).sort();
    if (years.length >= 2) {
      const curr = resPrim.valores[years[1]];
      const prev = resPrim.valores[years[0]];
      const change = pctChange(curr, prev);
      insights.push(
        `O Resultado Primário (sem RPPS) projeta variação de **${change.toFixed(1)}%** entre ${years[0]} e ${years[1]}, passando de ${formatBi(prev)} para ${formatBi(curr)}. ${change > 0 ? "Trata-se de uma melhora significativa na geração de superávit primário, indicando maior disciplina fiscal." : "A deterioração exige atenção imediata das autoridades fiscais."}`
      );
    }
  }

  // Outlier detection (>10% variation)
  amf.forEach((row) => {
    const years = Object.keys(row.valores).sort();
    for (let i = 1; i < years.length; i++) {
      const change = pctChange(row.valores[years[i]], row.valores[years[i - 1]]);
      if (Math.abs(change) > 10 && !row.especificacao.includes("Resultado")) {
        alerts.push({
          type: Math.abs(change) > 30 ? "warning" : "info",
          title: `${row.especificacao}`,
          desc: `Variação de ${change.toFixed(1)}% entre ${years[i - 1]} e ${years[i]} (${formatBi(row.valores[years[i - 1]])} → ${formatBi(row.valores[years[i]])})`,
        });
      }
    }
  });

  // Indicadores analysis
  if (indicadores.length >= 2) {
    const last = indicadores[indicadores.length - 1];
    const prev = indicadores[indicadores.length - 2];

    if (last.endividamento > 30) {
      alerts.push({
        type: "warning",
        title: "Endividamento Elevado",
        desc: `O índice de endividamento de ${last.endividamento.toFixed(2)}% em ${last.periodo} requer monitoramento. Limite prudencial sugerido: 30%.`,
      });
    }

    if (last.despesaPessoal < prev.despesaPessoal) {
      insights.push(
        `Observa-se tendência positiva na contenção de despesas com pessoal: redução de ${prev.despesaPessoal.toFixed(2)}% (${prev.periodo}) para ${last.despesaPessoal.toFixed(2)}% (${last.periodo}), sinalizando esforço de racionalização da folha.`
      );
    }

    if (last.despCorrentesRecCorrente > 90) {
      alerts.push({
        type: "warning",
        title: "Rigidez Orçamentária",
        desc: `A relação Desp. Correntes/Rec. Correntes de ${last.despCorrentesRecCorrente.toFixed(2)}% indica alto comprometimento da receita com despesas obrigatórias.`,
      });
    }
  }

  // DC analysis
  const dcRow = dc.find((r) => r.item.includes("DÍVIDA CONSOLIDADA - DC"));
  if (dcRow) {
    const years = Object.keys(dcRow.valores).sort();
    const lastYears = years.slice(-3);
    if (lastYears.length >= 2) {
      const trend = dcRow.valores[lastYears[lastYears.length - 1]] < dcRow.valores[lastYears[0]];
      if (trend) {
        insights.push(
          `A Dívida Consolidada apresenta trajetória de queda entre ${lastYears[0]} e ${lastYears[lastYears.length - 1]}, saindo de ${formatBi(dcRow.valores[lastYears[0]])} para ${formatBi(dcRow.valores[lastYears[lastYears.length - 1]])}. Este é um indicador positivo de sustentabilidade fiscal.`
        );
      }
    }
  }

  // Deduplicate alerts
  const uniqueAlerts = alerts.reduce<Alert[]>((acc, alert) => {
    if (!acc.find(a => a.title === alert.title)) acc.push(alert);
    return acc;
  }, []).slice(0, 8);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Brain className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Análise de Cenário</h2>
          <p className="text-sm text-muted-foreground">Análise automatizada por inteligência de dados fiscais</p>
        </div>
      </div>

      {/* Insights */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Parecer do Analista Fiscal
        </h3>
        <div className="space-y-3">
          {insights.map((text, i) => (
            <p key={i} className="text-sm leading-relaxed text-foreground/90">
              {text.split("**").map((part, j) => 
                j % 2 === 1 ? <strong key={j} className="text-primary">{part}</strong> : part
              )}
            </p>
          ))}
          {insights.length === 0 && (
            <p className="text-sm text-muted-foreground">Carregue um arquivo para gerar insights.</p>
          )}
        </div>
      </div>

      {/* Alerts */}
      {uniqueAlerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-chart-negative" />
            Alertas e Distorções Identificadas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {uniqueAlerts.map((alert, i) => (
              <div key={i} className={`glass-card p-4 border-l-4 ${
                alert.type === "warning" ? "border-l-chart-negative" : 
                alert.type === "positive" ? "border-l-chart-positive" : "border-l-chart-cyan"
              }`}>
                <div className="flex items-start gap-2">
                  {alert.type === "warning" ? (
                    <AlertTriangle className="h-4 w-4 text-chart-negative mt-0.5 shrink-0" />
                  ) : (
                    <Info className="h-4 w-4 text-chart-cyan mt-0.5 shrink-0" />
                  )}
                  <div>
                    <p className="text-xs font-semibold">{alert.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{alert.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
