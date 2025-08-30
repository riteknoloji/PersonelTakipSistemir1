import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, Calendar, Clock, User, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import MainLayout from "@/components/layout/main-layout";
import type { LeaveRequest, Personnel } from "@shared/schema";

const LEAVE_TYPES = {
  annual: "Yıllık İzin",
  sick: "Hastalık İzni", 
  maternity: "Doğum İzni",
  paternity: "Babalık İzni",
  other: "Diğer"
};

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
  const { toast } = useToast();

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
          <Button data-testid="button-add-leave">
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
                        className="border rounded-lg p-4 space-y-4"
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
                            <p className="text-muted-foreground">{request.days} gün</p>
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
    </MainLayout>
  );
}