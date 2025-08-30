import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, User, Search, Download, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MainLayout from "@/components/layout/main-layout";
import type { Attendance, Personnel, Branch } from "@shared/schema";

export default function AttendanceTracking() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("today");
  const [branchFilter, setBranchFilter] = useState("all");

  const { data: attendance = [], isLoading } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance", { date: dateFilter, branch: branchFilter }],
  });

  const { data: personnel = [] } = useQuery<Personnel[]>({
    queryKey: ["/api/personnel"],
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const filteredAttendance = attendance.filter((record) => {
    const person = personnel.find(p => p.id === record.personnelId);
    if (!person) return false;
    
    const fullName = `${person.firstName} ${person.lastName}`;
    const searchMatch = fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       person.employeeNumber.includes(searchTerm);
    
    return searchMatch;
  });

  const calculateWorkHours = (checkIn?: Date | string, checkOut?: Date | string) => {
    if (!checkIn || !checkOut) return "Devam ediyor";
    
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}s ${minutes}dk`;
  };

  const stats = {
    total: filteredAttendance.length,
    present: filteredAttendance.filter(a => a.checkInTime && !a.checkOutTime).length,
    completed: filteredAttendance.filter(a => a.checkInTime && a.checkOutTime).length,
    late: filteredAttendance.filter(a => {
      if (!a.checkInTime) return false;
      const checkIn = new Date(a.checkInTime);
      const hour = checkIn.getHours();
      const minute = checkIn.getMinutes();
      return hour > 9 || (hour === 9 && minute > 0); // 09:00'dan sonra geç
    }).length
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Devam kayıtları yükleniyor...</p>
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
            <h1 className="text-3xl font-bold tracking-tight">Devam Takibi</h1>
            <p className="text-muted-foreground">Detaylı personel giriş-çıkış kayıtları</p>
          </div>
          <Button data-testid="button-export-attendance">
            <Download className="mr-2 h-4 w-4" />
            Rapor İndir
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Kayıt</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-attendance">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">İş Yerinde</CardTitle>
              <Clock className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="text-present-count">{stats.present}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tamamlanan</CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600" data-testid="text-completed-count">{stats.completed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Geç Gelen</CardTitle>
              <Clock className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600" data-testid="text-late-count">{stats.late}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Personel adı veya sicil numarası ile ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
              data-testid="input-search-attendance"
            />
          </div>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-date-filter">
              <SelectValue placeholder="Tarih filtresi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Bugün</SelectItem>
              <SelectItem value="yesterday">Dün</SelectItem>
              <SelectItem value="this-week">Bu Hafta</SelectItem>
              <SelectItem value="last-week">Geçen Hafta</SelectItem>
              <SelectItem value="this-month">Bu Ay</SelectItem>
              <SelectItem value="last-month">Geçen Ay</SelectItem>
            </SelectContent>
          </Select>
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-branch-filter">
              <SelectValue placeholder="Şube filtresi" />
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

        {/* Attendance Records */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Devam Kayıtları
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredAttendance.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">Kayıt bulunamadı</h3>
                  <p className="text-muted-foreground">
                    {searchTerm ? "Arama kriterlerinize uygun" : "Seçilen filtrelere uygun"} devam kaydı bulunmuyor.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredAttendance.map((record) => {
                    const person = personnel.find(p => p.id === record.personnelId);
                    const branch = branches.find(b => b.id === person?.branchId);
                    if (!person) return null;
                    
                    const fullName = `${person.firstName} ${person.lastName}`;
                    const isPresent = record.checkInTime && !record.checkOutTime;
                    const isLate = record.checkInTime ? 
                      new Date(record.checkInTime).getHours() > 9 || 
                      (new Date(record.checkInTime).getHours() === 9 && new Date(record.checkInTime).getMinutes() > 0) 
                      : false;
                    
                    return (
                      <div 
                        key={record.id} 
                        className="border rounded-lg p-4"
                        data-testid={`card-attendance-record-${record.id}`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-4">
                            <div>
                              <h3 className="font-semibold">{fullName}</h3>
                              <p className="text-sm text-muted-foreground">
                                {person.employeeNumber} • {person.position} • {branch?.name || "Atanmamış"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {isPresent && (
                              <Badge className="bg-green-500 hover:bg-green-600">
                                İş Yerinde
                              </Badge>
                            )}
                            {isLate && (
                              <Badge variant="destructive">
                                Geç Gelen
                              </Badge>
                            )}
                            {record.checkOutTime && (
                              <Badge variant="secondary">
                                Çıkış Yapan
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Tarih:</span>
                            <p className="text-muted-foreground">
                              {new Date(record.date).toLocaleDateString('tr-TR')}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium">Giriş Saati:</span>
                            <p className="text-muted-foreground">
                              {record.checkInTime ? 
                                new Date(record.checkInTime).toLocaleTimeString('tr-TR', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : 
                                "Henüz giriş yapmadı"
                              }
                            </p>
                          </div>
                          <div>
                            <span className="font-medium">Çıkış Saati:</span>
                            <p className="text-muted-foreground">
                              {record.checkOutTime ? 
                                new Date(record.checkOutTime).toLocaleTimeString('tr-TR', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : 
                                "Henüz çıkış yapmadı"
                              }
                            </p>
                          </div>
                          <div>
                            <span className="font-medium">Çalışma Süresi:</span>
                            <p className="text-muted-foreground">
                              {calculateWorkHours(record.checkInTime, record.checkOutTime)}
                            </p>
                          </div>
                        </div>
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