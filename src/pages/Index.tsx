import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, FileText, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { FormattingToolbar } from "@/components/FormattingToolbar";

const Index = () => {
  const [title, setTitle] = useState("");
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [currentFilename, setCurrentFilename] = useState<string>("");
  const contentRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const savedTitle = localStorage.getItem("note-title");
    const savedContent = localStorage.getItem("note-content");
    
    if (savedTitle) setTitle(savedTitle);
    if (savedContent && contentRef.current) {
      contentRef.current.innerHTML = savedContent;
    }
  }, []);

  // Auto-save to localStorage
  const handleContentChange = useCallback(() => {
    if (contentRef.current) {
      const content = contentRef.current.innerHTML;
      localStorage.setItem("note-content", content);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem("note-title", title);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [title]);

  const sanitizeFilename = (filename: string): string => {
    return filename
      .replace(/[^a-z0-9]/gi, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .toLowerCase();
  };

  const handleFormat = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    contentRef.current?.focus();
    handleContentChange();
  }, [handleContentChange]);

  const handleInsertCheckbox = useCallback(() => {
    if (!contentRef.current) return;

    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    
    // Get selected text if any
    const selectedText = range.toString();
    
    // Create checkbox element
    const checkboxContainer = document.createElement('div');
    checkboxContainer.className = 'checkbox-item flex items-center gap-2';
    checkboxContainer.contentEditable = 'true';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'flex-shrink-0';
    checkbox.contentEditable = 'false';
    checkbox.style.width = '18px';
    checkbox.style.height = '18px';
    checkbox.style.margin = '0';
    checkbox.style.cursor = 'pointer';
    checkbox.style.accentColor = 'hsl(var(--accent))';
    
    const textSpan = document.createElement('span');
    textSpan.className = 'flex-1 outline-none';
    textSpan.textContent = selectedText || 'New task';
    textSpan.style.lineHeight = '32px';
    
    checkboxContainer.appendChild(checkbox);
    checkboxContainer.appendChild(textSpan);
    
    // Insert at cursor position
    range.deleteContents();
    range.insertNode(checkboxContainer);
    
    // Add line break after
    const br = document.createElement('br');
    checkboxContainer.parentNode?.insertBefore(br, checkboxContainer.nextSibling);
    
    // Focus on the text span
    const newRange = document.createRange();
    newRange.selectNodeContents(textSpan);
    selection.removeAllRanges();
    selection.addRange(newRange);
    
    handleContentChange();
  }, [handleContentChange]);

  const htmlToPlainText = (html: string): string => {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    // Convert checkboxes to text
    const checkboxItems = temp.querySelectorAll('.checkbox-item');
    checkboxItems.forEach(item => {
      const checkbox = item.querySelector('input[type="checkbox"]') as HTMLInputElement;
      const text = item.querySelector('span')?.textContent || '';
      const checkmark = checkbox?.checked ? '[x]' : '[ ]';
      const textNode = document.createTextNode(`${checkmark} ${text}\n`);
      item.parentNode?.replaceChild(textNode, item);
    });
    
    return temp.textContent || '';
  };

  const handleClear = useCallback(() => {
    setTitle("");
    if (contentRef.current) {
      contentRef.current.innerHTML = "";
    }
    localStorage.removeItem("note-title");
    localStorage.removeItem("note-content");
    
    // Clear file handle and filename
    setFileHandle(null);
    setCurrentFilename("");
    
    toast({
      title: "Note cleared",
      description: "All content has been removed",
    });
  }, []);

  const handleOpenFile = useCallback(async () => {
    // Try to use File System Access API first
    if ('showOpenFilePicker' in window) {
      try {
        const [handle] = await (window as any).showOpenFilePicker({
          types: [{
            description: 'HTML Files',
            accept: { 'text/html': ['.html'] }
          }],
          multiple: false
        });
        
        const file = await handle.getFile();
        const htmlContent = await file.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        
        // Extract title and content
        const savedTitle = doc.getElementById('note-title')?.getAttribute('value') || '';
        const savedContent = doc.getElementById('note-content')?.innerHTML || '';
        
        setTitle(savedTitle);
        if (contentRef.current) {
          contentRef.current.innerHTML = savedContent;
        }
        
        // Save to localStorage
        localStorage.setItem('note-title', savedTitle);
        localStorage.setItem('note-content', savedContent);
        
        // Store file handle and filename
        setFileHandle(handle);
        setCurrentFilename(file.name);
        
        toast({
          title: "Note loaded",
          description: `Opened ${file.name}`,
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Error opening file:', err);
          toast({
            title: "Error",
            description: "Could not open file",
            variant: "destructive"
          });
        }
      }
    } else {
      // Fallback to traditional file input
      fileInputRef.current?.click();
    }
  }, []);

  const handleFileLoad = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const htmlContent = e.target?.result as string;
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      
      // Extract title from the saved file
      const savedTitle = doc.getElementById('note-title')?.getAttribute('value') || '';
      setTitle(savedTitle);
      
      // Extract content from the saved file
      const savedContent = doc.getElementById('note-content')?.innerHTML || '';
      if (contentRef.current) {
        contentRef.current.innerHTML = savedContent;
      }
      
      // Save to localStorage
      localStorage.setItem('note-title', savedTitle);
      localStorage.setItem('note-content', savedContent);
      
      // Store filename (no file handle in fallback mode)
      setCurrentFilename(file.name);
      
      toast({
        title: "Note loaded",
        description: `Opened ${file.name}`,
      });
    };
    
    reader.readAsText(file);
    // Reset the input so the same file can be loaded again
    event.target.value = '';
  }, []);

  const handleSave = useCallback(async () => {
    if (!fileHandle) return;

    try {
      const content = contentRef.current?.innerHTML || '';
      
      // Create the HTML content
      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'QuickNote'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: system-ui, -apple-system, sans-serif;
      background: #fafafa;
      min-height: 100vh;
    }
    .header {
      border-bottom: 1px solid #e5e7eb;
      background: rgba(255, 255, 255, 0.5);
      backdrop-filter: blur(8px);
      padding: 16px;
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .header-content {
      max-width: 896px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .title { font-size: 18px; font-weight: 600; }
    .privacy-note {
      margin-left: auto;
      font-size: 12px;
      color: #6b7280;
    }
    .main {
      max-width: 896px;
      margin: 0 auto;
      padding: 32px 16px;
      position: relative;
    }
    .background-lines {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
    }
    .margin-line {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 1px;
      background: rgba(147, 51, 234, 0.2);
    }
    .margin-line.left { left: 16px; }
    .margin-line.right { right: 16px; }
    .ruled-lines {
      position: absolute;
      inset: 0;
      background-image: repeating-linear-gradient(transparent, transparent 31px, #e5e7eb 31px, #e5e7eb 32px);
      background-size: 100% 32px;
      background-position: 0 8px;
    }
    .content {
      position: relative;
      z-index: 1;
      padding-left: 32px;
      padding-right: 32px;
    }
    .note-title {
      font-size: 24px;
      font-weight: 600;
      border: none;
      background: transparent;
      width: 100%;
      padding: 8px 0;
      outline: none;
      margin-bottom: 24px;
    }
    .note-content {
      min-height: 60vh;
      font-size: 16px;
      line-height: 32px;
      border: none;
      background: transparent;
      outline: none;
      white-space: pre-wrap;
    }
    .checkbox-item {
      display: flex;
      align-items: center;
      gap: 8px;
      line-height: 32px;
      min-height: 32px;
    }
    .checkbox-item input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: #9333ea;
    }
    .checkbox-item input[type="checkbox"]:checked + span {
      text-decoration: line-through;
      opacity: 0.6;
    }
    [contenteditable]:empty:before {
      content: attr(data-placeholder);
      color: rgba(0, 0, 0, 0.4);
      pointer-events: none;
    }
  </style>
</head>
<body>
  <header class="header">
    <div class="header-content">
      <span class="title">📝 QuickNote</span>
      <div class="privacy-note">🔒 Stored locally on your device</div>
    </div>
  </header>
  
  <main class="main">
    <div class="background-lines">
      <div class="margin-line left"></div>
      <div class="margin-line right"></div>
      <div class="ruled-lines"></div>
    </div>
    
    <div class="content">
      <input 
        type="text" 
        id="note-title"
        class="note-title" 
        placeholder="Untitled note"
        value="${title || ''}"
      />
      <div 
        id="note-content"
        class="note-content" 
        contenteditable="true"
        data-placeholder="Start writing..."
      >${content}</div>
    </div>
  </main>
  
  <script>
    // Auto-save to localStorage
    const titleInput = document.getElementById('note-title');
    const contentDiv = document.getElementById('note-content');
    
    titleInput.addEventListener('input', () => {
      localStorage.setItem('quicknote-title', titleInput.value);
    });
    
    contentDiv.addEventListener('input', () => {
      localStorage.setItem('quicknote-content', contentDiv.innerHTML);
    });
    
    // Load from localStorage on open
    const savedTitle = localStorage.getItem('quicknote-title');
    const savedContent = localStorage.getItem('quicknote-content');
    if (savedTitle) titleInput.value = savedTitle;
    if (savedContent) contentDiv.innerHTML = savedContent;
    
    // Handle checkbox creation on Enter
    contentDiv.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        const checkboxItem = container instanceof Element 
          ? container.closest('.checkbox-item')
          : container.parentElement?.closest('.checkbox-item');
        
        if (checkboxItem) {
          e.preventDefault();
          
          const newCheckbox = document.createElement('div');
          newCheckbox.className = 'checkbox-item';
          newCheckbox.contentEditable = 'true';
          
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.contentEditable = 'false';
          
          const textSpan = document.createElement('span');
          textSpan.innerHTML = '&#8203;';
          
          newCheckbox.appendChild(checkbox);
          newCheckbox.appendChild(textSpan);
          
          checkboxItem.parentNode.insertBefore(newCheckbox, checkboxItem.nextSibling);
          
          setTimeout(() => {
            const newRange = document.createRange();
            newRange.setStart(textSpan.childNodes[0], 1);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
            textSpan.focus();
          }, 0);
        }
      }
    });
  </script>
</body>
</html>`;

      // Write to the file handle
      const writable = await fileHandle.createWritable();
      await writable.write(htmlContent);
      await writable.close();

      toast({
        title: "Saved!",
        description: `Changes saved to ${currentFilename}`,
      });
    } catch (err) {
      console.error('Error saving file:', err);
      toast({
        title: "Error",
        description: "Could not save file",
        variant: "destructive"
      });
    }
  }, [fileHandle, title, currentFilename]);

  const handleDownload = useCallback(() => {
    const filename = title.trim() 
      ? `${sanitizeFilename(title)}.html`
      : "note.html";
    
    const content = contentRef.current?.innerHTML || '';
    
    // Create self-contained HTML webapp
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'QuickNote'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: system-ui, -apple-system, sans-serif;
      background: #fafafa;
      min-height: 100vh;
    }
    .header {
      border-bottom: 1px solid #e5e7eb;
      background: rgba(255, 255, 255, 0.5);
      backdrop-filter: blur(8px);
      padding: 16px;
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .header-content {
      max-width: 896px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .title { font-size: 18px; font-weight: 600; }
    .privacy-note {
      margin-left: auto;
      font-size: 12px;
      color: #6b7280;
    }
    .main {
      max-width: 896px;
      margin: 0 auto;
      padding: 32px 16px;
      position: relative;
    }
    .background-lines {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
    }
    .margin-line {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 1px;
      background: rgba(147, 51, 234, 0.2);
    }
    .margin-line.left { left: 16px; }
    .margin-line.right { right: 16px; }
    .ruled-lines {
      position: absolute;
      inset: 0;
      background-image: repeating-linear-gradient(transparent, transparent 31px, #e5e7eb 31px, #e5e7eb 32px);
      background-size: 100% 32px;
      background-position: 0 8px;
    }
    .content {
      position: relative;
      z-index: 1;
      padding-left: 32px;
      padding-right: 32px;
    }
    .note-title {
      font-size: 24px;
      font-weight: 600;
      border: none;
      background: transparent;
      width: 100%;
      padding: 8px 0;
      outline: none;
      margin-bottom: 24px;
    }
    .note-content {
      min-height: 60vh;
      font-size: 16px;
      line-height: 32px;
      border: none;
      background: transparent;
      outline: none;
      white-space: pre-wrap;
    }
    .checkbox-item {
      display: flex;
      align-items: center;
      gap: 8px;
      line-height: 32px;
      min-height: 32px;
    }
    .checkbox-item input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: #9333ea;
    }
    .checkbox-item input[type="checkbox"]:checked + span {
      text-decoration: line-through;
      opacity: 0.6;
    }
    [contenteditable]:empty:before {
      content: attr(data-placeholder);
      color: rgba(0, 0, 0, 0.4);
      pointer-events: none;
    }
  </style>
</head>
<body>
  <header class="header">
    <div class="header-content">
      <span class="title">📝 QuickNote</span>
      <div class="privacy-note">🔒 Stored locally on your device</div>
    </div>
  </header>
  
  <main class="main">
    <div class="background-lines">
      <div class="margin-line left"></div>
      <div class="margin-line right"></div>
      <div class="ruled-lines"></div>
    </div>
    
    <div class="content">
      <input 
        type="text" 
        id="note-title"
        class="note-title" 
        placeholder="Untitled note"
        value="${title || ''}"
      />
      <div 
        id="note-content"
        class="note-content" 
        contenteditable="true"
        data-placeholder="Start writing..."
      >${content}</div>
    </div>
  </main>
  
  <script>
    // Auto-save to localStorage
    const titleInput = document.getElementById('note-title');
    const contentDiv = document.getElementById('note-content');
    
    titleInput.addEventListener('input', () => {
      localStorage.setItem('quicknote-title', titleInput.value);
    });
    
    contentDiv.addEventListener('input', () => {
      localStorage.setItem('quicknote-content', contentDiv.innerHTML);
    });
    
    // Load from localStorage on open
    const savedTitle = localStorage.getItem('quicknote-title');
    const savedContent = localStorage.getItem('quicknote-content');
    if (savedTitle) titleInput.value = savedTitle;
    if (savedContent) contentDiv.innerHTML = savedContent;
    
    // Handle checkbox creation on Enter
    contentDiv.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        const checkboxItem = container instanceof Element 
          ? container.closest('.checkbox-item')
          : container.parentElement?.closest('.checkbox-item');
        
        if (checkboxItem) {
          e.preventDefault();
          
          const newCheckbox = document.createElement('div');
          newCheckbox.className = 'checkbox-item';
          newCheckbox.contentEditable = 'true';
          
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.contentEditable = 'false';
          
          const textSpan = document.createElement('span');
          textSpan.innerHTML = '&#8203;';
          
          newCheckbox.appendChild(checkbox);
          newCheckbox.appendChild(textSpan);
          
          checkboxItem.parentNode.insertBefore(newCheckbox, checkboxItem.nextSibling);
          
          setTimeout(() => {
            const newRange = document.createRange();
            newRange.setStart(textSpan.childNodes[0], 1);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
            textSpan.focus();
          }, 0);
        }
      }
    });
  </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: "text/html" });
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
      description: `Saved as ${filename} - opens as editable webapp`,
    });
  }, [title]);

  // Keyboard shortcuts and special handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "s") {
          e.preventDefault();
          handleDownload();
        } else if (e.key === "b") {
          e.preventDefault();
          handleFormat('bold');
        } else if (e.key === "i") {
          e.preventDefault();
          handleFormat('italic');
        }
        return;
      }

      // Handle Enter key inside checkbox items
      if (e.key === "Enter" && contentRef.current?.contains(document.activeElement)) {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        
        // Find if we're inside a checkbox item
        let checkboxItem = container instanceof Element 
          ? container.closest('.checkbox-item')
          : (container.parentElement?.closest('.checkbox-item'));

        if (checkboxItem) {
          e.preventDefault();
          
          // Create new checkbox item
          const newCheckbox = document.createElement('div');
          newCheckbox.className = 'checkbox-item flex items-center gap-2';
          newCheckbox.contentEditable = 'true';
          
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.className = 'flex-shrink-0';
          checkbox.contentEditable = 'false';
          checkbox.style.width = '18px';
          checkbox.style.height = '18px';
          checkbox.style.margin = '0';
          checkbox.style.cursor = 'pointer';
          checkbox.style.accentColor = 'hsl(var(--accent))';
          
          const textSpan = document.createElement('span');
          textSpan.className = 'flex-1 outline-none';
          textSpan.innerHTML = '&#8203;'; // Zero-width space to ensure cursor positioning
          textSpan.style.lineHeight = '32px';
          
          newCheckbox.appendChild(checkbox);
          newCheckbox.appendChild(textSpan);
          
          // Insert after current checkbox item
          const nextElement = checkboxItem.nextSibling;
          if (nextElement && nextElement.nodeName === 'BR') {
            nextElement.parentNode?.insertBefore(newCheckbox, nextElement);
          } else {
            checkboxItem.parentNode?.insertBefore(newCheckbox, checkboxItem.nextSibling);
          }
          
          // Position cursor immediately to the right of checkbox in the text span
          setTimeout(() => {
            const newRange = document.createRange();
            newRange.setStart(textSpan.childNodes[0], 1);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
            textSpan.focus();
          }, 0);
          
          handleContentChange();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleDownload, handleFormat, handleContentChange]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-3">
          <FileText className="w-6 h-6 text-accent" />
          <h1 className="text-lg font-semibold text-foreground">QuickNote</h1>
          <div className="ml-auto text-xs text-muted-foreground hidden sm:block">
            🔒 Stored locally on your device
          </div>
        </div>
      </header>

      {/* Hidden file input for opening files */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".html"
        onChange={handleFileLoad}
        className="hidden"
      />

      {/* Formatting Toolbar */}
      <FormattingToolbar 
        onFormat={handleFormat}
        onInsertCheckbox={handleInsertCheckbox}
        onDownload={handleDownload}
        onSave={handleSave}
        onClear={handleClear}
        onOpenFile={handleOpenFile}
        hasOpenFile={!!fileHandle}
        currentFilename={currentFilename}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        {/* Notebook Background with Ruled Lines */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Left Margin Line */}
          <div className="absolute left-4 sm:left-6 lg:left-8 top-0 bottom-0 w-px bg-accent/20" />
          
          {/* Right Margin Line */}
          <div className="absolute right-4 sm:right-6 lg:right-8 top-0 bottom-0 w-px bg-accent/20" />
          
          {/* Horizontal Ruled Lines */}
          <div 
            className="absolute inset-0" 
            style={{
              backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, hsl(var(--border)) 31px, hsl(var(--border)) 32px)',
              backgroundSize: '100% 32px',
              backgroundPosition: '0 8px'
            }}
          />
        </div>

        <div className="space-y-6 relative z-10">
          {/* Title Input */}
          <div className="pl-8 sm:pl-10 lg:pl-12">
            <Input
              type="text"
              placeholder="Untitled note"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-2xl sm:text-3xl font-semibold border-none bg-transparent px-0 focus-visible:ring-0 placeholder:text-muted-foreground/40"
            />
          </div>

          {/* Content Editor */}
          <div
            ref={contentRef}
            contentEditable
            onInput={handleContentChange}
            className="min-h-[60vh] text-base sm:text-lg leading-8 border-none bg-transparent pl-8 sm:pl-10 lg:pl-12 pr-8 sm:pr-10 lg:pr-12 outline-none"
            style={{ 
              whiteSpace: 'pre-wrap',
              lineHeight: '32px'
            }}
            data-placeholder="Start writing..."
          />
        </div>
      </main>

      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground) / 0.4);
          pointer-events: none;
        }
        
        .checkbox-item {
          display: flex;
          align-items: center;
          gap: 8px;
          line-height: 32px;
          min-height: 32px;
          outline: none;
        }
        
        .checkbox-item input[type="checkbox"] {
          flex-shrink: 0;
          width: 18px;
          height: 18px;
          margin: 0;
          cursor: pointer;
          pointer-events: auto;
          accent-color: hsl(var(--accent));
        }
        
        .checkbox-item span {
          flex: 1;
          outline: none;
          line-height: 32px;
        }
        
        .checkbox-item input[type="checkbox"]:checked + span {
          text-decoration: line-through;
          opacity: 0.6;
        }
      `}</style>
    </div>
  );
};

export default Index;
