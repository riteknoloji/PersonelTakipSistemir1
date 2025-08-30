import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, Calendar, Clock, User, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import MainLayout from "@/components/layout/main-layout";
import type { LeaveRequest, Personnel, InsertLeaveRequest, insertLeaveRequestSchema } from "@shared/schema";
import { z } from "zod";

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

export default function LeaveManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
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
                        <Input
                          type="date"
                          {...field}
                          data-testid="input-leave-start-date"
                        />
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
                        <Input
                          type="date"
                          {...field}
                          data-testid="input-leave-end-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
    </MainLayout>
  );
}