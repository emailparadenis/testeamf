import { useFiscalData } from "@/contexts/FiscalDataContext";
import { Brain, AlertTriangle, TrendingUp, Info, Shield, ShieldAlert, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";
import { NotePopover } from "@/components/NotePopover";

function formatBi(val: number) {
  if (Math.abs(val) >= 1e9) return `R$ ${(val / 1e9).toFixed(2)} bi`;
  if (Math.abs(val) >= 1e6) return `R$ ${(val / 1e6).toFixed(1)} mi`;
  return val.toLocaleString("pt-BR");
}

function pctChange(curr: number, prev: number) {
  if (prev === 0) return 0;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

type StressLevel = "green" | "yellow" | "red";

interface AnalysisLine {
  label: string;
  detail: string;
  stress: StressLevel;
  source: "amf" | "dc" | "indicadores";
}

function StressBadge({ level, justified }: { level: StressLevel; justified?: boolean }) {
  if (justified) {
    return (
      <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[10px] gap-1 border">
        <CheckCircle className="h-3 w-3" />
        Justificado
      </Badge>
    );
  }
  const config = {
    green: { label: "Adequado", className: "bg-chart-positive/15 text-chart-positive border-chart-positive/30", icon: ShieldCheck },
    yellow: { label: "Atenção", className: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30", icon: Shield },
    red: { label: "Risco", className: "bg-chart-negative/15 text-chart-negative border-chart-negative/30", icon: ShieldAlert },
  };
  const c = config[level];
  return (
    <Badge className={`${c.className} text-[10px] gap-1 border`}>
      <c.icon className="h-3 w-3" />
      {c.label}
    </Badge>
  );
}

export function AIAnalysis() {
  const { data } = useFiscalData();
  const { amf, indicadores, dc } = data;

  if (!data.loaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] text-muted-foreground">
        <p className="text-sm">Carregue um arquivo Excel para gerar a análise.</p>
      </div>
    );
  }

  const lines: AnalysisLine[] = [];
  const positives: string[] = [];
  const vulnerabilities: string[] = [];
  const conclusions: { section: string; text: string }[] = [];

  // ========== AMF ANALYSIS ==========
  const resPrim = amf.find((r) => r.especificacao.includes("Resultado Primário (SEM RPPS)") && r.especificacao.includes("Acima da Linha"));
  const recPrim = amf.find((r) => r.especificacao.includes("Receitas Primárias (EXCETO FONTES RPPS) (I)"));
  const despPrim = amf.find((r) => r.especificacao.includes("Despesas Primárias (EXCETO FONTES RPPS) (II)"));

  if (resPrim) {
    const years = Object.keys(resPrim.valores).sort();
    if (years.length >= 2) {
      const curr = resPrim.valores[years[1]];
      const prev = resPrim.valores[years[0]];
      const change = pctChange(curr, prev);
      const stress: StressLevel = change > 5 ? "green" : change > -5 ? "yellow" : "red";
      lines.push({
        label: "Resultado Primário (SEM RPPS)",
        detail: `Variação de ${change.toFixed(1)}% entre ${years[0]} e ${years[1]} (${formatBi(prev)} → ${formatBi(curr)}). ${change > 0 ? "A melhora na geração de superávit primário sugere disciplina fiscal, porém deve-se verificar se é sustentável frente à rigidez das despesas obrigatórias." : "A deterioração do resultado primário exige revisão imediata das premissas de arrecadação e contenção de gastos."}`,
        stress,
        source: "amf",
      });
      if (stress === "green") positives.push("Resultado Primário em trajetória positiva.");
      else vulnerabilities.push("Resultado Primário apresenta pressão ou deterioração.");
    }
  }

  // Consistência temporal — receita vs despesa
  if (recPrim && despPrim) {
    const years = Object.keys(recPrim.valores).sort();
    for (let i = 1; i < years.length; i++) {
      const recChange = pctChange(recPrim.valores[years[i]], recPrim.valores[years[i - 1]]);
      const despChange = pctChange(despPrim.valores[years[i]], despPrim.valores[years[i - 1]]);
      if (recChange > despChange + 5) {
        lines.push({
          label: `Receita Primária ${years[i]}`,
          detail: `Crescimento projetado de ${recChange.toFixed(1)}% na receita vs ${despChange.toFixed(1)}% na despesa. Premissa otimista de arrecadação que deve ser monitorada.`,
          stress: "yellow",
          source: "amf",
        });
      }
    }
  }

  // Outlier detection AMF (>10% variation)
  amf.forEach((row) => {
    const years = Object.keys(row.valores).sort();
    for (let i = 1; i < years.length; i++) {
      const change = pctChange(row.valores[years[i]], row.valores[years[i - 1]]);
      if (Math.abs(change) > 10 && !row.especificacao.includes("Resultado")) {
        const stress: StressLevel = Math.abs(change) > 30 ? "red" : "yellow";
        lines.push({
          label: row.especificacao,
          detail: `Variação atípica de ${change.toFixed(1)}% entre ${years[i - 1]} e ${years[i]} (${formatBi(row.valores[years[i - 1]])} → ${formatBi(row.valores[years[i]])}). Ponto de atenção: variação acima de 10% requer justificativa técnica.`,
          stress,
          source: "amf",
        });
      }
    }
  });

  // AMF Conclusion
  const amfStresses = lines.filter((l) => l.source === "amf").map((l) => l.stress);
  const amfHasRed = amfStresses.includes("red");
  const amfHasYellow = amfStresses.includes("yellow");
  conclusions.push({
    section: "AMF",
    text: amfHasRed
      ? "O Anexo de Metas Fiscais apresenta distorções significativas que comprometem a credibilidade das projeções. Recomenda-se revisão das premissas de receita e reavaliação da trajetória de despesas."
      : amfHasYellow
      ? "As projeções do AMF estão dentro de parâmetros aceitáveis, porém alguns itens apresentam variações que merecem acompanhamento. A margem de segurança é reduzida."
      : "O AMF apresenta consistência nas projeções, com trajetória fiscal equilibrada e premissas compatíveis com o histórico recente.",
  });

  // ========== DC ANALYSIS ==========
  const dcRow = dc.find((r) => r.item.includes("DÍVIDA CONSOLIDADA - DC"));
  const dclRow = dc.find((r) => r.item.includes("DÍVIDA CONSOLIDADA LÍQUIDA"));
  const disponibilidades = dc.find((r) => r.item.toLowerCase().includes("disponibilidade"));
  const precatorios = dc.find((r) => r.item.toLowerCase().includes("precatór"));

  if (dcRow) {
    const years = Object.keys(dcRow.valores).sort();
    const lastYears = years.slice(-3);
    if (lastYears.length >= 2) {
      const trend = dcRow.valores[lastYears[lastYears.length - 1]] < dcRow.valores[lastYears[0]];
      const stress: StressLevel = trend ? "green" : "red";
      lines.push({
        label: "Dívida Consolidada Bruta",
        detail: trend
          ? `Trajetória de queda entre ${lastYears[0]} e ${lastYears[lastYears.length - 1]} (${formatBi(dcRow.valores[lastYears[0]])} → ${formatBi(dcRow.valores[lastYears[lastYears.length - 1]])}). Indicador positivo de sustentabilidade fiscal.`
          : `Trajetória de alta entre ${lastYears[0]} e ${lastYears[lastYears.length - 1]} (${formatBi(dcRow.valores[lastYears[0]])} → ${formatBi(dcRow.valores[lastYears[lastYears.length - 1]])}). Exige atenção quanto à capacidade de pagamento e renegociação.`,
        stress,
        source: "dc",
      });
      if (trend) positives.push("Dívida Consolidada em trajetória de queda.");
      else vulnerabilities.push("Dívida Consolidada em trajetória de alta.");
    }
  }

  // Precatórios — EC 136/2025
  if (precatorios) {
    const years = Object.keys(precatorios.valores).sort();
    const lastVal = precatorios.valores[years[years.length - 1]];
    lines.push({
      label: "Precatórios (EC 136/2025)",
      detail: `Saldo de precatórios de ${formatBi(lastVal)} em ${years[years.length - 1]}. Atenção: a Emenda Constitucional 136/2025 altera o regime de pagamento de precatórios. Recomenda-se análise detalhada do impacto na trajetória de endividamento.`,
      stress: "yellow",
      source: "dc",
    });
  }

  // Endividamento vs limite (200% RCL)
  if (indicadores.length > 0) {
    const last = indicadores[indicadores.length - 1];
    const stress: StressLevel = last.endividamento > 150 ? "red" : last.endividamento > 100 ? "yellow" : "green";
    lines.push({
      label: `Endividamento DCL/RCL (${last.periodo})`,
      detail: `Índice de ${last.endividamento.toFixed(2)}% da RCL. Limite de alerta do Senado Federal: 180%. Limite prudencial: 200%. ${stress === "red" ? "Proximidade crítica com os limites legais." : stress === "yellow" ? "Dentro dos limites, mas requer monitoramento." : "Dentro de parâmetros seguros."}`,
      stress,
      source: "dc",
    });
    if (stress === "green") positives.push("Endividamento dentro de parâmetros seguros.");
    else vulnerabilities.push(`Endividamento de ${last.endividamento.toFixed(2)}% requer monitoramento.`);
  }

  // Disponibilidades de caixa (liquidez)
  if (disponibilidades) {
    const years = Object.keys(disponibilidades.valores).sort();
    if (years.length >= 2) {
      const curr = disponibilidades.valores[years[years.length - 1]];
      const prev = disponibilidades.valores[years[years.length - 2]];
      const change = pctChange(curr, prev);
      const stress: StressLevel = change < -10 ? "red" : change < 0 ? "yellow" : "green";
      lines.push({
        label: "Disponibilidades de Caixa",
        detail: `Variação de ${change.toFixed(1)}% entre ${years[years.length - 2]} e ${years[years.length - 1]} (${formatBi(prev)} → ${formatBi(curr)}). ${stress === "red" ? "Deterioração significativa da posição de caixa. A dívida pode estar crescendo sem lastro financeiro." : "Posição de liquidez compatível com o nível de endividamento."}`,
        stress,
        source: "dc",
      });
    }
  }

  // DC Conclusion
  const dcStresses = lines.filter((l) => l.source === "dc").map((l) => l.stress);
  conclusions.push({
    section: "DC",
    text: dcStresses.includes("red")
      ? "A Dívida Consolidada apresenta sinais de estresse estrutural. A trajetória de endividamento e/ou a posição de caixa indicam vulnerabilidade fiscal que demanda ação corretiva imediata."
      : dcStresses.includes("yellow")
      ? "O perfil de endividamento está dentro dos limites legais, porém apresenta pontos de atenção que requerem acompanhamento contínuo, especialmente no tocante a precatórios e disponibilidades."
      : "O Estado apresenta perfil de endividamento saudável, com dívida em trajetória controlada e liquidez adequada.",
  });

  // ========== INDICADORES ANALYSIS ==========
  if (indicadores.length >= 2) {
    const last = indicadores[indicadores.length - 1];
    const prev = indicadores[indicadores.length - 2];

    // Limite de despesas com pessoal (relação desp pessoal / RCL)
    const despPesChange = last.despesaPessoal - prev.despesaPessoal;
    const despPesStress: StressLevel = last.despesaPessoal > 54 ? "red" : last.despesaPessoal > 46 ? "yellow" : "green";
    lines.push({
      label: `Limite de Despesas com Pessoal (${last.periodo})`,
      detail: `Relação Despesa com Pessoal/RCL de ${last.despesaPessoal.toFixed(2)}% (variação de ${despPesChange > 0 ? "+" : ""}${despPesChange.toFixed(2)} p.p. em relação a ${prev.periodo}). Limite máximo LRF para Estados: 60%. Limite prudencial: 57%. ${despPesStress === "red" ? "Proximidade com o limite legal exige medidas de contenção." : despPesStress === "yellow" ? "Dentro dos limites, mas a tendência merece acompanhamento." : "Dentro de parâmetros adequados."} Nota: a variação pode decorrer tanto de aumento/redução da folha quanto de variação na RCL.`,
      stress: despPesStress,
      source: "indicadores",
    });

    if (last.despCorrentesRecCorrente > 90) {
      lines.push({
        label: `Rigidez Orçamentária (${last.periodo})`,
        detail: `Relação Desp. Correntes/Rec. Correntes de ${last.despCorrentesRecCorrente.toFixed(2)}% indica alto comprometimento da receita com despesas obrigatórias. Margem de expansão fiscal limitada.`,
        stress: "red",
        source: "indicadores",
      });
      vulnerabilities.push("Rigidez orçamentária elevada.");
    } else {
      positives.push("Relação despesas correntes/receitas correntes dentro de parâmetros aceitáveis.");
    }
  }

  // Indicadores Conclusion
  const indStresses = lines.filter((l) => l.source === "indicadores").map((l) => l.stress);
  conclusions.push({
    section: "Indicadores",
    text: indStresses.includes("red")
      ? "Os indicadores fiscais revelam sinais de estresse, com limites de pessoal e/ou rigidez orçamentária em nível preocupante. O Estado deve adotar medidas de ajuste para evitar descumprimento da LRF."
      : indStresses.includes("yellow")
      ? "Os indicadores estão dentro dos limites legais, mas a margem de segurança é reduzida. Recomenda-se monitoramento contínuo e planejamento de contingência."
      : "Os indicadores fiscais estão em patamar saudável, indicando equilíbrio fiscal e espaço para gestão.",
  });

  // Deduplicate lines by label
  const uniqueLines = lines.reduce<AnalysisLine[]>((acc, line) => {
    if (!acc.find((l) => l.label === line.label)) acc.push(line);
    return acc;
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Brain className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Análise de Cenário</h2>
          <p className="text-sm text-muted-foreground">Especialista Sênior em Gestão Fiscal e Auditoria de Finanças Públicas</p>
        </div>
      </div>

      {/* Relatório Executivo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {positives.length > 0 && (
          <div className="glass-card p-5 border-l-4 border-l-chart-positive">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <ShieldCheck className="h-4 w-4 text-chart-positive" />
              Destaques Positivos
            </h3>
            <ul className="space-y-1">
              {positives.map((p, i) => (
                <li key={i} className="text-xs text-foreground/80">• {p}</li>
              ))}
            </ul>
          </div>
        )}
        {vulnerabilities.length > 0 && (
          <div className="glass-card p-5 border-l-4 border-l-chart-negative">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <ShieldAlert className="h-4 w-4 text-chart-negative" />
              Pontos de Vulnerabilidade
            </h3>
            <ul className="space-y-1">
              {vulnerabilities.map((v, i) => (
                <li key={i} className="text-xs text-foreground/80">• {v}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Análise Linha a Linha com Stress Badge */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border/50">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary" />
            Alertas e Distorções Identificadas
          </h3>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="text-left p-3 font-medium text-muted-foreground w-12">Stress</th>
                <th className="text-left p-3 font-medium text-muted-foreground min-w-[200px]">Item</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Análise do Especialista</th>
                <th className="text-center p-3 font-medium text-muted-foreground w-10">📝</th>
              </tr>
            </thead>
            <tbody>
              {uniqueLines.map((line, i) => (
                <tr key={i} className="data-table-row">
                  <td className="p-3">
                    <StressBadge level={line.stress} />
                  </td>
                  <td className="p-3 text-xs font-medium">{line.label}</td>
                  <td className="p-3 text-xs text-foreground/80 leading-relaxed">{line.detail}</td>
                  <td className="p-3 text-center">
                    <NotePopover noteKey={`ai-${i}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Conclusões do Especialista */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Nota de Auditoria — Conclusão do Especialista
        </h3>
        {conclusions.map((c, i) => (
          <div key={i} className="glass-card p-5">
            <p className="text-xs font-semibold text-primary mb-2">{c.section}</p>
            <p className="text-sm leading-relaxed text-foreground/90">{c.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
