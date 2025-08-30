import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Calendar, Download, TrendingUp, Users, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MainLayout from "@/components/layout/main-layout";
import type { Personnel, Attendance, LeaveRequest, Branch } from "@shared/schema";

export default function Reports() {
  const [dateRange, setDateRange] = useState("this-month");
  const [selectedBranch, setSelectedBranch] = useState("all");

  const { data: personnel = [] } = useQuery<Personnel[]>({
    queryKey: ["/api/personnel"],
  });

  const { data: attendance = [] } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance", { range: dateRange, branch: selectedBranch }],
  });

  const { data: leaveRequests = [] } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/leave-requests", { range: dateRange, branch: selectedBranch }],
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  // Attendance Statistics
  const attendanceStats = {
    totalDays: attendance.length,
    totalHours: attendance.reduce((sum, record) => {
      if (record.checkInTime && record.checkOutTime) {
        const start = new Date(record.checkInTime);
        const end = new Date(record.checkOutTime);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return sum + hours;
      }
      return sum;
    }, 0),
    averageHours: 0,
    lateArrivals: attendance.filter(record => {
      if (!record.checkInTime) return false;
      const checkIn = new Date(record.checkInTime);
      return checkIn.getHours() > 9 || (checkIn.getHours() === 9 && checkIn.getMinutes() > 0);
    }).length,
  };

  attendanceStats.averageHours = attendanceStats.totalDays > 0 ? 
    attendanceStats.totalHours / attendanceStats.totalDays : 0;

  // Leave Statistics
  const leaveStats = {
    total: leaveRequests.length,
    pending: leaveRequests.filter(req => req.status === "pending").length,
    approved: leaveRequests.filter(req => req.status === "approved").length,
    rejected: leaveRequests.filter(req => req.status === "rejected").length,
    totalDays: leaveRequests
      .filter(req => req.status === "approved")
      .reduce((sum, req) => sum + req.days, 0),
  };

  // Personnel Statistics
  const personnelStats = {
    total: personnel.length,
    active: personnel.filter(p => p.isActive).length,
    inactive: personnel.filter(p => !p.isActive).length,
    byBranch: branches.map(branch => ({
      name: branch.name,
      count: personnel.filter(p => p.branchId === branch.id && p.isActive).length,
    })),
  };

  const exportReport = (reportType: string) => {
    // Bu fonksiyon gelecekte PDF/Excel export için kullanılacak
    console.log(`Exporting ${reportType} report...`);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Raporlar</h1>
            <p className="text-muted-foreground">Personel ve devam istatistikleri</p>
          </div>
          <div className="flex space-x-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px]" data-testid="select-date-range">
                <SelectValue placeholder="Tarih aralığı" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this-week">Bu Hafta</SelectItem>
                <SelectItem value="last-week">Geçen Hafta</SelectItem>
                <SelectItem value="this-month">Bu Ay</SelectItem>
                <SelectItem value="last-month">Geçen Ay</SelectItem>
                <SelectItem value="this-quarter">Bu Çeyrek</SelectItem>
                <SelectItem value="this-year">Bu Yıl</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-[180px]" data-testid="select-branch">
                <SelectValue placeholder="Şube seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Şubeler</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
            <TabsTrigger value="attendance">Devam Raporu</TabsTrigger>
            <TabsTrigger value="leave">İzin Raporu</TabsTrigger>
            <TabsTrigger value="personnel">Personel Raporu</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Toplam Personel</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-personnel">
                    {personnelStats.active}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {personnelStats.inactive} pasif personel
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Toplam Devam</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-attendance">
                    {attendanceStats.totalDays}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {attendanceStats.lateArrivals} geç gelme
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">İzin Talepleri</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-leave-requests">
                    {leaveStats.total}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {leaveStats.pending} bekleyen
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ort. Çalışma</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-avg-hours">
                    {attendanceStats.averageHours.toFixed(1)}s
                  </div>
                  <p className="text-xs text-muted-foreground">
                    günlük ortalama
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Branch Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Şubelere Göre Personel Dağılımı</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {personnelStats.byBranch.map((branch, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="font-medium">{branch.name}</div>
                      <div className="flex items-center space-x-2">
                        <div className="text-sm text-muted-foreground">
                          {branch.count} personel
                        </div>
                        <div className="w-24 bg-secondary rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ 
                              width: `${(branch.count / personnelStats.active) * 100}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attendance" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Devam Raporu</h2>
              <Button 
                onClick={() => exportReport("attendance")}
                data-testid="button-export-attendance"
              >
                <Download className="mr-2 h-4 w-4" />
                İndir
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Toplam Çalışma Saati</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    {attendanceStats.totalHours.toFixed(1)}s
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Geç Gelme Sayısı</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">
                    {attendanceStats.lateArrivals}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Günlük Ortalama</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {attendanceStats.averageHours.toFixed(1)}s
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="leave" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">İzin Raporu</h2>
              <Button 
                onClick={() => exportReport("leave")}
                data-testid="button-export-leave"
              >
                <Download className="mr-2 h-4 w-4" />
                İndir
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Toplam Talep</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{leaveStats.total}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Bekleyen</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-600">
                    {leaveStats.pending}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Onaylanan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {leaveStats.approved}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Toplam İzin Günü</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    {leaveStats.totalDays}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="personnel" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Personel Raporu</h2>
              <Button 
                onClick={() => exportReport("personnel")}
                data-testid="button-export-personnel"
              >
                <Download className="mr-2 h-4 w-4" />
                İndir
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Personel Durumu</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Aktif Personel:</span>
                    <span className="font-bold text-green-600">{personnelStats.active}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pasif Personel:</span>
                    <span className="font-bold text-red-600">{personnelStats.inactive}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Toplam:</span>
                    <span className="font-bold">{personnelStats.total}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Şube Dağılımı</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {personnelStats.byBranch.map((branch, index) => (
                    <div key={index} className="flex justify-between">
                      <span>{branch.name}:</span>
                      <span className="font-bold">{branch.count}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}