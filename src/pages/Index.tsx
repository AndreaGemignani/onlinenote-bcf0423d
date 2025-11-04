import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Download, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // Load from localStorage on mount
  useEffect(() => {
    const savedTitle = localStorage.getItem("note-title");
    const savedContent = localStorage.getItem("note-content");
    
    if (savedTitle) setTitle(savedTitle);
    if (savedContent) setContent(savedContent);
  }, []);

  // Auto-save to localStorage
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem("note-title", title);
      localStorage.setItem("note-content", content);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [title, content]);

  const sanitizeFilename = (filename: string): string => {
    return filename
      .replace(/[^a-z0-9]/gi, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .toLowerCase();
  };

  const handleDownload = useCallback(() => {
    const filename = title.trim() 
      ? `${sanitizeFilename(title)}.txt`
      : "note.txt";
    
    const fileContent = title.trim() 
      ? `${title}\n\n${content}`
      : content;

    const blob = new Blob([fileContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Note downloaded",
      description: `Saved as ${filename}`,
    });
  }, [title, content]);

  // Keyboard shortcut: Ctrl/Cmd + S to download
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleDownload();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleDownload]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-3">
          <FileText className="w-6 h-6 text-accent" />
          <h1 className="text-lg font-semibold text-foreground">QuickNote</h1>
          <div className="ml-auto text-xs text-muted-foreground hidden sm:block">
            Auto-saving...
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        <div className="space-y-6">
          {/* Title Input */}
          <div>
            <Input
              type="text"
              placeholder="Untitled note"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-2xl sm:text-3xl font-semibold border-none bg-transparent px-0 focus-visible:ring-0 placeholder:text-muted-foreground/40"
            />
          </div>

          {/* Content Textarea */}
          <div>
            <Textarea
              placeholder="Start writing..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[60vh] text-base sm:text-lg leading-relaxed border-none bg-transparent px-0 resize-none focus-visible:ring-0 placeholder:text-muted-foreground/40"
            />
          </div>
        </div>
      </main>

      {/* Fixed Download Button */}
      <div className="fixed bottom-6 right-6 z-20">
        <Button
          onClick={handleDownload}
          size="lg"
          className="shadow-lg hover:shadow-xl transition-shadow bg-accent hover:bg-accent/90 text-accent-foreground rounded-full h-14 w-14 sm:h-auto sm:w-auto sm:rounded-lg"
          title="Download note (Ctrl/Cmd + S)"
        >
          <Download className="w-5 h-5 sm:mr-2" />
          <span className="hidden sm:inline">Download</span>
        </Button>
      </div>
    </div>
  );
};

export default Index;
