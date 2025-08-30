import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Personnel, InsertPersonnel, insertPersonnelSchema, Branch, Attendance, LeaveRequest } from "@shared/schema";
import { User, Clock, Calendar, FileText, Phone, Mail, MapPin, Building } from "lucide-react";
import { z } from "zod";

const personnelFormSchema = insertPersonnelSchema.extend({
  firstName: z.string().min(2, "Ad en az 2 karakter olmalıdır"),
  lastName: z.string().min(2, "Soyad en az 2 karakter olmalıdır"),
  phone: z.string().min(10, "Telefon numarası en az 10 karakter olmalıdır"),
  nationalId: z.string().length(11, "TC Kimlik No 11 karakter olmalıdır"),
  position: z.string().min(2, "Pozisyon en az 2 karakter olmalıdır"),
});

type PersonnelForm = z.infer<typeof personnelFormSchema>;

interface PersonnelModalProps {
  personnel: Personnel | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'view' | 'edit' | 'add';
}

export function PersonnelModal({ personnel, open, onOpenChange, mode }: PersonnelModalProps) {
  const [activeTab, setActiveTab] = useState("profile");
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const { data: attendanceRecords = [] } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance", { personnelId: personnel?.id }],
    enabled: !!personnel && mode === 'view',
  });

  const { data: leaveRequests = [] } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/leave-requests", { personnelId: personnel?.id }],
    enabled: !!personnel && mode === 'view',
  });

  const form = useForm<PersonnelForm>({
    resolver: zodResolver(personnelFormSchema),
    defaultValues: {
      employeeNumber: "",
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      nationalId: "",
      position: "",
      department: "",
      branchId: "",
      startDate: new Date(),
      salary: 0,
      isActive: true,
    },
  });

  // Reset form when personnel or mode changes
  React.useEffect(() => {
    if (personnel && (mode === 'edit' || mode === 'view')) {
      form.reset({
        employeeNumber: personnel.employeeNumber,
        firstName: personnel.firstName,
        lastName: personnel.lastName,
        phone: personnel.phone,
        email: personnel.email || "",
        nationalId: personnel.nationalId,
        position: personnel.position,
        department: personnel.department || "",
        branchId: personnel.branchId,
        startDate: new Date(personnel.startDate),
        salary: personnel.salary || 0,
        isActive: personnel.isActive,
      });
    } else if (mode === 'add') {
      form.reset();
      // Set default branch for branch admin
      if (user?.role === 'branch_admin' && user.branchId) {
        form.setValue('branchId', user.branchId);
      }
    }
  }, [personnel, mode, form, user]);

  const createPersonnelMutation = useMutation({
    mutationFn: async (data: InsertPersonnel) => {
      const res = await apiRequest("POST", "/api/personnel", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/personnel"] });
      onOpenChange(false);
      toast({
        title: "Başarılı",
        description: "Personel başarıyla eklendi",
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

  const updatePersonnelMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Personnel> }) => {
      const res = await apiRequest("PUT", `/api/personnel/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/personnel"] });
      onOpenChange(false);
      toast({
        title: "Başarılı",
        description: "Personel başarıyla güncellendi",
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

  const handleSubmit = (data: PersonnelForm) => {
    if (mode === 'add') {
      createPersonnelMutation.mutate(data);
    } else if (mode === 'edit' && personnel) {
      updatePersonnelMutation.mutate({
        id: personnel.id,
        data,
      });
    }
  };

  const getBranchName = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    return branch?.name || "Bilinmeyen Şube";
  };

  const availableBranches = user?.role === 'branch_admin' && user.branchId
    ? branches.filter(b => b.id === user.branchId)
    : branches;

  const getTitle = () => {
    switch (mode) {
      case 'add': return "Yeni Personel Ekle";
      case 'edit': return "Personel Düzenle";
      case 'view': return "Personel Detayları";
      default: return "Personel";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="modal-personnel">
        <DialogHeader>
          <DialogTitle data-testid="text-personnel-modal-title">{getTitle()}</DialogTitle>
          <DialogDescription>
            {mode === 'view' 
              ? "Personel bilgilerini görüntüleyin ve yönetin"
              : mode === 'edit'
              ? "Personel bilgilerini düzenleyin"
              : "Yeni personel bilgilerini girin"
            }
          </DialogDescription>
        </DialogHeader>

        {mode === 'view' && personnel ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile" data-testid="tab-profile">
                <User className="w-4 h-4 mr-2" />
                Profil
              </TabsTrigger>
              <TabsTrigger value="attendance" data-testid="tab-attendance">
                <Clock className="w-4 h-4 mr-2" />
                Devam
              </TabsTrigger>
              <TabsTrigger value="leaves" data-testid="tab-leaves">
                <Calendar className="w-4 h-4 mr-2" />
                İzinler
              </TabsTrigger>
              <TabsTrigger value="documents" data-testid="tab-documents">
                <FileText className="w-4 h-4 mr-2" />
                Belgeler
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <User className="w-5 h-5 mr-2" />
                      Kişisel Bilgiler
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Ad</label>
                        <p className="mt-1 text-foreground">{personnel.firstName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Soyad</label>
                        <p className="mt-1 text-foreground">{personnel.lastName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">TC Kimlik No</label>
                        <p className="mt-1 text-foreground">{personnel.nationalId}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Doğum Tarihi</label>
                        <p className="mt-1 text-foreground">
                          {personnel.birthDate ? new Date(personnel.birthDate).toLocaleDateString('tr-TR') : "Belirtilmemiş"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Building className="w-5 h-5 mr-2" />
                      İş Bilgileri
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Personel No</label>
                        <p className="mt-1 text-foreground">{personnel.employeeNumber}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Pozisyon</label>
                        <p className="mt-1 text-foreground">{personnel.position}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Departman</label>
                        <p className="mt-1 text-foreground">{personnel.department || "Belirtilmemiş"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Şube</label>
                        <p className="mt-1 text-foreground">{getBranchName(personnel.branchId)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Phone className="w-5 h-5 mr-2" />
                    İletişim Bilgileri
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Telefon</label>
                      <p className="mt-1 text-foreground">{personnel.phone}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">E-posta</label>
                      <p className="mt-1 text-foreground">{personnel.email || "Belirtilmemiş"}</p>
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-muted-foreground">Adres</label>
                      <p className="mt-1 text-foreground">{personnel.address || "Belirtilmemiş"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex space-x-3">
                <Button onClick={() => onOpenChange(false)} data-testid="button-edit-personnel-profile">
                  Düzenle
                </Button>
                <Button variant="secondary" data-testid="button-personnel-reports">
                  Raporları Görüntüle
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="attendance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Son Devam Kayıtları</CardTitle>
                </CardHeader>
                <CardContent>
                  {attendanceRecords.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      Henüz devam kaydı bulunmamaktadır
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {attendanceRecords.slice(0, 10).map((record) => (
                        <div key={record.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div>
                            <p className="font-medium">
                              {new Date(record.date).toLocaleDateString('tr-TR')}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {record.location || "Lokasyon belirtilmemiş"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm">
                              Giriş: {record.checkIn ? new Date(record.checkIn).toLocaleTimeString('tr-TR') : "-"}
                            </p>
                            <p className="text-sm">
                              Çıkış: {record.checkOut ? new Date(record.checkOut).toLocaleTimeString('tr-TR') : "-"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="leaves" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>İzin Talepleri</CardTitle>
                </CardHeader>
                <CardContent>
                  {leaveRequests.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      Henüz izin talebi bulunmamaktadır
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {leaveRequests.map((request) => (
                        <div key={request.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div>
                            <p className="font-medium">{request.type}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(request.startDate).toLocaleDateString('tr-TR')} - {new Date(request.endDate).toLocaleDateString('tr-TR')}
                            </p>
                            {request.reason && (
                              <p className="text-sm text-muted-foreground mt-1">{request.reason}</p>
                            )}
                          </div>
                          <Badge 
                            variant={
                              request.status === 'approved' ? 'default' : 
                              request.status === 'rejected' ? 'destructive' : 
                              'secondary'
                            }
                          >
                            {request.status === 'approved' ? 'Onaylandı' :
                             request.status === 'rejected' ? 'Reddedildi' :
                             'Beklemede'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Belgeler</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center py-4">
                    Belge yönetimi özelliği yakında eklenecektir
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          // Add/Edit Form
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ad *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ad"
                          {...field}
                          data-testid="input-personnel-first-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Soyad *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Soyad"
                          {...field}
                          data-testid="input-personnel-last-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nationalId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>TC Kimlik No *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="12345678901"
                          {...field}
                          data-testid="input-personnel-national-id"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefon *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="05xxxxxxxxx"
                          {...field}
                          data-testid="input-personnel-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-posta</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="ornek@email.com"
                          {...field}
                          data-testid="input-personnel-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pozisyon *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Pozisyon"
                          {...field}
                          data-testid="input-personnel-position"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Departman</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Departman"
                          {...field}
                          data-testid="input-personnel-department"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="branchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Şube *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-personnel-branch">
                            <SelectValue placeholder="Şube seçin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableBranches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex space-x-3">
                <Button
                  type="submit"
                  disabled={createPersonnelMutation.isPending || updatePersonnelMutation.isPending}
                  data-testid="button-submit-personnel"
                >
                  {createPersonnelMutation.isPending || updatePersonnelMutation.isPending
                    ? "Kaydediliyor..."
                    : mode === 'edit'
                    ? "Güncelle"
                    : "Ekle"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  data-testid="button-cancel-personnel"
                >
                  İptal
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
