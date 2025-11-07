import { Button } from "@/components/ui/button";
import { 
  Bold, 
  Italic, 
  Highlighter, 
  CheckSquare,
  Type,
  Download,
  Trash2,
  Upload
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FormattingToolbarProps {
  onFormat: (command: string, value?: string) => void;
  onInsertCheckbox: () => void;
  onDownload: () => void;
  onClear: () => void;
  onOpenFile: () => void;
}

export const FormattingToolbar = ({ onFormat, onInsertCheckbox, onDownload, onClear, onOpenFile }: FormattingToolbarProps) => {
  return (
    <div className="flex items-center justify-between gap-3 p-2 border-b border-border bg-card/50 backdrop-blur-sm sticky top-[73px] z-10">
      <div className="flex items-center gap-1 flex-wrap">
        {/* Font Size Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm"
              className="h-8 px-2"
              title="Font size"
            >
              <Type className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="bg-popover">
            <DropdownMenuItem onClick={() => onFormat('fontSize', '3')}>
              <span className="text-sm">Small</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onFormat('fontSize', '4')}>
              <span className="text-base">Medium</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onFormat('fontSize', '5')}>
              <span className="text-lg">Large</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Bold */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFormat('bold')}
          className="h-8 px-2"
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </Button>

        {/* Italic */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFormat('italic')}
          className="h-8 px-2"
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </Button>

        {/* Highlight */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFormat('hiliteColor', '#fef08a')}
          className="h-8 px-2"
          title="Highlight"
        >
          <Highlighter className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Checkbox List */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onInsertCheckbox}
          className="h-8 px-2"
          title="Insert checkbox"
        >
          <CheckSquare className="w-4 h-4" />
        </Button>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <Button
          onClick={onOpenFile}
          size="sm"
          variant="outline"
          className="h-8"
          title="Open saved note"
        >
          <Upload className="w-4 h-4 sm:mr-1.5" />
          <span className="hidden sm:inline text-sm">Open</span>
        </Button>
        <Button
          onClick={onClear}
          size="sm"
          variant="outline"
          className="h-8 border-destructive/30 hover:bg-destructive/10 hover:border-destructive"
          title="Clear all content"
        >
          <Trash2 className="w-4 h-4 sm:mr-1.5 text-destructive" />
          <span className="hidden sm:inline text-destructive text-sm">Clear</span>
        </Button>
        <Button
          onClick={onDownload}
          size="sm"
          className="h-8 bg-accent hover:bg-accent/90 text-accent-foreground"
          title="Download note (Ctrl/Cmd + S)"
        >
          <Download className="w-4 h-4 sm:mr-1.5" />
          <span className="hidden sm:inline text-sm">Download</span>
        </Button>
      </div>
    </div>
  );
};
