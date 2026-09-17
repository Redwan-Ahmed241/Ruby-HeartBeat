import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShieldAlert, ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import { CANONICAL_BLOOD_GROUPS, toApiBloodGroup, type RequestUrgency } from "@/lib/api/types";
import { formatBloodGroup } from "@/lib/formatters";
import { useRequestBloodBankContact } from "@/hooks/useBloodBanks";

export interface BloodBankInfo {
  id: string;
  name: string;
  area: string;
  address: string;
  phone: string;
  emergencyHotline: string;
  type: string;
}

interface ContactBloodBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  bloodBank: BloodBankInfo | null;
  onSuccess: (bankId: string) => void;
}

const COMPONENTS = [
  { label: "Whole Blood", value: "WHOLE_BLOOD" },
  { label: "Platelets (Random / Single Donor)", value: "PLATELETS" },
  { label: "Fresh Frozen Plasma (FFP)", value: "PLASMA" },
  { label: "Packed Red Blood Cells (PRBC)", value: "PACKED_RED_CELLS" },
];

const URGENCY_OPTIONS: { label: string; value: RequestUrgency; desc: string; badgeClass: string }[] = [
  {
    label: "Normal",
    value: "NORMAL",
    desc: "Routine reserve allocation (24-48 hours)",
    badgeClass: "border-slate-300 text-slate-700 dark:text-slate-300",
  },
  {
    label: "Urgent",
    value: "URGENT",
    desc: "Needed within 4-12 hours",
    badgeClass: "border-amber-500 text-amber-700 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-950/20",
  },
  {
    label: "Emergency",
    value: "EMERGENCY",
    desc: "Immediate surgery / critical trauma priority",
    badgeClass: "border-destructive text-destructive bg-destructive/10 font-bold",
  },
];

export function ContactBloodBankModal({
  isOpen,
  onClose,
  bloodBank,
  onSuccess,
}: ContactBloodBankModalProps) {
  const [bloodGroup, setBloodGroup] = useState<string>("O+");
  const [component, setComponent] = useState<string>("WHOLE_BLOOD");
  const [urgency, setUrgency] = useState<RequestUrgency>("EMERGENCY");
  const [note, setNote] = useState<string>("");

  const requestContactMutation = useRequestBloodBankContact();

  if (!bloodBank) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bloodBank) return;

    try {
      await requestContactMutation.mutateAsync({
        bankId: bloodBank.id,
        payload: {
          blood_group: toApiBloodGroup(bloodGroup),
          urgency,
          component,
          note: note.trim() || undefined,
        },
      });

      onSuccess(bloodBank.id);
      onClose();
      // Reset form
      setNote("");
      setUrgency("EMERGENCY");
    } catch {
      // Handled in mutation hook with resilient fallback
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden border-border/80 shadow-2xl">
        <DialogHeader className="p-6 pb-4 bg-muted/30 border-b border-border/60">
          <div className="flex items-center gap-2.5 text-[#800000] dark:text-red-400 mb-1">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[#800000]/10 dark:bg-[#800000]/30 text-[#800000] dark:text-red-300">
              <ShieldCheck className="size-5" />
            </div>
            <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
              Request Contact Access
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm font-medium text-foreground/80">
            {bloodBank.name} · <span className="text-muted-foreground">{bloodBank.area}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Privacy Notice Alert */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-start gap-3 text-xs leading-relaxed text-amber-900 dark:text-amber-200">
            <ShieldAlert className="size-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <p>
              To safeguard donor privacy and streamline urgent allocations, blood banks require mutual
              authorization. Submitting this request sends an instant in-app notification and priority
              alert to the blood bank administration to release direct contact coordinates.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Required Blood Group */}
            <div className="space-y-1.5">
              <Label htmlFor="req-blood-group" className="text-xs font-semibold">
                Required Blood Group
              </Label>
              <Select value={bloodGroup} onValueChange={setBloodGroup}>
                <SelectTrigger id="req-blood-group" className="h-10 rounded-xl">
                  <SelectValue placeholder="Select Blood Group" />
                </SelectTrigger>
                <SelectContent>
                  {CANONICAL_BLOOD_GROUPS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {formatBloodGroup(g, "symbol")} ({formatBloodGroup(g, "full")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Required Blood Component */}
            <div className="space-y-1.5">
              <Label htmlFor="req-component" className="text-xs font-semibold">
                Blood Component
              </Label>
              <Select value={component} onValueChange={setComponent}>
                <SelectTrigger id="req-component" className="h-10 rounded-xl">
                  <SelectValue placeholder="Select Component" />
                </SelectTrigger>
                <SelectContent>
                  {COMPONENTS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Urgency Level Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold flex items-center justify-between">
              <span>Urgency Level</span>
              {urgency === "EMERGENCY" && (
                <span className="text-[11px] text-destructive font-bold flex items-center gap-1">
                  <AlertCircle className="size-3" /> Priority Hotline Trigger
                </span>
              )}
            </Label>
            <div className="grid grid-cols-3 gap-2.5">
              {URGENCY_OPTIONS.map((opt) => {
                const isSelected = urgency === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setUrgency(opt.value)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? "border-[#800000] bg-[#800000]/10 dark:bg-[#800000]/25 ring-1 ring-[#800000]"
                        : "border-border/80 bg-card hover:bg-muted/50"
                    }`}
                  >
                    <span
                      className={`text-xs font-bold ${
                        isSelected ? "text-[#800000] dark:text-red-300" : "text-foreground"
                      }`}
                    >
                      {opt.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-1 line-clamp-2 leading-tight">
                      {opt.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Clinical Note / Message */}
          <div className="space-y-1.5">
            <Label htmlFor="req-note" className="text-xs font-semibold">
              Message / Clinical Note <span className="text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <Textarea
              id="req-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Specify hospital cabin, patient condition, or required units..."
              rows={3}
              className="rounded-xl resize-none text-sm placeholder:text-muted-foreground/70"
            />
          </div>

          <DialogFooter className="pt-2 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={requestContactMutation.isPending}
              className="w-full sm:w-auto rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={requestContactMutation.isPending}
              className="w-full sm:w-auto rounded-xl bg-[#800000] text-white hover:bg-[#600000] font-semibold gap-2 shadow-sm transition-all"
            >
              {requestContactMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Dispatching Request...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="size-4" />
                  <span>Send Authorization Request</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
