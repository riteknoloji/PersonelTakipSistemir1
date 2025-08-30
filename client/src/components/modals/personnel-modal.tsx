import { useState } from "react";
import * as React from "react";
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
import { Personnel, InsertPersonnel, insertPersonnelSchema, Branch, Attendance, LeaveRequest, PersonnelDocument, PersonnelFinancialInfo, PersonnelEducation } from "@shared/schema";
import { User, Clock, Calendar, FileText, Phone, Mail, MapPin, Building, CreditCard, GraduationCap, Briefcase, UserCheck, CalendarDays, FolderOpen, Upload, Camera } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState("general");
  const [isEditingTab, setIsEditingTab] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
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

  // Main form for add/edit modes
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
      form.reset({
        employeeNumber: `EMP${Date.now()}`,
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        nationalId: "",
        position: "",
        department: "",
        branchId: user?.role === 'branch_admin' && user.branchId ? user.branchId : "",
        startDate: new Date(),
        salary: 0,
        isActive: true,
      });
    }
  }, [personnel, mode, form, user]);

  // Inline editing form for view mode tabs
  const tabEditForm = useForm<PersonnelForm>({
    resolver: zodResolver(personnelFormSchema),
    defaultValues: personnel ? {
      employeeNumber: personnel.employeeNumber,
      firstName: personnel.firstName,
      lastName: personnel.lastName,
      phone: personnel.phone,
      email: personnel.email || "",
      nationalId: personnel.nationalId,
      position: personnel.position,
      department: personnel.department || "",
      branchId: personnel.branchId || "",
      startDate: personnel.startDate ? new Date(personnel.startDate) : new Date(),
      salary: personnel.salary || 0,
      isActive: personnel.isActive,
      address: personnel.address || "",
      birthDate: personnel.birthDate ? new Date(personnel.birthDate) : undefined,
    } : {},
  });

  // Reset tab edit form when personnel changes
  React.useEffect(() => {
    if (personnel) {
      tabEditForm.reset({
        employeeNumber: personnel.employeeNumber,
        firstName: personnel.firstName,
        lastName: personnel.lastName,
        phone: personnel.phone,
        email: personnel.email || "",
        nationalId: personnel.nationalId,
        position: personnel.position,
        department: personnel.department || "",
        branchId: personnel.branchId || "",
        startDate: personnel.startDate ? new Date(personnel.startDate) : new Date(),
        salary: personnel.salary || 0,
        isActive: personnel.isActive,
        address: personnel.address || "",
        birthDate: personnel.birthDate ? new Date(personnel.birthDate) : undefined,
      });
    }
  }, [personnel, tabEditForm]);

  // Tab editing mutation for saving tab data
  const updateTabDataMutation = useMutation({
    mutationFn: async (data: Partial<PersonnelForm>) => {
      if (!personnel) throw new Error("No personnel selected");
      const res = await apiRequest("PUT", `/api/personnel/${personnel.id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Personel bilgileri güncellendi",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/personnel"] });
      setIsEditingTab(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message || "Güncelleme sırasında bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  // Photo upload mutation
  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!personnel) throw new Error("No personnel selected");
      const formData = new FormData();
      formData.append('photo', file);
      
      const res = await fetch(`/api/personnel/${personnel.id}/photo`, {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) {
        throw new Error('Fotoğraf yükleme başarısız');
      }
      
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Profil fotoğrafı güncellendi",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/personnel"] });
      setPhotoFile(null);
      setPhotoPreview(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message || "Fotoğraf yükleme sırasında bir hata oluştu",
        variant: "destructive",
      });
    },
  });

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

  // Handle photo file selection
  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Hata",
          description: "Lütfen geçerli bir resim dosyası seçin",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Hata",
          description: "Dosya boyutu 5MB'dan küçük olmalıdır",
          variant: "destructive",
        });
        return;
      }
      
      setPhotoFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload photo
  const handlePhotoUpload = () => {
    if (photoFile) {
      uploadPhotoMutation.mutate(photoFile);
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
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="general" data-testid="tab-general">
                <User className="w-4 h-4 mr-2" />
                Genel Bilgi
              </TabsTrigger>
              <TabsTrigger value="financial" data-testid="tab-financial">
                <CreditCard className="w-4 h-4 mr-2" />
                Mali Bilgiler
              </TabsTrigger>
              <TabsTrigger value="education" data-testid="tab-education">
                <GraduationCap className="w-4 h-4 mr-2" />
                Eğitim
              </TabsTrigger>
              <TabsTrigger value="work" data-testid="tab-work">
                <Briefcase className="w-4 h-4 mr-2" />
                İş Bilgisi
              </TabsTrigger>
              <TabsTrigger value="leaves" data-testid="tab-leaves">
                <CalendarDays className="w-4 h-4 mr-2" />
                İzin Yönetimi
              </TabsTrigger>
              <TabsTrigger value="shifts" data-testid="tab-shifts">
                <Clock className="w-4 h-4 mr-2" />
                Vardiya Yönetimi
              </TabsTrigger>
              <TabsTrigger value="documents" data-testid="tab-documents">
                <FolderOpen className="w-4 h-4 mr-2" />
                Belge Yönetimi
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6">
              {/* Profile Photo Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Camera className="w-5 h-5 mr-2" />
                    Profil Fotoğrafı
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center space-x-6">
                  <div className="flex-shrink-0">
                    <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                      {photoPreview ? (
                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : personnel?.profilePhotoUrl ? (
                        <img src={personnel.profilePhotoUrl} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-12 h-12 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 space-y-3">
                    {isEditingTab ? (
                      <div className="space-y-2">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoChange}
                          className="cursor-pointer"
                          data-testid="input-profile-photo"
                        />
                        {photoFile && (
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={handlePhotoUpload}
                              disabled={uploadPhotoMutation.isPending}
                              data-testid="button-upload-photo"
                            >
                              {uploadPhotoMutation.isPending ? "Yükleniyor..." : "Fotoğrafı Yükle"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setPhotoFile(null);
                                setPhotoPreview(null);
                              }}
                              data-testid="button-cancel-photo"
                            >
                              İptal
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        {personnel?.profilePhotoUrl 
                          ? "Profil fotoğrafı mevcut"
                          : "Profil fotoğrafı eklenmemiş"
                        }
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <User className="w-5 h-5 mr-2" />
                      Kişisel Bilgiler
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isEditingTab ? (
                      <Form {...tabEditForm}>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={tabEditForm.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Ad</FormLabel>
                                <FormControl>
                                  <Input {...field} data-testid="input-edit-firstName" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={tabEditForm.control}
                            name="lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Soyad</FormLabel>
                                <FormControl>
                                  <Input {...field} data-testid="input-edit-lastName" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={tabEditForm.control}
                            name="nationalId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>TC Kimlik No</FormLabel>
                                <FormControl>
                                  <Input {...field} maxLength={11} data-testid="input-edit-nationalId" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={tabEditForm.control}
                            name="birthDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Doğum Tarihi</FormLabel>
                                <FormControl>
                                  <Input
                                    type="date"
                                    value={field.value ? field.value.toISOString().split('T')[0] : ''}
                                    onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                                    data-testid="input-edit-birthDate"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </Form>
                    ) : (
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
                    )}
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

              <div className="flex justify-between items-center">
                <div className="flex space-x-3">
                  <Button variant="secondary" data-testid="button-personnel-reports">
                    Raporları Görüntüle
                  </Button>
                </div>
                <div className="flex space-x-2">
                  {isEditingTab && (
                    <>
                      <Button 
                        onClick={() => {
                          const data = tabEditForm.getValues();
                          updateTabDataMutation.mutate(data);
                        }}
                        disabled={updateTabDataMutation.isPending}
                        data-testid="button-save-general-tab"
                      >
                        {updateTabDataMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setIsEditingTab(false);
                          // Reset form to original values
                          if (personnel) {
                            tabEditForm.reset({
                              employeeNumber: personnel.employeeNumber,
                              firstName: personnel.firstName,
                              lastName: personnel.lastName,
                              phone: personnel.phone,
                              email: personnel.email || "",
                              nationalId: personnel.nationalId,
                              position: personnel.position,
                              department: personnel.department || "",
                              branchId: personnel.branchId || "",
                              startDate: personnel.startDate ? new Date(personnel.startDate) : new Date(),
                              salary: personnel.salary || 0,
                              isActive: personnel.isActive,
                              address: personnel.address || "",
                              birthDate: personnel.birthDate ? new Date(personnel.birthDate) : undefined,
                            });
                          }
                        }}
                        data-testid="button-cancel-general-tab"
                      >
                        İptal
                      </Button>
                    </>
                  )}
                  <Button 
                    onClick={() => setIsEditingTab(!isEditingTab)} 
                    data-testid="button-edit-general-tab"
                    variant={isEditingTab ? "secondary" : "default"}
                  >
                    {isEditingTab ? "Görüntüleme Moduna Geç" : "Düzenleme Moduna Geç"}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="financial" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <CreditCard className="w-5 h-5 mr-2" />
                    Mali Bilgiler
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Maaş</label>
                      <p className="mt-1 text-foreground">
                        {personnel.salary ? `${personnel.salary.toLocaleString('tr-TR')} ₺` : "Belirtilmemiş"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Banka</label>
                      <p className="mt-1 text-foreground">Belirtilmemiş</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">IBAN</label>
                      <p className="mt-1 text-foreground">Belirtilmemiş</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Vergi Numarası</label>
                      <p className="mt-1 text-foreground">Belirtilmemiş</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">SGK Numarası</label>
                      <p className="mt-1 text-foreground">Belirtilmemiş</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Acil Durum İletişim</label>
                      <p className="mt-1 text-foreground">Belirtilmemiş</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="education" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="flex items-center">
                      <GraduationCap className="w-5 h-5 mr-2" />
                      Eğitim Bilgileri
                    </span>
                    <Button size="sm" data-testid="button-add-education">
                      <GraduationCap className="w-4 h-4 mr-2" />
                      Eğitim Ekle
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">Lisans - Bilgisayar Mühendisliği</h4>
                        <Badge variant="default">Tamamlandı</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">İstanbul Teknik Üniversitesi</p>
                      <p className="text-sm text-muted-foreground">2018 - 2022</p>
                      <p className="text-sm text-muted-foreground">Not Ortalaması: 3.45</p>
                      <div className="mt-3 flex space-x-2">
                        <Button size="sm" variant="outline">Düzenle</Button>
                        <Button size="sm" variant="outline">Belge Görüntüle</Button>
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">Lise - Fen Lisesi</h4>
                        <Badge variant="default">Tamamlandı</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">İstanbul Fen Lisesi</p>
                      <p className="text-sm text-muted-foreground">2014 - 2018</p>
                      <p className="text-sm text-muted-foreground">Not Ortalaması: 4.2</p>
                      <div className="mt-3 flex space-x-2">
                        <Button size="sm" variant="outline">Düzenle</Button>
                        <Button size="sm" variant="outline">Belge Görüntüle</Button>
                      </div>
                    </div>
                    
                    <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
                      <GraduationCap className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                      <h4 className="font-semibold mb-2">Yeni Eğitim Bilgisi Ekle</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Personelin eğitim geçmişini buraya ekleyebilirsiniz
                      </p>
                      <Button variant="outline" data-testid="button-add-education-record">
                        Eğitim Ekle
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="work" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Briefcase className="w-5 h-5 mr-2" />
                    İş Bilgileri
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Pozisyon</label>
                      <p className="mt-1 text-foreground">{personnel.position}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Departman</label>
                      <p className="mt-1 text-foreground">{personnel.department || "Belirtilmemiş"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">İşe Giriş Tarihi</label>
                      <p className="mt-1 text-foreground">
                        {new Date(personnel.startDate).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Çalışma Durumu</label>
                      <p className="mt-1">
                        <Badge variant={personnel.isActive ? "default" : "destructive"}>
                          {personnel.isActive ? "Aktif" : "Pasif"}
                        </Badge>
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Şube</label>
                      <p className="mt-1 text-foreground">{getBranchName(personnel.branchId)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Çalışma Süresi</label>
                      <p className="mt-1 text-foreground">
                        {Math.floor((new Date().getTime() - new Date(personnel.startDate).getTime()) / (1000 * 60 * 60 * 24 * 365))} yıl
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="shifts" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Aktif Vardiya</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-semibold">Gündüz Vardiyası</p>
                    <p className="text-sm text-muted-foreground">08:00 - 17:00</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Bu Hafta</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-semibold">5 gün</p>
                    <p className="text-sm text-muted-foreground">Toplam çalışma</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Mesai Saati</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-semibold">40 saat</p>
                    <p className="text-sm text-muted-foreground">Haftalık</p>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    Vardiya Geçmişi
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="font-medium">Gündüz Vardiyası</p>
                        <p className="text-sm text-muted-foreground">08:00 - 17:00</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">Bu Hafta</p>
                        <Badge variant="default">Aktif</Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="font-medium">Akşam Vardiyası</p>
                        <p className="text-sm text-muted-foreground">16:00 - 00:00</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">Geçen Hafta</p>
                        <Badge variant="secondary">Tamamlandı</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Toplam İzin Hakkı</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">30 gün</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Kullanılan İzin</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-orange-600">
                      {leaveRequests.filter(req => req.status === 'approved').length} gün
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Kalan İzin</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-green-600">
                      {30 - leaveRequests.filter(req => req.status === 'approved').length} gün
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <CalendarDays className="w-5 h-5 mr-2" />
                      İzin Geçmişi
                    </span>
                    <Button size="sm" data-testid="button-add-leave">
                      <Calendar className="w-4 h-4 mr-2" />
                      Yeni İzin Ekle
                    </Button>
                  </CardTitle>
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
                            <div className="flex items-center space-x-2">
                              <p className="font-medium">{request.type}</p>
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
                            <p className="text-sm text-muted-foreground">
                              {new Date(request.startDate).toLocaleDateString('tr-TR')} - {new Date(request.endDate).toLocaleDateString('tr-TR')}
                            </p>
                            {request.reason && (
                              <p className="text-sm text-muted-foreground mt-1">{request.reason}</p>
                            )}
                          </div>
                          <div className="text-right text-sm text-muted-foreground">
                            {Math.ceil((new Date(request.endDate).getTime() - new Date(request.startDate).getTime()) / (1000 * 60 * 60 * 24))} gün
                          </div>
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
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <FolderOpen className="w-5 h-5 mr-2" />
                      Belge Yönetimi
                    </span>
                    <Button size="sm" data-testid="button-add-document">
                      <FileText className="w-4 h-4 mr-2" />
                      Belge Ekle
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-5 h-5 text-blue-600" />
                          <span className="font-medium">Sağlık Raporu</span>
                        </div>
                        <Badge variant="destructive">Süresi Dolmuş</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">Son güncelleme: 15.08.2024</p>
                      <p className="text-sm text-muted-foreground">Bitiş tarihi: 15.08.2025</p>
                      <div className="mt-3 flex space-x-2">
                        <Button size="sm" variant="outline">Görüntüle</Button>
                        <Button size="sm" variant="outline">Yenile</Button>
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-5 h-5 text-green-600" />
                          <span className="font-medium">Adli Sicil Belgesi</span>
                        </div>
                        <Badge variant="default">Geçerli</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">Son güncelleme: 01.01.2025</p>
                      <p className="text-sm text-muted-foreground">Bitiş tarihi: 01.01.2026</p>
                      <div className="mt-3 flex space-x-2">
                        <Button size="sm" variant="outline">Görüntüle</Button>
                        <Button size="sm" variant="outline">Yenile</Button>
                      </div>
                    </div>
                    
                    <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
                      <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Yeni Belge Ekle</h3>
                      <p className="text-muted-foreground mb-4">
                        Personel için gerekli belgeleri yükleyebilirsiniz
                      </p>
                      <Button data-testid="button-upload-document">
                        Belge Yükle
                      </Button>
                    </div>
                  </div>
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
                          value={field.value || ""}
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
                          value={field.value || ""}
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
