import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Settings, Save, Bell, Shield, Database, Mail, Phone, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import MainLayout from "@/components/layout/main-layout";

interface SystemSettings {
  id?: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  workHours: {
    start: string;
    end: string;
    lunchBreak: number;
  };
  notifications: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    lateArrivalAlert: boolean;
    absenceAlert: boolean;
  };
  attendance: {
    graceMinutes: number;
    autoClockOut: boolean;
    requireLocationCheck: boolean;
  };
  backup: {
    autoBackup: boolean;
    backupFrequency: string;
    retentionDays: number;
  };
}

export default function SystemSettings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("general");

  const { data: settings, isLoading } = useQuery<SystemSettings>({
    queryKey: ["/api/settings"],
  });

  const [formData, setFormData] = useState<SystemSettings>({
    companyName: "",
    companyAddress: "",
    companyPhone: "",
    companyEmail: "",
    workHours: {
      start: "09:00",
      end: "18:00",
      lunchBreak: 60,
    },
    notifications: {
      emailEnabled: true,
      smsEnabled: true,
      lateArrivalAlert: true,
      absenceAlert: true,
    },
    attendance: {
      graceMinutes: 15,
      autoClockOut: false,
      requireLocationCheck: false,
    },
    backup: {
      autoBackup: true,
      backupFrequency: "daily",
      retentionDays: 30,
    },
  });

  // Initialize form data when settings are loaded
  React.useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: SystemSettings) => {
      const res = await apiRequest("PUT", "/api/settings", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Başarılı",
        description: "Sistem ayarları güncellendi",
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

  const handleSave = () => {
    updateSettingsMutation.mutate(formData);
  };

  const updateFormData = (section: keyof SystemSettings, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: typeof prev[section] === 'object' ? {
        ...prev[section],
        [field]: value
      } : value
    }));
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Sistem ayarları yükleniyor...</p>
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
            <h1 className="text-3xl font-bold tracking-tight">Sistem Ayarları</h1>
            <p className="text-muted-foreground">Sistem konfigürasyonlarını yönetin</p>
          </div>
          <Button 
            onClick={handleSave}
            disabled={updateSettingsMutation.isPending}
            data-testid="button-save-settings"
          >
            <Save className="mr-2 h-4 w-4" />
            {updateSettingsMutation.isPending ? "Kaydediliyor..." : "Ayarları Kaydet"}
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="general">Genel</TabsTrigger>
            <TabsTrigger value="attendance">Devam</TabsTrigger>
            <TabsTrigger value="notifications">Bildirimler</TabsTrigger>
            <TabsTrigger value="backup">Yedekleme</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="mr-2 h-5 w-5" />
                  Şirket Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Şirket Adı</Label>
                    <Input
                      id="companyName"
                      value={formData.companyName}
                      onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                      data-testid="input-company-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyPhone">Şirket Telefonu</Label>
                    <Input
                      id="companyPhone"
                      value={formData.companyPhone}
                      onChange={(e) => setFormData(prev => ({ ...prev, companyPhone: e.target.value }))}
                      data-testid="input-company-phone"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyAddress">Şirket Adresi</Label>
                  <Input
                    id="companyAddress"
                    value={formData.companyAddress}
                    onChange={(e) => setFormData(prev => ({ ...prev, companyAddress: e.target.value }))}
                    data-testid="input-company-address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyEmail">Şirket E-posta</Label>
                  <Input
                    id="companyEmail"
                    type="email"
                    value={formData.companyEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, companyEmail: e.target.value }))}
                    data-testid="input-company-email"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="mr-2 h-5 w-5" />
                  Çalışma Saatleri
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="workStart">Başlama Saati</Label>
                    <Input
                      id="workStart"
                      type="time"
                      value={formData.workHours.start}
                      onChange={(e) => updateFormData('workHours', 'start', e.target.value)}
                      data-testid="input-work-start"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="workEnd">Bitiş Saati</Label>
                    <Input
                      id="workEnd"
                      type="time"
                      value={formData.workHours.end}
                      onChange={(e) => updateFormData('workHours', 'end', e.target.value)}
                      data-testid="input-work-end"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lunchBreak">Öğle Molası (dakika)</Label>
                    <Input
                      id="lunchBreak"
                      type="number"
                      value={formData.workHours.lunchBreak}
                      onChange={(e) => updateFormData('workHours', 'lunchBreak', parseInt(e.target.value))}
                      data-testid="input-lunch-break"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attendance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="mr-2 h-5 w-5" />
                  Devam Takibi Ayarları
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="graceMinutes">Hoşgörü Süresi (dakika)</Label>
                  <Input
                    id="graceMinutes"
                    type="number"
                    value={formData.attendance.graceMinutes}
                    onChange={(e) => updateFormData('attendance', 'graceMinutes', parseInt(e.target.value))}
                    data-testid="input-grace-minutes"
                  />
                  <p className="text-sm text-muted-foreground">
                    Geç gelme olarak sayılmadan önce tolerans süresi
                  </p>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Otomatik Çıkış</Label>
                    <p className="text-sm text-muted-foreground">
                      Mesai saati sonunda otomatik çıkış kaydı oluştur
                    </p>
                  </div>
                  <Switch
                    checked={formData.attendance.autoClockOut}
                    onCheckedChange={(checked) => updateFormData('attendance', 'autoClockOut', checked)}
                    data-testid="switch-auto-clock-out"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Konum Kontrolü</Label>
                    <p className="text-sm text-muted-foreground">
                      QR kod okutmalarında konum doğrulaması yap
                    </p>
                  </div>
                  <Switch
                    checked={formData.attendance.requireLocationCheck}
                    onCheckedChange={(checked) => updateFormData('attendance', 'requireLocationCheck', checked)}
                    data-testid="switch-location-check"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="mr-2 h-5 w-5" />
                  Bildirim Ayarları
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center">
                      <Mail className="mr-2 h-4 w-4" />
                      E-posta Bildirimleri
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Sistem bildirimlerini e-posta ile gönder
                    </p>
                  </div>
                  <Switch
                    checked={formData.notifications.emailEnabled}
                    onCheckedChange={(checked) => updateFormData('notifications', 'emailEnabled', checked)}
                    data-testid="switch-email-notifications"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center">
                      <Phone className="mr-2 h-4 w-4" />
                      SMS Bildirimleri
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Sistem bildirimlerini SMS ile gönder
                    </p>
                  </div>
                  <Switch
                    checked={formData.notifications.smsEnabled}
                    onCheckedChange={(checked) => updateFormData('notifications', 'smsEnabled', checked)}
                    data-testid="switch-sms-notifications"
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Geç Gelme Uyarısı</Label>
                    <p className="text-sm text-muted-foreground">
                      Personel geç geldiğinde bildirim gönder
                    </p>
                  </div>
                  <Switch
                    checked={formData.notifications.lateArrivalAlert}
                    onCheckedChange={(checked) => updateFormData('notifications', 'lateArrivalAlert', checked)}
                    data-testid="switch-late-arrival-alert"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Devamsızlık Uyarısı</Label>
                    <p className="text-sm text-muted-foreground">
                      Personel hiç gelmediğinde bildirim gönder
                    </p>
                  </div>
                  <Switch
                    checked={formData.notifications.absenceAlert}
                    onCheckedChange={(checked) => updateFormData('notifications', 'absenceAlert', checked)}
                    data-testid="switch-absence-alert"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="backup" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="mr-2 h-5 w-5" />
                  Yedekleme Ayarları
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Otomatik Yedekleme</Label>
                    <p className="text-sm text-muted-foreground">
                      Sistem verilerini otomatik olarak yedekle
                    </p>
                  </div>
                  <Switch
                    checked={formData.backup.autoBackup}
                    onCheckedChange={(checked) => updateFormData('backup', 'autoBackup', checked)}
                    data-testid="switch-auto-backup"
                  />
                </div>

                {formData.backup.autoBackup && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="backupFrequency">Yedekleme Sıklığı</Label>
                      <select
                        id="backupFrequency"
                        className="w-full p-2 border rounded-md"
                        value={formData.backup.backupFrequency}
                        onChange={(e) => updateFormData('backup', 'backupFrequency', e.target.value)}
                        data-testid="select-backup-frequency"
                      >
                        <option value="daily">Günlük</option>
                        <option value="weekly">Haftalık</option>
                        <option value="monthly">Aylık</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="retentionDays">Saklama Süresi (gün)</Label>
                      <Input
                        id="retentionDays"
                        type="number"
                        value={formData.backup.retentionDays}
                        onChange={(e) => updateFormData('backup', 'retentionDays', parseInt(e.target.value))}
                        data-testid="input-retention-days"
                      />
                      <p className="text-sm text-muted-foreground">
                        Eski yedekler bu süre sonunda silinir
                      </p>
                    </div>
                  </>
                )}

                <Separator />

                <div className="space-y-2">
                  <Button variant="outline" className="w-full" data-testid="button-manual-backup">
                    <Database className="mr-2 h-4 w-4" />
                    Manuel Yedekleme Başlat
                  </Button>
                  <p className="text-sm text-muted-foreground text-center">
                    Son yedekleme: Henüz yedekleme yapılmadı
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}