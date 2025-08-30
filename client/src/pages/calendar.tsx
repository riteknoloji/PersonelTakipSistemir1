import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar as CalendarIcon, Plus, Clock, Users, MapPin } from "lucide-react";
import { Personnel, Attendance, LeaveRequest, Shift } from "@shared/schema";

// Türkiye'deki resmi tatiller (2025)
const HOLIDAYS = {
  "2025-01-01": "Yılbaşı",
  "2025-04-23": "Ulusal Egemenlik ve Çocuk Bayramı",
  "2025-05-01": "İşçi Bayramı",
  "2025-05-19": "Atatürk'ü Anma, Gençlik ve Spor Bayramı",
  "2025-08-30": "Zafer Bayramı",
  "2025-10-29": "Cumhuriyet Bayramı",
  // Dini bayramlar değişken tarihlerde
  "2025-03-30": "Ramazan Bayramı 1. Gün",
  "2025-03-31": "Ramazan Bayramı 2. Gün",
  "2025-04-01": "Ramazan Bayramı 3. Gün",
  "2025-06-06": "Kurban Bayramı 1. Gün",
  "2025-06-07": "Kurban Bayramı 2. Gün",
  "2025-06-08": "Kurban Bayramı 3. Gün",
  "2025-06-09": "Kurban Bayramı 4. Gün",
};

// Özel günler (yönetici tarafından işaretlenen)
const SPECIAL_DAYS = {
  "2025-09-15": "Şirket Kuruluş Yıldönümü",
  "2025-12-31": "Yılsonu Toplantısı",
};

interface DayDetailModalProps {
  date: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function DayDetailModal({ date, open, onOpenChange }: DayDetailModalProps) {
  const { data: personnel = [] } = useQuery<Personnel[]>({
    queryKey: ["/api/personnel"],
  });

  const { data: attendance = [] } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance", { date }],
    enabled: !!date,
  });

  const { data: leaveRequests = [] } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/leave-requests", { date }],
    enabled: !!date,
  });

  const holiday = HOLIDAYS[date as keyof typeof HOLIDAYS];
  const specialDay = SPECIAL_DAYS[date as keyof typeof SPECIAL_DAYS];
  
  const attendingPersonnel = attendance.filter(a => a.checkIn);
  const onLeavePersonnel = leaveRequests.filter(req => 
    req.status === 'approved' && 
    new Date(req.startDate) <= new Date(date) && 
    new Date(req.endDate) >= new Date(date)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="modal-day-detail">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <CalendarIcon className="w-5 h-5 mr-2" />
            {new Date(date).toLocaleDateString('tr-TR', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Özel Günler */}
          {(holiday || specialDay) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Özel Günler
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {holiday && (
                  <div className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded">
                    <span className="font-medium">{holiday}</span>
                    <Badge variant="destructive">Resmi Tatil</Badge>
                  </div>
                )}
                {specialDay && (
                  <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                    <span className="font-medium">{specialDay}</span>
                    <Badge variant="default">Özel Gün</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* İşe Gelenler */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center">
                <Users className="w-4 h-4 mr-2" />
                İşe Gelenler ({attendingPersonnel.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {attendingPersonnel.length === 0 ? (
                <p className="text-muted-foreground text-center py-2">Henüz kimse gelmemiş</p>
              ) : (
                <div className="space-y-2">
                  {attendingPersonnel.map((record) => {
                    const person = personnel.find(p => p.id === record.personnelId);
                    return (
                      <div key={record.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                        <div>
                          <p className="font-medium">
                            {person ? `${person.firstName} ${person.lastName}` : "Bilinmeyen"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {person?.position} • {person?.department}
                          </p>
                        </div>
                        <div className="text-right text-sm">
                          <p className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {record.checkIn ? new Date(record.checkIn).toLocaleTimeString('tr-TR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            }) : '-'}
                          </p>
                          {record.location && (
                            <p className="flex items-center text-muted-foreground">
                              <MapPin className="w-3 h-3 mr-1" />
                              {record.location}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* İzinliler */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center">
                <CalendarIcon className="w-4 h-4 mr-2" />
                İzinliler ({onLeavePersonnel.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {onLeavePersonnel.length === 0 ? (
                <p className="text-muted-foreground text-center py-2">İzinli personel yok</p>
              ) : (
                <div className="space-y-2">
                  {onLeavePersonnel.map((request) => {
                    const person = personnel.find(p => p.id === request.personnelId);
                    return (
                      <div key={request.id} className="flex items-center justify-between p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
                        <div>
                          <p className="font-medium">
                            {person ? `${person.firstName} ${person.lastName}` : "Bilinmeyen"}
                          </p>
                          <p className="text-sm text-muted-foreground">{request.type}</p>
                        </div>
                        <Badge variant="secondary">İzinli</Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Takvim için günleri oluştur
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startCalendar = new Date(firstDay);
    startCalendar.setDate(startCalendar.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDate = new Date(startCalendar);
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  };

  const days = generateCalendarDays();
  const today = new Date().toDateString();

  const getDayClass = (day: Date) => {
    const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
    const isToday = day.toDateString() === today;
    const isHoliday = HOLIDAYS[dateStr as keyof typeof HOLIDAYS];
    const isSpecialDay = SPECIAL_DAYS[dateStr as keyof typeof SPECIAL_DAYS];
    
    let classes = "p-2 rounded-lg cursor-pointer transition-colors ";
    
    if (!isCurrentMonth) {
      classes += "text-muted-foreground ";
    }
    
    if (isToday) {
      classes += "bg-primary text-primary-foreground font-bold ";
    } else if (isHoliday) {
      classes += "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 ";
    } else if (isSpecialDay) {
      classes += "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 ";
    } else {
      classes += "hover:bg-muted ";
    }
    
    return classes;
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-calendar-title">
            Takvim
          </h1>
          <Button data-testid="button-add-special-day">
            <Plus className="w-4 h-4 mr-2" />
            Özel Gün Ekle
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">
                {currentMonth.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
              </CardTitle>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={prevMonth} data-testid="button-prev-month">
                  ←
                </Button>
                <Button variant="outline" size="sm" onClick={nextMonth} data-testid="button-next-month">
                  →
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Haftanın günleri */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'].map(day => (
                <div key={day} className="p-2 text-center font-medium text-muted-foreground text-sm">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Takvim günleri */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, index) => {
                const dayDateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
                const holiday = HOLIDAYS[dayDateStr as keyof typeof HOLIDAYS];
                const specialDay = SPECIAL_DAYS[dayDateStr as keyof typeof SPECIAL_DAYS];
                
                return (
                  <div
                    key={index}
                    className={getDayClass(day)}
                    onClick={() => setSelectedDate(dayDateStr)}
                    data-testid={`calendar-day-${dayDateStr}`}
                  >
                    <div className="text-center">
                      <div className="text-sm font-medium">{day.getDate()}</div>
                      {(holiday || specialDay) && (
                        <div className="text-xs mt-1">
                          {holiday && <Badge variant="destructive" className="text-xs">T</Badge>}
                          {specialDay && <Badge variant="default" className="text-xs">Ö</Badge>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Açıklamalar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Resmi Tatiller</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="text-sm">Kırmızı renkte gösterilir</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Özel Günler</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span className="text-sm">Mavi renkte gösterilir</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Bugün</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-primary rounded"></div>
                <span className="text-sm">Koyu mavi renkte gösterilir</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {selectedDate && (
        <DayDetailModal
          date={selectedDate}
          open={!!selectedDate}
          onOpenChange={(open) => !open && setSelectedDate(null)}
        />
      )}
    </MainLayout>
  );
}