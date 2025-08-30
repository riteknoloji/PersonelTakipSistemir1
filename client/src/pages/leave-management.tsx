import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, Calendar, Clock, User, FileText, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import MainLayout from "@/components/layout/main-layout";
import type { LeaveRequest, Personnel, InsertLeaveRequest, insertLeaveRequestSchema } from "@shared/schema";
import { z } from "zod";

// Diyanet'ten çekilen dini günler ve resmi tatiller
const HOLIDAYS = {
  "2025-01-01": "Yılbaşı",
  "2025-04-23": "Ulusal Egemenlik ve Çocuk Bayramı",
  "2025-05-01": "İşçi Bayramı",
  "2025-05-19": "Atatürk'ü Anma, Gençlik ve Spor Bayramı",
  "2025-08-30": "Zafer Bayramı",
  "2025-10-29": "Cumhuriyet Bayramı",
  "2025-03-30": "Ramazan Bayramı 1. Gün",
  "2025-03-31": "Ramazan Bayramı 2. Gün",
  "2025-04-01": "Ramazan Bayramı 3. Gün",
  "2025-06-06": "Kurban Bayramı 1. Gün",
  "2025-06-07": "Kurban Bayramı 2. Gün",
  "2025-06-08": "Kurban Bayramı 3. Gün",
  "2025-06-09": "Kurban Bayramı 4. Gün",
};

const RELIGIOUS_DAYS = {
  "2025-01-01": "Üç Ayların Başlangıcı",
  "2025-01-02": "Regaib Kandili",
  "2025-01-26": "Mirac Kandili",
  "2025-02-13": "Berat Kandili",
  "2025-03-01": "Ramazan Başlangıcı",
  "2025-03-26": "Kadir Gecesi",
  "2025-03-29": "Arefe (Ramazan)",
  "2025-06-05": "Arefe (Kurban)",
  "2025-06-26": "Hicri Yılbaşı",
  "2025-07-05": "Aşure Günü",
  "2025-09-03": "Mevlid Kandili",
  "2025-12-21": "Üç Ayların Başlangıcı",
  "2025-12-25": "Regaib Kandili",
};

const SPECIAL_DAYS = {
  "2025-09-15": "Şirket Kuruluş Yıldönümü",
  "2025-12-31": "Yılsonu Toplantısı",
};

const LEAVE_TYPES = {
  yillik: "Yıllık İzin",
  hastalik: "Hastalık İzni", 
  dogum: "Doğum İzni",
  babalik: "Babalık İzni",
  evlilik: "Evlilik İzni",
  olum: "Ölüm İzni",
  mazeret: "Mazeret İzni",
  ucretsiz: "Ücretsiz İzin",
  hafta_tatili: "Hafta Tatili",
  resmi_tatil: "Resmi Tatil"
};

const leaveFormSchema = z.object({
  personnelId: z.string().min(1, "Personel seçimi zorunludur"),
  type: z.enum(["yillik", "hastalik", "dogum", "babalik", "evlilik", "olum", "mazeret", "ucretsiz", "hafta_tatili", "resmi_tatil"]),
  startDate: z.string().min(1, "Başlangıç tarihi zorunludur"),
  endDate: z.string().min(1, "Bitiş tarihi zorunludur"),
  reason: z.string().optional(),
});

type LeaveForm = z.infer<typeof leaveFormSchema>;

const LEAVE_STATUS = {
  pending: "Bekliyor",
  approved: "Onaylandı",
  rejected: "Reddedildi"
};

const LEAVE_STATUS_COLORS = {
  pending: "bg-yellow-500",
  approved: "bg-green-500", 
  rejected: "bg-red-500"
};

interface CalendarPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: string;
  onDateSelect: (date: string) => void;
  title: string;
}

