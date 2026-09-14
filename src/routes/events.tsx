import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Megaphone,
  Calendar,
  MapPin,
  Clock,
  Sparkles,
  Users,
  ShieldCheck,
  Loader2,
  Share2,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCampaignNotices, useDonationEvents } from "@/hooks/useAdmin";
import { useRegisterForEvent } from "@/hooks/useAppointmentsEventsNotices";
import { useCurrentUser } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "Donation Campaigns & Drives — LifeDrop" },
      {
        name: "description",
        content: "Join community blood donation drives and public healthcare campaigns.",
      },
    ],
  }),
  component: EventsPage,
});

function EventsPage() {
  const { data: user } = useCurrentUser();
  const { data: notices, isLoading: noticesLoading } = useCampaignNotices();
  const { data: events, isLoading: eventsLoading } = useDonationEvents();
  const registerMutation = useRegisterForEvent();
  const [registeredEvents, setRegisteredEvents] = useState<Set<string>>(new Set());

  const handleShare = (title: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success(`Share link copied for: ${title}`);
    }
  };

  const handleRsvp = (eventId: string, title: string) => {
    if (!user) {
      toast.error("Please sign in to register for events.");
      return;
    }
    registerMutation.mutate(
      { eventId, payload: { role: "PARTICIPANT" } },
      {
        onSuccess: () => {
          setRegisteredEvents((prev) => new Set(prev).add(eventId));
          toast.success(`Successfully registered for "${title}"!`);
        },
      },
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl flex items-center gap-2">
              <Megaphone className="size-8 text-primary" />
              Upcoming Campaigns & Blood Drives
            </h1>
            <p className="mt-2 text-muted-foreground max-w-2xl">
              Public drives organized by verified hospital networks and the Ministry of Health.
              Every donation saves up to three lives.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!user ? (
              <Link to="/register" search={{ role: "DONOR" }}>
                <Button>Become a Registered Donor</Button>
              </Link>
            ) : user.role === "DONOR" ? (
              <Link to="/donor">
                <Button>View My Donor Dashboard</Button>
              </Link>
            ) : null}
          </div>
        </div>

        {/* Live Notices List */}
        <div className="mt-8 space-y-6">
          {noticesLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="mx-auto size-8 animate-spin text-primary" />
              <p className="mt-3 text-sm text-muted-foreground">Loading active campaigns...</p>
            </div>
          ) : !notices || notices.length === 0 ? (
            /* Fallback default sample drives when backend notices are empty */
            <div className="grid gap-6 md:grid-cols-2">
              {[
                {
                  title: "National Emergency Monsoon Blood Drive 2026",
                  org: "Red Crescent Society & Central Blood Bank",
                  date: "September 20-22, 2026",
                  time: "9:00 AM - 5:00 PM Daily",
                  venue: "Dhaka University Gymnasium Complex, Nilkhet",
                  urgency: "HIGH PRIORITY",
                  desc: "Urgent drive to replenish O-negative, B-negative, and Platelet stocks for monsoon crisis response across tertiary hospitals.",
                  target: "500 Bags Target",
                },
                {
                  title: "LifeDrop University Campus Drive",
                  org: "BRAC University Health & Wellness Club",
                  date: "September 28, 2026",
                  time: "10:00 AM - 4:00 PM",
                  venue: "BRAC University Merul Badda Campus, Dhaka",
                  urgency: "COMMUNITY",
                  desc: "Open to students, faculty, and public donors. Free preliminary blood screening, hemoglobin testing, and donor card issuance.",
                  target: "250 Bags Target",
                },
                {
                  title: "Pediatric Thalassemia Support Campaign",
                  org: "Bangladesh Thalassemia Foundation",
                  date: "October 05, 2026",
                  time: "9:30 AM - 3:30 PM",
                  venue: "Square Hospital Blood Center Auditorium, Panthapath",
                  urgency: "SPECIALIZED",
                  desc: "Regular quarterly donation camp specifically supporting 80+ pediatric thalassemia patients requiring scheduled transfusions.",
                  target: "150 Bags Target",
                },
              ].map((campaign, idx) => (
                <Card
                  key={idx}
                  className="shadow-[var(--shadow-elegant)] hover:border-primary/50 transition-colors"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Badge
                          variant="outline"
                          className="mb-2 text-xs font-semibold text-primary border-primary"
                        >
                          {campaign.urgency}
                        </Badge>
                        <CardTitle className="text-xl font-bold">{campaign.title}</CardTitle>
                        <CardDescription className="font-medium text-foreground/80 mt-1">
                          {campaign.org}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">{campaign.target}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">{campaign.desc}</p>
                    <div className="space-y-2 text-xs text-muted-foreground border-t border-border/60 pt-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="size-4 text-primary" />
                        <span className="font-medium text-foreground">{campaign.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="size-4 text-primary" />
                        <span>{campaign.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="size-4 text-primary" />
                        <span>{campaign.venue}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <Button size="sm" onClick={() => handleRsvp("", campaign.title)}>
                        RSVP / Pledge Donation
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleShare(campaign.title)}>
                        <Share2 className="mr-1.5 size-3.5" /> Share
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-8">
              {/* Live Events from GET /api/v1/events/ */}
              {events && events.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Calendar className="size-5 text-primary" /> Donation Events
                  </h2>
                  <div className="grid gap-6 md:grid-cols-2">
                    {events.map((ev) => {
                      const isRegistered = registeredEvents.has(ev.event_id);
                      return (
                        <Card key={ev.event_id} className="shadow-[var(--shadow-elegant)] hover:border-primary/50 transition-colors">
                          <CardHeader>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <Badge variant="outline" className="mb-2 text-xs font-semibold text-primary border-primary">
                                  {ev.status}
                                </Badge>
                                <CardTitle className="text-xl font-bold">{ev.title}</CardTitle>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground">{ev.description}</p>
                            <div className="space-y-2 text-xs text-muted-foreground border-t border-border/60 pt-3">
                              <div className="flex items-center gap-2">
                                <Calendar className="size-4 text-primary" />
                                <span className="font-medium text-foreground">
                                  {new Date(ev.start_date).toLocaleDateString()} — {new Date(ev.end_date).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="size-4 text-primary" />
                                <span>{ev.location}</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between pt-2">
                              <Button
                                size="sm"
                                disabled={isRegistered || registerMutation.isPending}
                                onClick={() => handleRsvp(ev.event_id, ev.title)}
                              >
                                {isRegistered ? (
                                  <><CheckCircle2 className="mr-1.5 size-3.5" /> Registered</>
                                ) : registerMutation.isPending ? (
                                  <><Loader2 className="mr-1.5 size-3.5 animate-spin" /> Registering...</>
                                ) : (
                                  "Register Now"
                                )}
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleShare(ev.title)}>
                                <Share2 className="mr-1.5 size-3.5" /> Share
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Campaign Notices with Source Attribution */}
              {notices && notices.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Megaphone className="size-5 text-primary" /> Campaign Notices
                  </h2>
                  <div className="grid gap-6 md:grid-cols-2">
                    {notices.map((n) => (
                      <Card key={n.notice_id} className="shadow-[var(--shadow-elegant)]">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <Badge variant="default" className="mb-2">NOTICE</Badge>
                              <CardTitle className="text-xl">{n.title}</CardTitle>
                              <CardDescription className="font-medium text-foreground/80 mt-1">
                                {n.source}
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p className="text-sm text-muted-foreground">{n.description}</p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
                            <span>Published: {new Date(n.publish_date).toLocaleDateString()}</span>
                            <div className="flex gap-2">
                              {n.link && (
                                <a href={n.link} target="_blank" rel="noopener noreferrer">
                                  <Button size="sm" variant="outline">
                                    <ExternalLink className="mr-1.5 size-3.5" /> View Source
                                  </Button>
                                </a>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
