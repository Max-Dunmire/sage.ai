import { useState, useEffect, useRef } from "react";
import { Calendar as CalendarIcon, Clock, MapPin, Video, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  location?: string;
  description?: string;
  hangoutLink?: string;
  attendees?: Array<{ email: string; displayName?: string }>;
  colorId?: string;
}

interface GoogleCalendarProps {
  isActive?: boolean;
}

const GoogleCalendar = ({ isActive = false }: GoogleCalendarProps) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [error, setError] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const previousEventIds = useRef<Set<string>>(new Set());

  const API_BASE_URL = "http://localhost:3001";

  // Fetch calendar events from backend
  const fetchEvents = async () => {
    try {
      setError("");

      const timeMin = new Date();
      timeMin.setHours(0, 0, 0, 0);
      const timeMax = new Date();
      timeMax.setDate(timeMax.getDate() + 30);

      const response = await fetch(
        `${API_BASE_URL}/api/calendar/events?` +
        new URLSearchParams({
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          maxResults: '50',
        })
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch calendar events');
      }

      const data = await response.json();
      if (data.success) {
        const newEvents = data.events || [];

        // Check for new events and show notifications
        if (previousEventIds.current.size > 0) {
          newEvents.forEach((event: CalendarEvent) => {
            if (!previousEventIds.current.has(event.id)) {
              // New event detected!
              const eventDate = new Date(event.start.dateTime || event.start.date || '');
              const formattedDate = eventDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: event.start.dateTime ? 'numeric' : undefined,
                minute: event.start.dateTime ? '2-digit' : undefined,
              });

              toast.success('New Calendar Event', {
                description: `${event.summary} - ${formattedDate}`,
                duration: 5000,
              });
            }
          });
        }

        // Update the set of event IDs
        previousEventIds.current = new Set(newEvents.map((e: CalendarEvent) => e.id));
        setEvents(newEvents);
        setIsInitialLoad(false);
      } else {
        throw new Error(data.error || 'Failed to load calendar');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load calendar");
      console.error("Calendar fetch error:", err);
      setIsInitialLoad(false);
    }
  };

  // Fetch events on mount and poll based on activity
  useEffect(() => {
    fetchEvents();

    // Refresh every 10 seconds when active, 30 seconds when inactive
    const refreshInterval = isActive ? 10000 : 30000;
    const interval = setInterval(fetchEvents, refreshInterval);

    return () => clearInterval(interval);
  }, [isActive]);

  // Calendar grid helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start.dateTime || event.start.date || '');
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const hasEventsOnDate = (date: Date) => {
    return events.some(event => {
      const eventDate = new Date(event.start.dateTime || event.start.date || '');
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const getEventCountForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start.dateTime || event.start.date || '');
      return eventDate.toDateString() === date.toDateString();
    }).length;
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  if (isInitialLoad) {
    return (
      <Card className="bg-gradient-card shadow-soft">
        <CardContent className="flex items-center justify-center py-20">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground">Loading calendar...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-gradient-card shadow-soft">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <CalendarIcon className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Calendar Unavailable</CardTitle>
          <CardDescription className="text-destructive">
            {error}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pb-8">
          <Button
            size="lg"
            onClick={fetchEvents}
            className="bg-gradient-sage hover:scale-105 transition-transform"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const todayEvents = getEventsForDate(selectedDate);

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-card shadow-soft">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-primary" />
                Calendar
              </CardTitle>
              <CardDescription className="text-xs">Live view of schedule</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={prevMonth}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <div className="text-xs font-medium min-w-[120px] text-center">
                {monthName}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={nextMonth}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          {/* Calendar Grid */}
          <div className="mb-4">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-[10px] font-semibold text-muted-foreground py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for days before month starts */}
              {Array.from({ length: startingDayOfWeek }).map((_, index) => (
                <div key={`empty-${index}`} className="aspect-square" />
              ))}

              {/* Days of the month */}
              {Array.from({ length: daysInMonth }).map((_, index) => {
                const day = index + 1;
                const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                const isToday = date.toDateString() === new Date().toDateString();
                const isSelected = date.toDateString() === selectedDate.toDateString();
                const eventCount = getEventCountForDate(date);
                const dayEvents = getEventsForDate(date);

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(date)}
                    className={`
                      aspect-square rounded-md flex flex-col items-center justify-between p-1
                      relative transition-all duration-200
                      ${isSelected ? 'bg-gradient-sage text-primary-foreground shadow-hover scale-105' :
                        isToday ? 'bg-primary/10 text-primary font-semibold' :
                        'hover:bg-muted/50'}
                    `}
                  >
                    <span className="text-xs">{day}</span>
                    {eventCount > 0 && (
                      <div className="w-full flex flex-col items-center gap-0.5">
                        {dayEvents.slice(0, 2).map((event) => (
                          <div
                            key={event.id}
                            className={`text-[8px] w-full truncate text-center px-0.5 rounded ${
                              isSelected
                                ? 'bg-primary-foreground/20 text-primary-foreground'
                                : 'bg-primary/20 text-primary'
                            }`}
                            title={event.summary}
                          >
                            {event.summary}
                          </div>
                        ))}
                        {eventCount > 2 && (
                          <div className={`text-[7px] ${
                            isSelected ? 'text-primary-foreground/70' : 'text-primary/70'
                          }`}>
                            +{eventCount - 2}
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Events List for Selected Date */}
          <div className="border-t border-muted pt-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              {formatDate(selectedDate.toISOString())}
            </h3>

            {todayEvents.length > 0 ? (
              <div className="space-y-2 max-h-[240px] overflow-y-auto">
                {todayEvents.map((event) => (
                  <div
                    key={event.id}
                    className="bg-muted/30 rounded-lg p-3 border-l-4 border-primary hover:shadow-soft transition-all animate-fade-in"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-foreground mb-1 truncate">
                          {event.summary}
                        </h4>
                        <div className="space-y-0.5 text-xs text-muted-foreground">
                          {event.start.dateTime && (
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-primary flex-shrink-0" />
                              <span>
                                {formatTime(event.start.dateTime)} - {formatTime(event.end.dateTime || '')}
                              </span>
                            </div>
                          )}
                          {event.location && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3 h-3 text-primary flex-shrink-0" />
                              <span className="truncate">{event.location}</span>
                            </div>
                          )}
                          {event.hangoutLink && (
                            <div className="flex items-center gap-1.5">
                              <Video className="w-3 h-3 text-primary flex-shrink-0" />
                              <a
                                href={event.hangoutLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                Join video call
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <CalendarIcon className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-xs">No events scheduled for this day</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GoogleCalendar;
