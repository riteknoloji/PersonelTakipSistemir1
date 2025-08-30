import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/main-layout";
import { StatsCard } from "@/components/ui/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DetailModal } from "@/components/modals/detail-modal";
import { useState } from "react";
import { 
  Users, 
  CheckCircle, 
  Calendar, 
  Clock,
  Plus,
  TrendingUp
} from "lucide-react";

interface Stats {
  totalPersonnel: number;
  todayAttendance: number;
  onLeave: number;
  activeShifts: number;
}

interface Activity {
  id: string;
  employee: string;
  action: string;
  time: string;
  type: 'attendance' | 'leave' | 'shift';
}

export default function Dashboard() {
  const [selectedModal, setSelectedModal] = useState<string | null>(null);

  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["/api/stats"],
  });

  // Mock recent activities - in real app this would come from API
  const recentActivities: Activity[] = [
    {
      id: "1",
      employee: "Ahmet Yılmaz",
      action: "işe giriş yaptı",
      time: "2 dakika önce",
      type: "attendance"
    },
    {
      id: "2", 
      employee: "Fatma Demir",
      action: "yıllık izin talebinde bulundu",
      time: "15 dakika önce",
      type: "leave"
    },
    {
      id: "3",
      employee: "Mehmet Kaya", 
      action: "vardiya değişikliği yapıldı",
      time: "1 saat önce",
      type: "shift"
    }
  ];

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'attendance': return <CheckCircle className="w-4 h-4 text-accent" />;
      case 'leave': return <Calendar className="w-4 h-4 text-orange-500" />;
      case 'shift': return <Clock className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Toplam Personel"
            value={statsLoading ? "..." : stats?.totalPersonnel || 0}
            description="+12 bu ay"
            icon={Users}
            iconColor="text-primary"
            onClick={() => setSelectedModal("stats")}
          />
          <StatsCard
            title="Bugün İşe Gelen"
            value={statsLoading ? "..." : stats?.todayAttendance || 0}
            description={statsLoading ? "..." : `%${stats?.totalPersonnel ? Math.round((stats.todayAttendance / stats.totalPersonnel) * 100) : 0} katılım`}
            icon={CheckCircle}
            iconColor="text-accent"
            onClick={() => setSelectedModal("attendance")}
          />
          <StatsCard
            title="İzinli Personel"
            value={statsLoading ? "..." : stats?.onLeave || 0}
            description="8 yıllık izin"
            icon={Calendar}
            iconColor="text-orange-500"
            onClick={() => setSelectedModal("leave")}
          />
          <StatsCard
            title="Aktif Vardiya"
            value={statsLoading ? "..." : stats?.activeShifts || 0}
            description="3 farklı vardiya"
            icon={Clock}
            iconColor="text-purple-500"
            onClick={() => setSelectedModal("shift")}
          />
        </div>

        {/* Quick Actions & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Hızlı İşlemler</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" data-testid="button-add-personnel">
                  <Plus className="w-5 h-5 mr-2" />
                  Yeni Personel Ekle
                </Button>
                <Button variant="secondary" className="w-full justify-start" data-testid="button-assign-shift">
                  <Clock className="w-5 h-5 mr-2" />
                  Vardiya Atama
                </Button>
                <Button variant="secondary" className="w-full justify-start" data-testid="button-leave-request">
                  <Calendar className="w-5 h-5 mr-2" />
                  İzin Talebi
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Son Aktiviteler</CardTitle>
                <Button variant="ghost" size="sm" data-testid="button-view-all-activities">
                  Tümünü Gör
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start space-x-3 cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors"
                    onClick={() => setSelectedModal("activity-detail")}
                    data-testid={`activity-${activity.id}`}
                  >
                    <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-medium">{activity.employee}</span>{" "}
                        <span>{activity.action}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Charts & Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Attendance Chart */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Devam Grafiği</CardTitle>
              <select className="text-sm border border-border rounded-lg px-3 py-1 bg-background">
                <option>Son 7 gün</option>
                <option>Son 30 gün</option>
                <option>Son 3 ay</option>
              </select>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-muted/30 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Grafik verileri yükleniyor...</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Employees */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Yeni Personeller</CardTitle>
              <Button variant="ghost" size="sm" data-testid="button-view-all-personnel">
                Tümünü Gör
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Mock recent employees */}
              {[
                { name: "Ayşe Yılmaz", position: "Frontend Developer", joinDate: "12.01.2024", initials: "AY" },
                { name: "Murat Koca", position: "UI/UX Designer", joinDate: "10.01.2024", initials: "MK" },
                { name: "Elif Dağ", position: "Backend Developer", joinDate: "08.01.2024", initials: "ED" },
              ].map((employee, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedModal("employee-detail")}
                  data-testid={`employee-${index}`}
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {employee.initials}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{employee.name}</p>
                    <p className="text-xs text-muted-foreground">{employee.position}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{employee.joinDate}</p>
                    <span className="inline-block w-2 h-2 bg-accent rounded-full" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <DetailModal
        open={selectedModal === "stats"}
        onOpenChange={(open) => !open && setSelectedModal(null)}
        title="Personel İstatistikleri"
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Toplam Personel</label>
            <p className="mt-1 text-foreground">{stats?.totalPersonnel || 0}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Aktif Personel</label>
            <p className="mt-1 text-foreground">{stats?.todayAttendance || 0}</p>
          </div>
        </div>
      </DetailModal>

      <DetailModal
        open={selectedModal === "employee-detail"}
        onOpenChange={(open) => !open && setSelectedModal(null)}
        title="Personel Detayları"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Ad Soyad</label>
              <p className="mt-1 text-foreground">Ahmet Yılmaz</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Pozisyon</label>
              <p className="mt-1 text-foreground">Frontend Developer</p>
            </div>
          </div>
          <div className="flex space-x-3 pt-4">
            <Button data-testid="button-edit-employee">Düzenle</Button>
            <Button variant="secondary" data-testid="button-view-report">Raporla</Button>
          </div>
        </div>
      </DetailModal>
    </MainLayout>
  );
}
