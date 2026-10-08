import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Link2, Link2Off } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  shareToken: string | null;
  onCreate: () => Promise<void>;
  onRevoke: () => Promise<void>;
}

export function shareUrl(token: string) {
  return `${window.location.origin}/s/${token}`;
}

export function ShareDialog({ open, onOpenChange, shareToken, onCreate, onRevoke }: Props) {
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } catch (e) {
      toast({ title: "Errore", description: e instanceof Error ? e.message : "Riprova", variant: "destructive" });
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Condividi nota</DialogTitle>
          <DialogDescription>
            {shareToken
              ? "Chiunque abbia questo link può vedere e modificare la nota."
              : "La nota è privata e salvata solo su questo dispositivo. Creando un link verrà salvata online e chi ha il link potrà vederla e modificarla."}
          </DialogDescription>
        </DialogHeader>
        {shareToken ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input readOnly value={shareUrl(shareToken)} onFocus={(e) => e.target.select()} />
              <Button
                size="icon"
                variant="outline"
                onClick={async () => {
                  await navigator.clipboard.writeText(shareUrl(shareToken));
                  toast({ title: "Link copiato" });
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="destructive" className="w-full" disabled={busy} onClick={() => run(onRevoke)}>
              <Link2Off className="h-4 w-4 mr-2" /> Disattiva condivisione
            </Button>
            <p className="text-xs text-muted-foreground">
              Disattivando, la copia online viene eliminata e il link smette di funzionare. La nota resta sul tuo dispositivo.
            </p>
          </div>
        ) : (
          <Button className="w-full" disabled={busy} onClick={() => run(onCreate)}>
            <Link2 className="h-4 w-4 mr-2" /> Crea link di condivisione
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
