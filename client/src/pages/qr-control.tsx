import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { QrCode, Scan, CheckCircle, XCircle, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import MainLayout from "@/components/layout/main-layout";
import type { Personnel, Attendance } from "@shared/schema";

export default function QRControl() {
  const [qrCode, setQrCode] = useState("");
  const [scanResult, setScanResult] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: personnel = [] } = useQuery<Personnel[]>({
    queryKey: ["/api/personnel"],
  });

  const { data: todayAttendance = [], refetch: refetchAttendance } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance/today"],
  });

  const scanQRMutation = useMutation({
    mutationFn: async (qrData: string) => {
      const res = await apiRequest("POST", "/api/qr-scan", { qrCode: qrData });
      return await res.json();
    },
    onSuccess: (data) => {
      setScanResult(`QR Kod başarıyla okundu: ${data.message}`);
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      refetchAttendance();
      toast({
        title: "Başarılı",
        description: data.message,
      });
      setQrCode("");
    },
    onError: (error: Error) => {
      setScanResult(`Hata: ${error.message}`);
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleScan = () => {
    if (!qrCode.trim()) {
      toast({
        title: "Hata",
        description: "Lütfen QR kodu girin",
        variant: "destructive",
      });
      return;
    }
    scanQRMutation.mutate(qrCode.trim());
  };

  const stats = {
    totalPresent: todayAttendance.filter(a => a.checkInTime && !a.checkOutTime).length,
    totalCheckedOut: todayAttendance.filter(a => a.checkInTime && a.checkOutTime).length,
    totalPersonnel: personnel.filter(p => p.isActive).length,
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">QR Kod Kontrol</h1>
            <p className="text-muted-foreground">Personel giriş-çıkış QR kodlarını okutun</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">İş Yerinde</CardTitle>
              <User className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="text-present-count">
                {stats.totalPresent}
              </div>
              <p className="text-xs text-muted-foreground">Aktif personel</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Çıkış Yapan</CardTitle>
              <CheckCircle className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600" data-testid="text-checked-out-count">
                {stats.totalCheckedOut}
              </div>
              <p className="text-xs text-muted-foreground">Bugün çıkış yapan</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Personel</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-personnel">
                {stats.totalPersonnel}
              </div>
              <p className="text-xs text-muted-foreground">Aktif personel sayısı</p>
            </CardContent>
          </Card>
        </div>

        {/* QR Scanner */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <QrCode className="mr-2 h-5 w-5" />
              QR Kod Okuyucu
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Input
                placeholder="QR kodu buraya girin veya okutun..."
                value={qrCode}
                onChange={(e) => setQrCode(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleScan()}
                data-testid="input-qr-code"
              />
              <Button 
                onClick={handleScan}
                disabled={scanQRMutation.isPending}
                data-testid="button-scan-qr"
              >
                <Scan className="mr-2 h-4 w-4" />
                {scanQRMutation.isPending ? "Okutluyor..." : "Okut"}
              </Button>
            </div>

            {scanResult && (
              <Alert className={scanResult.startsWith("Hata") ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}>
                <AlertDescription data-testid="text-scan-result">
                  {scanResult}
                </AlertDescription>
              </Alert>
            )}

            <div className="text-sm text-muted-foreground">
              <p>• Personel QR kodunu okutarak giriş-çıkış kaydı oluşturabilirsiniz</p>
              <p>• QR kod formatı: PERSONEL_ID format</p>
              <p>• Sistem otomatik olarak giriş/çıkış durumunu tespit eder</p>
            </div>
          </CardContent>
        </Card>

        {/* Today's Attendance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5" />
              Bugünkü Devam Durumu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {todayAttendance.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">Bugün henüz devam kaydı yok</h3>
                  <p className="text-muted-foreground">
                    İlk QR kod okutmalarını bekliyoruz.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {todayAttendance.map((attendance) => {
                    const person = personnel.find(p => p.id === attendance.personnelId);
                    const fullName = person ? `${person.firstName} ${person.lastName}` : "Bilinmeyen";
                    const isPresent = attendance.checkInTime && !attendance.checkOutTime;
                    
                    return (
                      <div 
                        key={attendance.id} 
                        className="border rounded-lg p-4 flex items-center justify-between"
                        data-testid={`card-attendance-${attendance.id}`}
                      >
                        <div className="flex items-center space-x-4">
                          <div>
                            <h3 className="font-semibold">{fullName}</h3>
                            <p className="text-sm text-muted-foreground">
                              {person?.employeeNumber || "N/A"} • {person?.position || "N/A"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <div className="text-right text-sm">
                            {attendance.checkInTime && (
                              <p>
                                <span className="font-medium">Giriş:</span> {' '}
                                {new Date(attendance.checkInTime).toLocaleTimeString('tr-TR', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            )}
                            {attendance.checkOutTime && (
                              <p>
                                <span className="font-medium">Çıkış:</span> {' '}
                                {new Date(attendance.checkOutTime).toLocaleTimeString('tr-TR', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            )}
                          </div>
                          
                          <Badge 
                            variant={isPresent ? "default" : "secondary"}
                            className={isPresent ? "bg-green-500 hover:bg-green-600" : ""}
                          >
                            {isPresent ? (
                              <>
                                <CheckCircle className="mr-1 h-3 w-3" />
                                İş Yerinde
                              </>
                            ) : (
                              <>
                                <XCircle className="mr-1 h-3 w-3" />
                                Çıkış Yapan
                              </>
                            )}
                          </Badge>
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