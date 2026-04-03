import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import * as XLSX from "xlsx";

export interface IndicadorRow {
  periodo: number;
  endividamento: number;
  despesaPessoal: number;
  despCorrentesRecCorrente: number;
}

export interface AMFRow {
  especificacao: string;
  valores: Record<string, number>;
  variacoes: Record<string, string>;
}

export interface DCRow {
  item: string;
  valores: Record<string, number>;
}

export interface Note {
  key: string;
  text: string;
}

interface FiscalData {
  indicadores: IndicadorRow[];
  amf: AMFRow[];
  dc: DCRow[];
  dividaConsolidada: number;
  resultadoPrimario: number;
  loaded: boolean;
}

interface FiscalDataContextType {
  data: FiscalData;
  notes: Record<string, string>;
  setNote: (key: string, text: string) => void;
  loadFile: (file: File) => Promise<void>;
}

const STORAGE_KEY_DATA = "fiscal-data";
const STORAGE_KEY_NOTES = "fiscal-notes";

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  return fallback;
}

const defaultData: FiscalData = {
  indicadores: [],
  amf: [],
  dc: [],
  dividaConsolidada: 0,
  resultadoPrimario: 0,
  loaded: false,
};

const FiscalDataContext = createContext<FiscalDataContextType>({
  data: defaultData,
  notes: {},
  setNote: () => {},
  loadFile: async () => {},
});

export const useFiscalData = () => useContext(FiscalDataContext);

function parseNumber(val: any): number {
  if (val == null) return 0;
  if (typeof val === "number") return val;
  const str = String(val).replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(str);
  return isNaN(n) ? 0 : n;
}

function parsePercentage(val: any): number {
  if (val == null) return 0;
  if (typeof val === "number") return val > 1 ? val : val * 100;
  const str = String(val).replace("%", "").replace(",", ".").trim();
  const n = parseFloat(str);
  return isNaN(n) ? 0 : n;
}

export const FiscalDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<FiscalData>(() => loadFromStorage(STORAGE_KEY_DATA, defaultData));
  const [notes, setNotes] = useState<Record<string, string>>(() => loadFromStorage(STORAGE_KEY_NOTES, {}));

  // Persist data and notes to sessionStorage
  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(data)); } catch {}
  }, [data]);

  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(notes)); } catch {}
  }, [notes]);

  const setNote = useCallback((key: string, text: string) => {
    setNotes((prev) => ({ ...prev, [key]: text }));
  }, []);

  const loadFile = useCallback(async (file: File) => {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });

    // Parse Indicadores (first sheet)
    const indSheet = wb.Sheets[wb.SheetNames[0]];
    const indData = XLSX.utils.sheet_to_json<any>(indSheet, { header: 1 });
    const indicadores: IndicadorRow[] = [];
    let dividaConsolidada = 0;
    let resultadoPrimario = 0;

    for (let i = 1; i < indData.length; i++) {
      const row = indData[i];
      if (!row || !row[0]) continue;
      const firstCell = String(row[0]).trim();
      
      if (firstCell.includes("Dívida Consolidada")) {
        dividaConsolidada = parseNumber(row[1]);
        continue;
      }
      if (firstCell.includes("Resultado Primário")) {
        resultadoPrimario = parseNumber(row[1]);
        continue;
      }
      
      const year = parseInt(firstCell);
      if (!isNaN(year) && year >= 2000 && year <= 2100) {
        indicadores.push({
          periodo: year,
          endividamento: parsePercentage(row[1]),
          despesaPessoal: parsePercentage(row[2]),
          despCorrentesRecCorrente: parsePercentage(row[3]),
        });
      }
    }

    // Parse AMF (second sheet)
    const amfSheet = wb.Sheets[wb.SheetNames[1]];
    const amfData = XLSX.utils.sheet_to_json<any>(amfSheet, { header: 1 });
    const amfHeaders = amfData[0] as string[];
    const yearCols = amfHeaders?.slice(1).filter((h: any) => {
      const y = parseInt(String(h));
      return !isNaN(y) && y >= 2000;
    }) || [];
    const varCols = amfHeaders?.slice(1).filter((h: any) => String(h).includes("AH")) || [];

    const amf: AMFRow[] = [];
    for (let i = 1; i < amfData.length; i++) {
      const row = amfData[i];
      if (!row || !row[0] || !String(row[0]).trim()) continue;
      const valores: Record<string, number> = {};
      const variacoes: Record<string, string> = {};
      
      yearCols.forEach((year: string, idx: number) => {
        valores[String(year)] = parseNumber(row[idx + 1]);
      });
      
      varCols.forEach((varCol: string) => {
        const colIdx = amfHeaders.indexOf(varCol);
        if (colIdx >= 0) {
          variacoes[String(varCol)] = row[colIdx] != null ? String(row[colIdx]) : "";
        }
      });

      amf.push({ especificacao: String(row[0]).trim(), valores, variacoes });
    }

    // Parse DC (third sheet)
    const dcSheet = wb.Sheets[wb.SheetNames[2]];
    const dcData = XLSX.utils.sheet_to_json<any>(dcSheet, { header: 1 });
    const dcHeaders = dcData[0] as string[];
    const dcYearCols = dcHeaders?.slice(1).filter((h: any) => {
      const y = parseInt(String(h));
      return !isNaN(y) && y >= 2000;
    }) || [];

    const dc: DCRow[] = [];
    for (let i = 1; i < dcData.length; i++) {
      const row = dcData[i];
      if (!row || !row[0] || !String(row[0]).trim()) continue;
      const valores: Record<string, number> = {};
      dcYearCols.forEach((year: string, idx: number) => {
        valores[String(year)] = parseNumber(row[idx + 1]);
      });
      dc.push({ item: String(row[0]).trim(), valores });
    }

    // Clear notes on new file load
    setNotes({});
    setData({ indicadores, amf, dc, dividaConsolidada, resultadoPrimario, loaded: true });
  }, []);

  return (
    <FiscalDataContext.Provider value={{ data, notes, setNote, loadFile }}>
      {children}
    </FiscalDataContext.Provider>
  );
};
