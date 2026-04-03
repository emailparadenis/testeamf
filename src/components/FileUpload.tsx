import { Upload, FileSpreadsheet, CheckCircle } from "lucide-react";
import { useCallback, useRef } from "react";
import { useFiscalData } from "@/contexts/FiscalDataContext";
import { toast } from "sonner";

export function FileUpload() {
  const { loadFile, data } = useFiscalData();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    try {
      await loadFile(file);
      toast.success("Arquivo carregado com sucesso!", {
        description: `${file.name} processado.`,
      });
    } catch {
      toast.error("Erro ao processar arquivo.");
    }
  }, [loadFile]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  if (data.loaded) {
    return (
      <button
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
      >
        <CheckCircle className="h-4 w-4" />
        <span>Recarregar</span>
        <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onChange} />
      </button>
    );
  }

  return (
    <div
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => inputRef.current?.click()}
      className="glass-card-elevated cursor-pointer flex flex-col items-center justify-center gap-4 p-12 border-2 border-dashed border-primary/30 hover:border-primary/60 transition-all duration-300 max-w-lg mx-auto"
    >
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <FileSpreadsheet className="h-8 w-8 text-primary" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-lg font-semibold">Carregar Planilha</p>
        <p className="text-sm text-muted-foreground">
          Arraste um arquivo Excel (.xlsx) com as abas Indicadores, AMF e DC
        </p>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Upload className="h-3 w-3" />
        Clique ou arraste para enviar
      </div>
      <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onChange} />
    </div>
  );
}
