import { useState } from "react";
import { Bell, Check, Phone, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

type ApprovalRequest = {
  id: string;
  recipient: string;
  group: string;
  hospital: string;
  urgency: "Normal" | "Urgent" | "Emergency";
  askedAgo: string;
  message: string;
};

const INITIAL_REQUESTS: ApprovalRequest[] = [
  {
    id: "r1",
    recipient: "Sabbir Hossain",
    group: "O-",
    hospital: "Square Hospital, Panthapath",
    urgency: "Emergency",
    askedAgo: "2 min ago",
    message: "Surgery scheduled tonight, need 2 units urgently.",
  },
  {
    id: "r2",
    recipient: "Rehana Begum",
    group: "O-",
    hospital: "Dhaka Medical College Hospital",
    urgency: "Urgent",
    askedAgo: "26 min ago",
    message: "Thalassemia transfusion for my daughter.",
  },
  {
    id: "r3",
    recipient: "Arif Mahmud",
    group: "O+",
    hospital: "United Hospital, Gulshan",
    urgency: "Normal",
    askedAgo: "3 hours ago",
    message: "Planned procedure next week — building a standby list.",
  },
];

const INITIAL_FEED = [
  { id: "f1", text: "Your contact request was approved by John Doe", time: "just now" },
  { id: "f2", text: "Ayesha Rahman marked herself Available", time: "12 min ago" },
  { id: "f3", text: "Emergency O- request near Dhanmondi was fulfilled", time: "1 hour ago" },
  { id: "f4", text: "Your donor profile passed medical verification", time: "yesterday" },
];

export function NotificationHub() {
  const [requests, setRequests] = useState(INITIAL_REQUESTS);
  const [feed, setFeed] = useState(INITIAL_FEED);

  const resolve = (req: ApprovalRequest, approved: boolean) => {
    setRequests((rs) => rs.filter((r) => r.id !== req.id));
    setFeed((f) => [
      {
        id: `${req.id}-${approved ? "a" : "d"}`,
        text: approved
          ? `You approved phone access for ${req.recipient}`
          : `You declined the contact request from ${req.recipient}`,
        time: "just now",
      },
      ...f,
    ]);
    toast.success(approved ? `Phone access shared with ${req.recipient}` : "Request declined");
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          aria-label="Notifications and contact approvals"
          className="relative rounded-md p-2 transition-colors hover:bg-primary-glow/40"
        >
          <Bell className="size-5" />
          {requests.length > 0 && (
            <span className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-background text-[10px] font-bold text-primary">
              {requests.length}
            </span>
          )}
        </button>
      </SheetTrigger>

      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Notifications</SheetTitle>
          <SheetDescription>
            Approve or decline contact requests — your phone number stays private until you approve.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Pending contact approvals</h3>
            <Badge variant="secondary">{requests.length}</Badge>
          </div>

          {requests.length === 0 && (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No pending requests right now.
            </p>
          )}

          {requests.map((r) => (
            <div key={r.id} className="space-y-3 rounded-lg border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{r.recipient}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.hospital} · {r.askedAgo}
                  </p>
                </div>
                <Badge variant={r.urgency === "Emergency" ? "destructive" : "secondary"}>
                  {r.group} · {r.urgency}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{r.message}</p>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={() => resolve(r, true)}>
                  <Phone /> Approve Phone Access
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => resolve(r, false)}
                >
                  <X /> Decline
                </Button>
              </div>
            </div>
          ))}

          <Separator />

          <h3 className="text-sm font-semibold">Activity feed</h3>
          <ul className="space-y-3">
            {feed.map((f) => (
              <li key={f.id} className="flex gap-3 text-sm">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Check className="size-3.5 text-muted-foreground" />
                </span>
                <span>
                  {f.text}
                  <span className="block text-xs text-muted-foreground">{f.time}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
}
