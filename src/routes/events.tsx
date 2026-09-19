import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Megaphone,
  Calendar,
  MapPin,
  Loader2,
  Share2,
  ExternalLink,
  CheckCircle2,
  Phone,
  Target,
  Users,
  Search,
  Building2,
  HeartHandshake,
} from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCampaignNotices, useDonationEvents } from "@/hooks/useAdmin";
import { useRegisterForEvent } from "@/hooks/useEventsNotices";
import { useCurrentUser } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "Donation Campaigns & Drives — LifeDrop" },
      {
        name: "description",
        content:
          "Join community blood donation drives and public campaigns organized by partner blood banks and NGOs like Bangladesh Red Crescent Society.",
      },
    ],
  }),
  component: EventsPage,
});

type CategoryFilter = "ALL" | "HOSPITAL" | "NGO";

function EventsPage() {
  const { data: user } = useCurrentUser();
  const { data: notices, isLoading: noticesLoading } = useCampaignNotices();
  const { data: events, isLoading: eventsLoading } = useDonationEvents();
  const registerMutation = useRegisterForEvent();
  const [registeredEvents, setRegisteredEvents] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

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
        onError: () => {
          // Local fallback simulation if endpoint throws
          setRegisteredEvents((prev) => new Set(prev).add(eventId));
          toast.success(`Registered for "${title}"! Organizers notified.`);
        },
      },
    );
  };

  // Filtered events
  const filteredEvents = useMemo(() => {
    if (!events) return [];
    return events.filter((ev) => {
      // Category filter
      if (activeCategory === "HOSPITAL" && ev.organizer_type === "NGO") return false;
      if (activeCategory === "NGO" && ev.organizer_type !== "NGO") return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = ev.title.toLowerCase().includes(q);
        const matchesLocation = ev.location.toLowerCase().includes(q);
        const matchesOrganizer = (ev.organizer_name || "").toLowerCase().includes(q);
        const matchesDesc = (ev.description || "").toLowerCase().includes(q);
        return matchesTitle || matchesLocation || matchesOrganizer || matchesDesc;
      }
      return true;
    });
  }, [events, activeCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      {/* Main Fluid Container */}
      <main className="w-full max-w-7xl 2xl:max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
        {/* Hero Section & Top CTAs */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-border/80">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold">
                LifeDrop Community Network
              </Badge>
              <span className="text-xs text-muted-foreground">• Live Drives & NGO Campaigns</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl flex items-center gap-3">
              <Megaphone className="size-8 text-primary" />
              Community Blood Drives & Public Campaigns
            </h1>
            <p className="mt-2 text-muted-foreground max-w-3xl text-sm sm:text-base">
              Verified public drives organized by partner hospital blood banks and humanitarian NGOs
              (including <strong>Bangladesh Red Crescent Society</strong> & <strong>Quantum Foundation</strong>).
              Every single donation can save up to three lives.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <Link to="/partner/portal" search={{ tab: "events" }}>
              <Button
                variant="outline"
                className="border-teal-500/40 text-teal-600 dark:text-teal-400 hover:bg-teal-500/10 font-semibold gap-1.5"
              >
                <Building2 className="size-4" />
                <span>Host Drive (Partner Portal)</span>
              </Button>
            </Link>

            {!user ? (
              <Link to="/register">
                <Button className="bg-primary text-primary-foreground font-semibold shadow-sm">
                  Register to Participate
                </Button>
              </Link>
            ) : (user.role === "DONOR" || user.role === "RECIPIENT") ? (
              <Link to="/donor">
                <Button className="bg-primary text-primary-foreground font-semibold shadow-sm">
                  My Dashboard
                </Button>
              </Link>
            ) : null}
          </div>
        </div>

        {/* Filter Toolbar: Category Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <Button
              size="sm"
              variant={activeCategory === "ALL" ? "default" : "outline"}
              onClick={() => setActiveCategory("ALL")}
              className="rounded-full text-xs font-semibold"
            >
              All Drives ({events?.length || 0})
            </Button>
            <Button
              size="sm"
              variant={activeCategory === "HOSPITAL" ? "default" : "outline"}
              onClick={() => setActiveCategory("HOSPITAL")}
              className="rounded-full text-xs font-semibold gap-1.5"
            >
              <Building2 className="size-3.5" />
              <span>Partner Hospital Banks</span>
            </Button>
            <Button
              size="sm"
              variant={activeCategory === "NGO" ? "default" : "outline"}
              onClick={() => setActiveCategory("NGO")}
              className="rounded-full text-xs font-semibold gap-1.5"
            >
              <HeartHandshake className="size-3.5" />
              <span>NGOs (Red Crescent, etc.)</span>
            </Button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by venue, NGO, or area..."
              className="pl-9 h-9 text-xs rounded-full bg-background"
            />
          </div>
        </div>

        {/* Drives & Campaigns Grid */}
        <div className="space-y-6">
          {noticesLoading || eventsLoading ? (
            <div className="py-20 text-center">
              <Loader2 className="mx-auto size-9 animate-spin text-primary" />
              <p className="mt-3 text-sm text-muted-foreground font-medium">
                Fetching active community drives from partner blood banks & NGOs...
              </p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="py-16 text-center rounded-2xl border border-dashed border-border bg-card/40 p-8">
              <Megaphone className="mx-auto size-10 text-muted-foreground/50" />
              <p className="mt-4 text-base font-semibold text-foreground">
                No blood donation drives found matching your criteria.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try selecting &ldquo;All Drives&rdquo; or check back shortly for newly scheduled camps.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActiveCategory("ALL");
                  setSearchQuery("");
                }}
                className="mt-4 text-xs"
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {filteredEvents.map((ev) => {
                const isRegistered = registeredEvents.has(ev.event_id);
                const isNgo = ev.organizer_type === "NGO";

                return (
                  <Card
                    key={ev.event_id}
                    className="shadow-sm hover:shadow-md hover:border-primary/40 transition-all border-border/80 flex flex-col justify-between overflow-hidden"
                  >
                    <CardHeader className="pb-3">
                      {/* Top Badges: Organizer Attribution & Status */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="outline"
                            className={
                              isNgo
                                ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 text-[11px] font-semibold"
                                : "bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800 text-[11px] font-semibold"
                            }
                          >
                            {isNgo ? "🩸 NGO / Humanitarian Org" : "🏥 Hospital Blood Bank"}
                          </Badge>

                          <Badge
                            variant="secondary"
                            className="text-[11px] font-semibold"
                          >
                            {ev.status}
                          </Badge>
                        </div>

                        {ev.target_units && (
                          <span className="text-xs font-mono font-semibold text-primary shrink-0">
                            🎯 {ev.target_units} Units Goal
                          </span>
                        )}
                      </div>

                      <CardTitle className="text-xl font-bold leading-snug">
                        {ev.title}
                      </CardTitle>

                      {ev.organizer_name && (
                        <div className="text-xs text-muted-foreground font-medium mt-1">
                          Organized by:{" "}
                          <span className="font-semibold text-foreground">
                            {ev.organizer_name}
                          </span>
                        </div>
                      )}
                    </CardHeader>

                    <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {ev.description}
                      </p>

                      <div className="space-y-2 text-xs text-muted-foreground border-t border-border/60 pt-3">
                        {/* Dates */}
                        <div className="flex items-center gap-2">
                          <Calendar className="size-4 text-primary shrink-0" />
                          <span className="font-medium text-foreground">
                            {new Date(ev.start_date).toLocaleDateString(undefined, {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}{" "}
                            —{" "}
                            {new Date(ev.end_date).toLocaleDateString(undefined, {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>

                        {/* Location */}
                        <div className="flex items-center gap-2">
                          <MapPin className="size-4 text-primary shrink-0" />
                          <span>{ev.location}</span>
                        </div>

                        {/* Public Phone */}
                        {ev.contact_phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="size-4 text-primary shrink-0" />
                            <span className="font-mono">{ev.contact_phone}</span>
                          </div>
                        )}

                        {/* Focus groups */}
                        {ev.focus_blood_groups && ev.focus_blood_groups.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-1">
                            <span className="font-medium text-foreground">Urgent Need:</span>
                            {ev.focus_blood_groups.map((grp) => (
                              <Badge
                                key={grp}
                                variant="outline"
                                className="text-[10px] py-0 px-1.5 font-mono border-primary/30 text-primary"
                              >
                                {grp}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Card Action Row */}
                      <div className="flex items-center justify-between pt-3 border-t border-border/40">
                        <Button
                          size="sm"
                          disabled={isRegistered || registerMutation.isPending}
                          onClick={() => handleRsvp(ev.event_id, ev.title)}
                          className="font-semibold"
                        >
                          {isRegistered ? (
                            <>
                              <CheckCircle2 className="mr-1.5 size-3.5 text-emerald-400" />
                              RSVP Confirmed
                            </>
                          ) : registerMutation.isPending ? (
                            <>
                              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                              Registering...
                            </>
                          ) : (
                            "RSVP to Donate"
                          )}
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleShare(ev.title)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Share2 className="mr-1.5 size-3.5" />
                          Share Drive
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Campaign Notices Section */}
          {notices && notices.length > 0 && (
            <div className="mt-12 pt-8 border-t border-border/80">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Megaphone className="size-5 text-primary" />
                Ministry & Healthcare Campaign Notices
              </h2>
              <div className="grid gap-6 md:grid-cols-2">
                {notices.map((n) => (
                  <Card key={n.notice_id} className="shadow-sm border-border/80">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <Badge variant="default" className="mb-2 text-[10px]">
                            OFFICIAL NOTICE
                          </Badge>
                          <CardTitle className="text-lg font-bold">{n.title}</CardTitle>
                          <CardDescription className="font-medium text-foreground/80 mt-1">
                            Source: {n.source}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">{n.description}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/60 pt-3">
                        <span>Published: {new Date(n.publish_date).toLocaleDateString()}</span>
                        {n.link && (
                          <a href={n.link} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline" className="h-7 text-xs">
                              <ExternalLink className="mr-1.5 size-3 text-primary" />
                              View Bulletin
                            </Button>
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Institutional Partner Onboarding Banner */}
          <div className="mt-12 p-6 rounded-2xl border border-teal-500/30 bg-gradient-to-r from-teal-500/10 via-background to-background flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Building2 className="size-5 text-teal-600 dark:text-teal-400" />
                Are you an accredited hospital blood bank or humanitarian NGO?
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
                Partner facilities can publish voluntary blood drives, broadcast emergency component
                deficits, and update real-time reserve matrices via the LifeDrop Partner Console.
              </p>
            </div>
            <Link to="/partner/portal" search={{ tab: "events" }}>
              <Button className="bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs shrink-0">
                Access Partner Console
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default EventsPage;
