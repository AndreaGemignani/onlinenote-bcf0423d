import { Button } from "@/components/ui/button";
import { 
  Bold, 
  Italic, 
  Highlighter, 
  CheckSquare,
  Type
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
}

export const FormattingToolbar = ({ onFormat, onInsertCheckbox }: FormattingToolbarProps) => {
  return (
    <div className="flex items-center gap-1 p-2 border-b border-border bg-card/50 backdrop-blur-sm sticky top-[73px] z-10">
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
    </div>
  );
};