function CalendarPicker({ open, onOpenChange, selectedDate, onDateSelect, title }: CalendarPickerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

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
    const isSelected = dateStr === selectedDate;
    const isHoliday = HOLIDAYS[dateStr as keyof typeof HOLIDAYS];
    const isReligiousDay = RELIGIOUS_DAYS[dateStr as keyof typeof RELIGIOUS_DAYS];
    const isSpecialDay = SPECIAL_DAYS[dateStr as keyof typeof SPECIAL_DAYS];
    
    let classes = "p-2 rounded-lg cursor-pointer transition-colors text-center ";
    
    if (!isCurrentMonth) {
      classes += "text-muted-foreground ";
    }
    
    if (isSelected) {
      classes += "bg-primary text-primary-foreground font-bold ";
    } else if (isToday) {
      classes += "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 font-bold ";
    } else if (isHoliday) {
      classes += "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 ";
    } else if (isReligiousDay) {
      classes += "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 ";
    } else if (isSpecialDay) {
      classes += "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 ";
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="modal-calendar-picker">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Header with month navigation */}
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={prevMonth}>
              ←
            </Button>
            <h3 className="text-lg font-semibold">
              {currentMonth.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
            </h3>
            <Button variant="outline" size="sm" onClick={nextMonth}>
              →
            </Button>
          </div>

          {/* Days of week */}
          <div className="grid grid-cols-7 gap-1">
            {['P', 'P', 'S', 'Ç', 'P', 'C', 'C'].map((day, index) => (
              <div key={index} className="p-2 text-center font-medium text-muted-foreground text-sm">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              const dayDateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
              const holiday = HOLIDAYS[dayDateStr as keyof typeof HOLIDAYS];
              const religiousDay = RELIGIOUS_DAYS[dayDateStr as keyof typeof RELIGIOUS_DAYS];
              const specialDay = SPECIAL_DAYS[dayDateStr as keyof typeof SPECIAL_DAYS];
              
              return (
                <div
                  key={index}
                  className={getDayClass(day)}
                  onClick={() => {
                    onDateSelect(dayDateStr);
                    onOpenChange(false);
                  }}
                >
                  <div className="text-sm font-medium">{day.getDate()}</div>
                  {(holiday || religiousDay || specialDay) && (
                    <div className="text-xs mt-1 space-x-1">
                      {holiday && <span className="text-red-600">T</span>}
                      {religiousDay && <span className="text-green-600">D</span>}
                      {specialDay && <span className="text-yellow-600">Ö</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="text-xs text-muted-foreground space-y-1">
            <div>T: Resmi Tatil, D: Dini Gün, Ö: Özel Gün</div>
            <div>Çift tıklayarak tarih seçin</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function LeaveManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [specialDayWarnings, setSpecialDayWarnings] = useState<string[]>([]);
  const { toast } = useToast();

  const form = useForm<LeaveForm>({
    resolver: zodResolver(leaveFormSchema),
    defaultValues: {
      personnelId: "",
      type: "yillik",
      startDate: "",
      endDate: "",
      reason: "",
    },
  });

  // İzin tarih aralığında özel günleri kontrol et
  const checkSpecialDaysInRange = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return [];
    
    const warnings: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Tarih aralığındaki her günü kontrol et
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
      
      if (HOLIDAYS[dateStr as keyof typeof HOLIDAYS]) {
        warnings.push(`${dateStr}: ${HOLIDAYS[dateStr as keyof typeof HOLIDAYS]} (Resmi Tatil)`);
      }
      if (RELIGIOUS_DAYS[dateStr as keyof typeof RELIGIOUS_DAYS]) {
        warnings.push(`${dateStr}: ${RELIGIOUS_DAYS[dateStr as keyof typeof RELIGIOUS_DAYS]} (Dini Gün)`);
      }
      if (SPECIAL_DAYS[dateStr as keyof typeof SPECIAL_DAYS]) {
        warnings.push(`${dateStr}: ${SPECIAL_DAYS[dateStr as keyof typeof SPECIAL_DAYS]} (Özel Gün)`);
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return warnings;
  };

  // Tarih değişikliklerini izle
  useEffect(() => {
    const startDate = form.watch("startDate");
    const endDate = form.watch("endDate");
    
    if (startDate && endDate) {
      const warnings = checkSpecialDaysInRange(startDate, endDate);
      setSpecialDayWarnings(warnings);
    } else {
      setSpecialDayWarnings([]);
    }
  }, [form.watch("startDate"), form.watch("endDate")]);

  const { data: leaveRequests = [], isLoading } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/leave-requests"],
  });

  const { data: personnel = [] } = useQuery<Personnel[]>({
    queryKey: ["/api/personnel"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PUT", `/api/leave-requests/${id}`, { status });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
      toast({
        title: "Başarılı",
        description: "İzin talebi durumu güncellendi",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createLeaveRequestMutation = useMutation({
    mutationFn: async (data: InsertLeaveRequest) => {
      const res = await apiRequest("POST", "/api/leave-requests", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
      setShowAddModal(false);
      form.reset();
      toast({
        title: "Başarılı",
        description: "İzin talebi başarıyla oluşturuldu",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: LeaveForm) => {
    const leaveData = {
      ...data,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
    };
    createLeaveRequestMutation.mutate(leaveData);
  };

  const filteredRequests = leaveRequests.filter((request) => {
    const person = personnel.find(p => p.id === request.personnelId);
    const fullName = person ? `${person.firstName} ${person.lastName}` : "";
    return fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           LEAVE_TYPES[request.type as keyof typeof LEAVE_TYPES]?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const stats = {
    total: leaveRequests.length,
    pending: leaveRequests.filter(r => r.status === "pending").length,
    approved: leaveRequests.filter(r => r.status === "approved").length,
    rejected: leaveRequests.filter(r => r.status === "rejected").length,
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">İzin talepleri yükleniyor...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">İzin Yönetimi</h1>
            <p className="text-muted-foreground">Personel izin taleplerini yönetin</p>
          </div>
          <Button onClick={() => setShowAddModal(true)} data-testid="button-add-leave">
            <Plus className="mr-2 h-4 w-4" />
            Yeni İzin Talebi
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Talep</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-requests">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bekleyen</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600" data-testid="text-pending-requests">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Onaylanan</CardTitle>
              <Calendar className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="text-approved-requests">{stats.approved}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reddedilen</CardTitle>
              <User className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600" data-testid="text-rejected-requests">{stats.rejected}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Personel adı veya izin türüne göre ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
              data-testid="input-search-leave"
            />
          </div>
        </div>

        {/* Leave Requests Table */}
        <Card>
          <CardHeader>
            <CardTitle>İzin Talepleri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredRequests.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">İzin talebi bulunamadı</h3>
                  <p className="text-muted-foreground">
                    {searchTerm ? "Arama kriterlerinize uygun" : "Henüz hiç"} izin talebi bulunmuyor.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredRequests.map((request) => {
                    const person = personnel.find(p => p.id === request.personnelId);
                    const fullName = person ? `${person.firstName} ${person.lastName}` : "Bilinmeyen";
                    
                    return (
                      <div 
                        key={request.id} 
                        className="border rounded-lg p-4 space-y-4 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setSelectedRequest(request)}
                        data-testid={`card-leave-request-${request.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div>
                              <h3 className="font-semibold">{fullName}</h3>
                              <p className="text-sm text-muted-foreground">
                                {person?.employeeNumber || "N/A"} • {person?.position || "N/A"}
                              </p>
                            </div>
                            <Badge variant="outline">
                              {LEAVE_TYPES[request.type as keyof typeof LEAVE_TYPES] || request.type}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge 
                              className={`text-white ${LEAVE_STATUS_COLORS[request.status as keyof typeof LEAVE_STATUS_COLORS]}`}
                            >
                              {LEAVE_STATUS[request.status as keyof typeof LEAVE_STATUS] || request.status}
                            </Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Başlangıç Tarihi:</span>
                            <p className="text-muted-foreground">
                              {new Date(request.startDate).toLocaleDateString('tr-TR')}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium">Bitiş Tarihi:</span>
                            <p className="text-muted-foreground">
                              {new Date(request.endDate).toLocaleDateString('tr-TR')}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium">Gün Sayısı:</span>
                            <p className="text-muted-foreground">
                              {Math.ceil((new Date(request.endDate).getTime() - new Date(request.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} gün
                            </p>
                          </div>
                        </div>

                        {request.reason && (
                          <div>
                            <span className="font-medium text-sm">Açıklama:</span>
                            <p className="text-sm text-muted-foreground mt-1">{request.reason}</p>
                          </div>
                        )}

                        {request.status === "pending" && (
                          <div className="flex space-x-2 pt-2">
                            <Button
                              size="sm"
                              onClick={() => updateStatusMutation.mutate({ id: request.id, status: "approved" })}
                              disabled={updateStatusMutation.isPending}
                              data-testid={`button-approve-${request.id}`}
                            >
                              Onayla
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => updateStatusMutation.mutate({ id: request.id, status: "rejected" })}
                              disabled={updateStatusMutation.isPending}
                              data-testid={`button-reject-${request.id}`}
                            >
                              Reddet
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Leave Request Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl" data-testid="modal-add-leave-request">
          <DialogHeader>
            <DialogTitle>Yeni İzin Talebi Oluştur</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="personnelId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Personel *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-leave-personnel">
                          <SelectValue placeholder="Personel seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {personnel.map((person) => (
                          <SelectItem key={person.id} value={person.id}>
                            {person.firstName} {person.lastName} - {person.position}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>İzin Türü *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-leave-type">
                          <SelectValue placeholder="İzin türü seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(LEAVE_TYPES).map(([key, value]) => (
                          <SelectItem key={key} value={key}>
                            {value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Başlangıç Tarihi *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            value={field.value ? new Date(field.value).toLocaleDateString('tr-TR') : ""}
                            placeholder="Tarih seçin"
                            readOnly
                            onClick={() => setShowStartDatePicker(true)}
                            className="cursor-pointer"
                            data-testid="input-leave-start-date"
                          />
                          <Calendar 
                            className="absolute right-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bitiş Tarihi *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            value={field.value ? new Date(field.value).toLocaleDateString('tr-TR') : ""}
                            placeholder="Tarih seçin"
                            readOnly
                            onClick={() => setShowEndDatePicker(true)}
                            className="cursor-pointer"
                            data-testid="input-leave-end-date"
                          />
                          <Calendar 
                            className="absolute right-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Özel Gün Uyarıları */}
              {specialDayWarnings.length > 0 && (
                <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800 dark:text-orange-200">
                    <div className="font-semibold mb-2">
                      DİKKAT! İzin tarih aralığında özel günler ve etkinlikler var:
                    </div>
                    <ul className="space-y-1 text-sm">
                      {specialDayWarnings.map((warning, index) => (
                        <li key={index}>• {warning}</li>
                      ))}
                    </ul>
                    <div className="mt-3 text-sm font-medium">
                      İzin vermek istediğinize emin misiniz? Yukarıdaki özel günleri dikkate alın.
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Açıklama</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="İzin talebi açıklaması (isteğe bağlı)"
                        {...field}
                        data-testid="textarea-leave-reason"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex space-x-3">
                <Button
                  type="submit"
                  disabled={createLeaveRequestMutation.isPending}
                  data-testid="button-submit-leave-request"
                >
                  {createLeaveRequestMutation.isPending ? "Kaydediliyor..." : "İzin Talebi Oluştur"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false);
                    form.reset();
                  }}
                  data-testid="button-cancel-leave-request"
                >
                  İptal
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Leave Request Detail Modal */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="max-w-2xl" data-testid="modal-leave-request-detail">
          <DialogHeader>
            <DialogTitle>İzin Talebi Detayları</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Personel</Label>
                  <p className="mt-1 text-foreground">
                    {(() => {
                      const person = personnel.find(p => p.id === selectedRequest.personnelId);
                      return person ? `${person.firstName} ${person.lastName}` : "Bilinmeyen";
                    })()}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">İzin Türü</Label>
                  <p className="mt-1 text-foreground">
                    {LEAVE_TYPES[selectedRequest.type as keyof typeof LEAVE_TYPES]}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Başlangıç Tarihi</Label>
                  <p className="mt-1 text-foreground">
                    {new Date(selectedRequest.startDate).toLocaleDateString('tr-TR')}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Bitiş Tarihi</Label>
                  <p className="mt-1 text-foreground">
                    {new Date(selectedRequest.endDate).toLocaleDateString('tr-TR')}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Gün Sayısı</Label>
                  <p className="mt-1 text-foreground">
                    {Math.ceil((new Date(selectedRequest.endDate).getTime() - new Date(selectedRequest.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} gün
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Durum</Label>
                  <Badge 
                    className={`mt-1 text-white ${LEAVE_STATUS_COLORS[selectedRequest.status as keyof typeof LEAVE_STATUS_COLORS]}`}
                  >
                    {LEAVE_STATUS[selectedRequest.status as keyof typeof LEAVE_STATUS]}
                  </Badge>
                </div>
              </div>
              
              {selectedRequest.reason && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Açıklama</Label>
                  <p className="mt-1 text-foreground">{selectedRequest.reason}</p>
                </div>
              )}

              {selectedRequest.status === "pending" && (
                <div className="flex space-x-3">
                  <Button
                    onClick={() => {
                      updateStatusMutation.mutate({ id: selectedRequest.id, status: "approved" });
                      setSelectedRequest(null);
                    }}
                    disabled={updateStatusMutation.isPending}
                    data-testid="button-approve-leave-detail"
                  >
                    Onayla
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      updateStatusMutation.mutate({ id: selectedRequest.id, status: "rejected" });
                      setSelectedRequest(null);
                    }}
                    disabled={updateStatusMutation.isPending}
                    data-testid="button-reject-leave-detail"
                  >
                    Reddet
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Calendar Pickers */}
      <CalendarPicker
        open={showStartDatePicker}
        onOpenChange={setShowStartDatePicker}
        selectedDate={form.watch("startDate")}
        onDateSelect={(date) => form.setValue("startDate", date)}
        title="Başlangıç Tarihi Seçin"
      />

      <CalendarPicker
        open={showEndDatePicker}
        onOpenChange={setShowEndDatePicker}
        selectedDate={form.watch("endDate")}
        onDateSelect={(date) => form.setValue("endDate", date)}
        title="Bitiş Tarihi Seçin"
      />
    </MainLayout>
  );
}