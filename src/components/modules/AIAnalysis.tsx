import { useFiscalData } from "@/contexts/FiscalDataContext";
import { Brain, AlertTriangle, TrendingUp, Info, Shield, ShieldAlert, ShieldCheck, ListChecks } from "lucide-react";
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

// Limites regulamentares
const LIMITES = {
  pessoalAlerta: 44.10,
  pessoalPrudencial: 46.55,
  pessoalMaximo: 49.00,
  despCorrentesRecCorrente: 95.00,
  endividamento: 200,
};

function classifyOverall(lines: AnalysisLine[]): { label: string; color: string } {
  const reds = lines.filter(l => l.stress === "red").length;
  const yellows = lines.filter(l => l.stress === "yellow").length;
  if (reds >= 3) return { label: "Com sinais de estresse estrutural", color: "text-chart-negative" };
  if (reds >= 1) return { label: "Em atenção", color: "text-yellow-600 dark:text-yellow-400" };
  if (yellows >= 2) return { label: "Equilibrado com fragilidades", color: "text-yellow-600 dark:text-yellow-400" };
  return { label: "Fiscalmente equilibrado", color: "text-chart-positive" };
}

export function AIAnalysis() {
  const { data, notes } = useFiscalData();
  const { amf, indicadores, dc } = data;

  if (!data.loaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] text-muted-foreground">
        <p className="text-sm">Carregue um arquivo Excel para gerar a análise.</p>
      </div>
    );
  }

  // Collect analyst comments for integration
  const analystComments: string[] = [];
  Object.entries(notes).forEach(([key, text]) => {
    if (text && text.trim()) {
      analystComments.push(`[${key}]: ${text}`);
    }
  });

  const lines: AnalysisLine[] = [];
  const positives: string[] = [];
  const vulnerabilities: string[] = [];
  const conclusions: { section: string; text: string }[] = [];
  const limitations: string[] = [];
  const recommendations: string[] = [];

  // ========== INDICADORES ANALYSIS ==========
  if (indicadores.length >= 2) {
    const last = indicadores[indicadores.length - 1];
    const prev = indicadores[indicadores.length - 2];

    // Limite de despesas com pessoal (Pessoal Executivo)
    const despPesChange = last.despesaPessoal - prev.despesaPessoal;
    let despPesStress: StressLevel = "green";
    let despPesDetail = "";

    if (last.despesaPessoal >= LIMITES.pessoalMaximo) {
      despPesStress = "red";
      despPesDetail = `Acima do limite máximo de ${LIMITES.pessoalMaximo}%. Situação que indica necessidade de medidas de contenção.`;
    } else if (last.despesaPessoal >= LIMITES.pessoalPrudencial) {
      despPesStress = "red";
      despPesDetail = `Acima do limite prudencial de ${LIMITES.pessoalPrudencial}% e abaixo do máximo de ${LIMITES.pessoalMaximo}%. Vedações automáticas da LRF podem se aplicar.`;
    } else if (last.despesaPessoal >= LIMITES.pessoalAlerta) {
      despPesStress = "yellow";
      despPesDetail = `Acima do limite de alerta de ${LIMITES.pessoalAlerta}%. Tribunal de Contas deve ser notificado. Limite prudencial: ${LIMITES.pessoalPrudencial}%.`;
    } else {
      despPesDetail = `Abaixo do limite de alerta de ${LIMITES.pessoalAlerta}%. Dentro de parâmetros adequados.`;
    }

    lines.push({
      label: `Limite de Despesas com Pessoal (${last.periodo})`,
      detail: `Relação Despesa com Pessoal/RCL de ${last.despesaPessoal.toFixed(2)}% (variação de ${despPesChange > 0 ? "+" : ""}${despPesChange.toFixed(2)} p.p. em relação a ${prev.periodo}). ${despPesDetail} Limites: alerta ${LIMITES.pessoalAlerta}%, prudencial ${LIMITES.pessoalPrudencial}%, máximo ${LIMITES.pessoalMaximo}%. Nota: a variação pode decorrer tanto de aumento/redução da folha quanto de variação na RCL.`,
      stress: despPesStress,
      source: "indicadores",
    });

    if (despPesStress === "green") positives.push(`Despesa com pessoal de ${last.despesaPessoal.toFixed(2)}% abaixo do limite de alerta (${LIMITES.pessoalAlerta}%).`);
    else vulnerabilities.push(`Despesa com pessoal de ${last.despesaPessoal.toFixed(2)}% ${despPesStress === "red" ? "acima do limite prudencial/máximo" : "acima do limite de alerta"}.`);

    // Despesas correntes / Receitas correntes — limite 95%
    const dcrcStress: StressLevel = last.despCorrentesRecCorrente >= LIMITES.despCorrentesRecCorrente ? "red" : last.despCorrentesRecCorrente >= 90 ? "yellow" : "green";
    lines.push({
      label: `Desp. Correntes/Rec. Correntes (${last.periodo})`,
      detail: `Relação de ${last.despCorrentesRecCorrente.toFixed(2)}% (limite de referência: ${LIMITES.despCorrentesRecCorrente}%). ${dcrcStress === "red" ? "Comprometimento elevado da receita corrente com despesas obrigatórias. Sugere risco de compressão da poupança corrente e possível dificuldade para financiar investimentos." : dcrcStress === "yellow" ? "Proximidade do limite de 95%. Margem de expansão fiscal tende a ser limitada. Rigidez orçamentária elevada." : "Dentro de parâmetros aceitáveis. Existe margem para investimento e despesas discricionárias."}`,
      stress: dcrcStress,
      source: "indicadores",
    });

    if (dcrcStress === "green") positives.push("Relação despesas correntes/receitas correntes dentro de parâmetros aceitáveis.");
    else vulnerabilities.push(`Rigidez orçamentária: desp. correntes/rec. correntes em ${last.despCorrentesRecCorrente.toFixed(2)}%.`);

    // Endividamento
    const endStress: StressLevel = last.endividamento > LIMITES.endividamento ? "red" : last.endividamento > 150 ? "yellow" : "green";
    lines.push({
      label: `Endividamento DCL/RCL (${last.periodo})`,
      detail: `Índice de ${last.endividamento.toFixed(2)}% da RCL. Referência do Senado Federal: ${LIMITES.endividamento}%. ${endStress === "red" ? "Acima do limite de referência. Sugere risco fiscal elevado." : endStress === "yellow" ? "Abaixo do limite, mas trajetória requer monitoramento." : "Dentro de parâmetros seguros."}`,
      stress: endStress,
      source: "indicadores",
    });

    if (endStress === "green") positives.push("Endividamento dentro de parâmetros seguros.");
    else vulnerabilities.push(`Endividamento de ${last.endividamento.toFixed(2)}% requer monitoramento.`);

    // Trajetória histórica
    if (indicadores.length >= 3) {
      const trajectory = indicadores.slice(-3);
      const pessoalTrend = trajectory[2].despesaPessoal - trajectory[0].despesaPessoal;
      if (pessoalTrend > 2) {
        vulnerabilities.push("Trajetória ascendente da despesa com pessoal nos últimos períodos.");
      } else if (pessoalTrend < -1) {
        positives.push("Trajetória descendente da despesa com pessoal nos últimos períodos.");
      }
    }
  } else {
    limitations.push("Dados de indicadores fiscais insuficientes para análise de trajetória (mínimo 2 períodos).");
  }

  // Indicadores Conclusion
  const indStresses = lines.filter((l) => l.source === "indicadores").map((l) => l.stress);
  conclusions.push({
    section: "Indicadores Fiscais",
    text: indStresses.includes("red")
      ? "Os indicadores fiscais sugerem sinais de estresse. A despesa com pessoal e/ou rigidez orçamentária encontram-se em nível que merece atenção. Medidas de ajuste podem ser necessárias para evitar descumprimento dos limites da LRF."
      : indStresses.includes("yellow")
      ? "Os indicadores estão dentro dos limites legais, mas a margem de segurança tende a ser reduzida. Monitoramento contínuo e planejamento de contingência são recomendados."
      : "Os indicadores fiscais estão em patamar saudável, indicando equilíbrio fiscal e espaço para gestão.",
  });

  // ========== AMF ANALYSIS ==========
  const resPrim = amf.find((r) => r.especificacao.includes("Resultado Primário (SEM RPPS)") && r.especificacao.includes("Acima da Linha"));
  const recPrim = amf.find((r) => r.especificacao.includes("Receitas Primárias (EXCETO FONTES RPPS) (I)"));
  const despPrim = amf.find((r) => r.especificacao.includes("Despesas Primárias (EXCETO FONTES RPPS) (II)"));

  if (resPrim) {
    const years = Object.keys(resPrim.valores).sort();
    if (years.length >= 2) {
      const curr = resPrim.valores[years[years.length - 1]];
      const prev = resPrim.valores[years[years.length - 2]];
      const change = pctChange(curr, prev);
      const stress: StressLevel = change > 5 ? "green" : change > -5 ? "yellow" : "red";
      lines.push({
        label: "Resultado Primário (SEM RPPS)",
        detail: `Variação de ${change.toFixed(1)}% entre ${years[years.length - 2]} e ${years[years.length - 1]} (${formatBi(prev)} → ${formatBi(curr)}). ${change > 0 ? "Melhora na geração de superávit primário. Verificar se é sustentável frente à rigidez das despesas obrigatórias." : "Deterioração do resultado primário. Revisão das premissas de arrecadação recomendada."}`,
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
          detail: `Crescimento projetado de ${recChange.toFixed(1)}% na receita vs ${despChange.toFixed(1)}% na despesa. Sugere premissa otimista de arrecadação que merece acompanhamento.`,
          stress: "yellow",
          source: "amf",
        });
      }
      // Melhora fiscal por queda de investimento
      if (despChange < -5 && recChange > -2) {
        vulnerabilities.push(`${years[i]}: possível melhora de baixa qualidade — queda de ${Math.abs(despChange).toFixed(1)}% na despesa sem correspondente redução estrutural.`);
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
          detail: `Variação atípica de ${change.toFixed(1)}% entre ${years[i - 1]} e ${years[i]} (${formatBi(row.valores[years[i - 1]])} → ${formatBi(row.valores[years[i]])}). Variação acima de 10% requer justificativa técnica.`,
          stress,
          source: "amf",
        });
      }
    }
  });

  // AMF Conclusion
  const amfStresses = lines.filter((l) => l.source === "amf").map((l) => l.stress);
  conclusions.push({
    section: "AMF",
    text: amfStresses.includes("red")
      ? "O Anexo de Metas Fiscais apresenta distorções significativas que comprometem a credibilidade das projeções. Recomenda-se revisão das premissas de receita e reavaliação da trajetória de despesas."
      : amfStresses.includes("yellow")
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
          : `Trajetória de alta entre ${lastYears[0]} e ${lastYears[lastYears.length - 1]} (${formatBi(dcRow.valores[lastYears[0]])} → ${formatBi(dcRow.valores[lastYears[lastYears.length - 1]])}). Exige atenção quanto à capacidade de pagamento.`,
        stress,
        source: "dc",
      });
      if (trend) positives.push("Dívida Consolidada em trajetória de queda.");
      else vulnerabilities.push("Dívida Consolidada em trajetória de alta.");
    }
  }

  // DCL vs DC — verificar se piora da DCL decorre de queda de caixa
  if (dclRow && dcRow && disponibilidades) {
    const years = Object.keys(dclRow.valores).sort();
    if (years.length >= 2) {
      const lastY = years[years.length - 1];
      const prevY = years[years.length - 2];
      const dclChange = pctChange(dclRow.valores[lastY], dclRow.valores[prevY]);
      const dcChange = pctChange(dcRow.valores[lastY], dcRow.valores[prevY]);
      const caixaChange = pctChange(disponibilidades.valores[lastY], disponibilidades.valores[prevY]);

      if (dclChange > 5 && dcChange <= 2 && caixaChange < -5) {
        lines.push({
          label: "Risco de Liquidez",
          detail: `A DCL piorou ${dclChange.toFixed(1)}% enquanto a dívida bruta variou apenas ${dcChange.toFixed(1)}%. A deterioração decorre de queda de caixa (${caixaChange.toFixed(1)}%). Risco de liquidez e deterioração da posição financeira líquida.`,
          stress: "red",
          source: "dc",
        });
        vulnerabilities.push("Risco de liquidez: piora da DCL por queda de caixa, não por aumento de dívida bruta.");
      }
    }
  }

  // Precatórios — EC 136/2025
  if (precatorios) {
    const years = Object.keys(precatorios.valores).sort();
    const lastVal = precatorios.valores[years[years.length - 1]];
    lines.push({
      label: "Precatórios (EC 136/2025)",
      detail: `Saldo de precatórios de ${formatBi(lastVal)} em ${years[years.length - 1]}. Atenção: a EC 136/2025 altera o regime de pagamento de precatórios. Recomenda-se análise detalhada do impacto na trajetória de endividamento.`,
      stress: "yellow",
      source: "dc",
    });
  } else {
    limitations.push("A planilha não contém detalhamento de precatórios para análise à luz da EC 136/2025.");
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
        detail: `Variação de ${change.toFixed(1)}% entre ${years[years.length - 2]} e ${years[years.length - 1]} (${formatBi(prev)} → ${formatBi(curr)}). ${stress === "red" ? "Deterioração significativa da posição de caixa. Aumento da dívida pode estar sem lastro financeiro." : stress === "yellow" ? "Leve queda na posição de caixa. Monitorar evolução." : "Posição de liquidez compatível com o nível de endividamento."}`,
        stress,
        source: "dc",
      });
    }
  }

  // DC Conclusion
  const dcStresses = lines.filter((l) => l.source === "dc").map((l) => l.stress);
  conclusions.push({
    section: "Dívida Consolidada",
    text: dcStresses.includes("red")
      ? "A Dívida Consolidada apresenta sinais de estresse estrutural. A trajetória de endividamento e/ou a posição de caixa indicam vulnerabilidade fiscal que demanda ação corretiva."
      : dcStresses.includes("yellow")
      ? "O perfil de endividamento está dentro dos limites legais, porém apresenta pontos de atenção que requerem acompanhamento contínuo, especialmente precatórios e disponibilidades."
      : "Perfil de endividamento saudável, com dívida em trajetória controlada e liquidez adequada.",
  });

  // ========== RECOMMENDATIONS ==========
  recommendations.push("Monitorar trimestralmente a relação Despesa com Pessoal/RCL frente aos limites de alerta, prudencial e máximo.");
  recommendations.push("Manter acompanhamento da relação despesas correntes/receitas correntes para preservar margem de poupança corrente.");
  if (vulnerabilities.some(v => v.includes("endividamento") || v.includes("Endividamento"))) {
    recommendations.push("Elaborar plano de redução gradual do endividamento com metas intermediárias.");
  }
  if (vulnerabilities.some(v => v.includes("liquidez") || v.includes("caixa"))) {
    recommendations.push("Fortalecer a posição de caixa para garantir lastro financeiro à dívida consolidada.");
  }
  recommendations.push("Revisar premissas de receita no AMF para verificar aderência ao histórico de arrecadação.");
  recommendations.push("Avaliar o impacto da EC 136/2025 sobre o cronograma de pagamento de precatórios.");

  // Deduplicate lines by label
  const uniqueLines = lines.reduce<AnalysisLine[]>((acc, line) => {
    if (!acc.find((l) => l.label === line.label)) acc.push(line);
    return acc;
  }, []);

  const overall = classifyOverall(uniqueLines);

  // Build analyst comments section for display
  const relevantComments = analystComments.filter(c => c.trim().length > 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Brain className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Análise Fiscal Automatizada</h2>
          <p className="text-sm text-muted-foreground">Metas, Dívida, Liquidez e Sustentabilidade</p>
        </div>
      </div>

      {/* Resumo Executivo */}
      <div className="glass-card p-5 border-l-4 border-l-primary">
        <h3 className="text-sm font-semibold mb-2">1. Resumo Executivo</h3>
        <p className="text-xs mb-2">
          Classificação: <span className={`font-bold ${overall.color}`}>{overall.label}</span>
        </p>
        <p className="text-xs text-foreground/80 leading-relaxed">
          A análise considera exclusivamente os dados da planilha carregada. {positives.length > 0 ? `Há ${positives.length} ponto(s) positivo(s) identificado(s).` : ""} {vulnerabilities.length > 0 ? `Foram detectados ${vulnerabilities.length} ponto(s) de vulnerabilidade.` : ""} {limitations.length > 0 ? `Existem ${limitations.length} limitação(ões) analítica(s) por insuficiência de dados.` : ""}
        </p>
      </div>

      {/* Destaques Positivos e Vulnerabilidades */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {positives.length > 0 && (
          <div className="glass-card p-5 border-l-4 border-l-chart-positive">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <ShieldCheck className="h-4 w-4 text-chart-positive" />
              2. Destaques Positivos
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
              3. Pontos de Vulnerabilidade
            </h3>
            <ul className="space-y-1">
              {vulnerabilities.map((v, i) => (
                <li key={i} className="text-xs text-foreground/80">• {v}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Limitações analíticas */}
      {limitations.length > 0 && (
        <div className="glass-card p-4 border-l-4 border-l-yellow-500">
          <h3 className="text-xs font-semibold flex items-center gap-2 mb-2">
            <Info className="h-3.5 w-3.5 text-yellow-500" />
            Limitações Analíticas
          </h3>
          <ul className="space-y-1">
            {limitations.map((l, i) => (
              <li key={i} className="text-xs text-foreground/70">• {l}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Comentários dos Analistas integrados */}
      {relevantComments.length > 0 && (
        <div className="glass-card p-4 border-l-4 border-l-blue-500">
          <h3 className="text-xs font-semibold flex items-center gap-2 mb-2">
            <ListChecks className="h-3.5 w-3.5 text-blue-500" />
            Comentários dos Analistas (considerados na análise)
          </h3>
          <ul className="space-y-1">
            {relevantComments.map((c, i) => (
              <li key={i} className="text-xs text-foreground/70">• {c}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 4. Análise por Aba — Alertas e Distorções */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border/50">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary" />
            4. Alertas e Distorções Identificadas
          </h3>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="text-left p-3 font-medium text-muted-foreground w-12">Stress</th>
                <th className="text-left p-3 font-medium text-muted-foreground min-w-[200px]">Item</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Análise da IA</th>
                <th className="text-center p-3 font-medium text-muted-foreground w-10">📝</th>
              </tr>
            </thead>
            <tbody>
              {uniqueLines.map((line, i) => (
                <tr key={i} className="data-table-row">
                  <td className="p-3">
                    <StressBadge level={line.stress} justified={!!notes[`ai-${i}`]} />
                  </td>
                  <td className="p-3 text-xs font-medium">{line.label}</td>
                  <td className="p-3 text-xs text-foreground/80 leading-relaxed">
                    {line.detail}
                    {notes[`ai-${i}`] && (
                      <span className="block mt-1 text-blue-600 dark:text-blue-400 italic">
                        Nota do analista: {notes[`ai-${i}`]}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <NotePopover noteKey={`ai-${i}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Nota de Auditoria — Conclusão da IA */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          5. Nota de Auditoria — Conclusão da IA
        </h3>
        {conclusions.map((c, i) => (
          <div key={i} className="glass-card p-5">
            <p className="text-xs font-semibold text-primary mb-2">Conclusão — {c.section}</p>
            <p className="text-sm leading-relaxed text-foreground/90">{c.text}</p>
          </div>
        ))}
      </div>

      {/* 6. Recomendações */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <ListChecks className="h-4 w-4 text-primary" />
          6. Recomendações
        </h3>
        <ol className="space-y-2 list-decimal list-inside">
          {recommendations.map((r, i) => (
            <li key={i} className="text-xs text-foreground/80 leading-relaxed">{r}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}
