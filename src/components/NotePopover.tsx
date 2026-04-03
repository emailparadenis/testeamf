import { MessageSquare } from "lucide-react";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useFiscalData } from "@/contexts/FiscalDataContext";

interface NotePopoverProps {
  noteKey: string;
}

export function NotePopover({ noteKey }: NotePopoverProps) {
  const { notes, setNote } = useFiscalData();
  const [text, setText] = useState(notes[noteKey] || "");
  const hasNote = !!notes[noteKey];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={`inline-flex items-center justify-center h-5 w-5 rounded transition-colors ${hasNote ? "text-primary" : "text-muted-foreground/40 hover:text-muted-foreground"}`}>
          <MessageSquare className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 glass-card-elevated" align="start">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Nota do Especialista</p>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Insira um comentário sobre este dado..."
            className="text-sm min-h-[80px] resize-none"
          />
          <Button size="sm" className="w-full" onClick={() => setNote(noteKey, text)}>
            Salvar Nota
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
