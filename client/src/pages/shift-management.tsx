import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import MainLayout from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DetailModal } from "@/components/modals/detail-modal";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Shift, InsertShift, insertShiftSchema, Branch } from "@shared/schema";
import { Plus, Clock, Sunrise, Sun, Sunset, Moon, Edit, Eye } from "lucide-react";
import { z } from "zod";

const shiftFormSchema = insertShiftSchema.extend({
  name: z.string().min(2, "Vardiya adı en az 2 karakter olmalıdır"),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Geçerli saat formatı: HH:MM"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Geçerli saat formatı: HH:MM"),
});

type ShiftForm = z.infer<typeof shiftFormSchema>;

const shiftTypeIcons = {
  sabah: Sunrise,
  oglen: Sun,
  aksam: Sunset,
  gece: Moon,
};

const shiftTypeLabels = {
  sabah: "Sabah",
  oglen: "Öğlen",
  aksam: "Akşam",
  gece: "Gece",
};

const shiftTypeColors = {
  sabah: "text-orange-500",
  oglen: "text-yellow-500",
  aksam: "text-purple-500",
  gece: "text-blue-500",
};

export default function ShiftManagement() {
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: shifts = [], isLoading: shiftsLoading } = useQuery<Shift[]>({
    queryKey: ["/api/shifts"],
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const form = useForm<ShiftForm>({
    resolver: zodResolver(shiftFormSchema),
    defaultValues: {
      name: "",
      type: "sabah",
      startTime: "",
      endTime: "",
      branchId: "",
      isActive: true,
    },
  });

  const createShiftMutation = useMutation({
    mutationFn: async (data: InsertShift) => {
      const res = await apiRequest("POST", "/api/shifts", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      setShowAddModal(false);
      form.reset();
      toast({
        title: "Başarılı",
        description: "Vardiya başarıyla eklendi",
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

  const updateShiftMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Shift> }) => {
      const res = await apiRequest("PUT", `/api/shifts/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      setShowEditModal(false);
      setSelectedShift(null);
      form.reset();
      toast({
        title: "Başarılı",
        description: "Vardiya başarıyla güncellendi",
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

  const handleAddShift = (data: ShiftForm) => {
    createShiftMutation.mutate(data);
  };

  const handleEditShift = (data: ShiftForm) => {
    if (selectedShift) {
      updateShiftMutation.mutate({
        id: selectedShift.id,
        data,
      });
    }
  };

  const openAddModal = () => {
    form.reset();
    if (user?.role === 'branch_admin' && user.branchId) {
      form.setValue('branchId', user.branchId);
    }
    setShowAddModal(true);
  };

  const openEditModal = (shift: Shift) => {
    setSelectedShift(shift);
    form.reset({
      name: shift.name,
      type: shift.type,
      startTime: shift.startTime,
      endTime: shift.endTime,
      branchId: shift.branchId,
      isActive: shift.isActive,
    });
    setShowEditModal(true);
  };

  const getBranchName = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    return branch?.name || "Bilinmeyen Şube";
  };

  const canManageShifts = user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'branch_admin';
  const availableBranches = user?.role === 'branch_admin' && user.branchId
    ? branches.filter(b => b.id === user.branchId)
    : branches;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Vardiya Yönetimi</h1>
            <p className="text-muted-foreground mt-1">
              Çalışma vardiyalarını oluşturun ve yönetin
            </p>
          </div>
          {canManageShifts && (
            <Button onClick={openAddModal} data-testid="button-add-shift">
              <Plus className="w-4 h-4 mr-2" />
              Yeni Vardiya
            </Button>
          )}
        </div>

        {/* Shifts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shiftsLoading ? (
            // Loading skeletons
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : shifts.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Henüz vardiya eklenmemiş</p>
              {canManageShifts && (
                <Button onClick={openAddModal} className="mt-4" data-testid="button-add-first-shift">
                  <Plus className="w-4 h-4 mr-2" />
                  İlk Vardiyayı Ekle
                </Button>
              )}
            </div>
          ) : (
            shifts.map((shift) => {
              const IconComponent = shiftTypeIcons[shift.type];
              const typeColor = shiftTypeColors[shift.type];
              const typeLabel = shiftTypeLabels[shift.type];

              return (
                <Card
                  key={shift.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setSelectedShift(shift)}
                  data-testid={`card-shift-${shift.id}`}
                >
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className={`w-10 h-10 ${typeColor.replace('text-', 'bg-')}/10 rounded-lg flex items-center justify-center`}>
                            <IconComponent className={`w-5 h-5 ${typeColor}`} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{shift.name}</h3>
                            <Badge variant="outline" className="mt-1">
                              {typeLabel}
                            </Badge>
                          </div>
                        </div>
                        <Badge variant={shift.isActive ? "default" : "secondary"}>
                          {shift.isActive ? "Aktif" : "Pasif"}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Başlangıç:</span>
                          <span className="font-medium">{shift.startTime}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Bitiş:</span>
                          <span className="font-medium">{shift.endTime}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Şube:</span>
                          <span className="font-medium">{getBranchName(shift.branchId)}</span>
                        </div>
                      </div>

                      <div className="flex space-x-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedShift(shift);
                          }}
                          data-testid={`button-view-${shift.id}`}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Görüntüle
                        </Button>
                        {canManageShifts && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(shift);
                            }}
                            data-testid={`button-edit-${shift.id}`}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Düzenle
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Shift Detail Modal */}
      <DetailModal
        open={!!selectedShift && !showEditModal}
        onOpenChange={(open) => !open && setSelectedShift(null)}
        title="Vardiya Detayları"
      >
        {selectedShift && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Vardiya Adı</label>
                <p className="mt-1 text-foreground">{selectedShift.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Tip</label>
                <Badge variant="outline" className="mt-1">
                  {shiftTypeLabels[selectedShift.type]}
                </Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Başlangıç Saati</label>
                <p className="mt-1 text-foreground">{selectedShift.startTime}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Bitiş Saati</label>
                <p className="mt-1 text-foreground">{selectedShift.endTime}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Şube</label>
                <p className="mt-1 text-foreground">{getBranchName(selectedShift.branchId)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Durum</label>
                <Badge variant={selectedShift.isActive ? "default" : "secondary"} className="mt-1">
                  {selectedShift.isActive ? "Aktif" : "Pasif"}
                </Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Oluşturulma Tarihi</label>
                <p className="mt-1 text-foreground">
                  {new Date(selectedShift.createdAt).toLocaleDateString('tr-TR')}
                </p>
              </div>
            </div>

            {canManageShifts && (
              <div className="flex space-x-3">
                <Button
                  onClick={() => openEditModal(selectedShift)}
                  data-testid="button-edit-shift"
                >
                  Düzenle
                </Button>
                <Button variant="secondary" data-testid="button-assign-personnel">
                  Personel Atama
                </Button>
              </div>
            )}
          </div>
        )}
      </DetailModal>

      {/* Add/Edit Shift Modal */}
      <DetailModal
        open={showAddModal || showEditModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddModal(false);
            setShowEditModal(false);
            setSelectedShift(null);
            form.reset();
          }
        }}
        title={showEditModal ? "Vardiya Düzenle" : "Yeni Vardiya Ekle"}
      >
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(showEditModal ? handleEditShift : handleAddShift)}
            className="space-y-6"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vardiya Adı *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Vardiya adını girin"
                      {...field}
                      data-testid="input-shift-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vardiya Tipi *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-shift-type">
                        <SelectValue placeholder="Vardiya tipini seçin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="sabah">Sabah</SelectItem>
                      <SelectItem value="oglen">Öğlen</SelectItem>
                      <SelectItem value="aksam">Akşam</SelectItem>
                      <SelectItem value="gece">Gece</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Başlangıç Saati *</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                        data-testid="input-shift-start-time"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bitiş Saati *</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                        data-testid="input-shift-end-time"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="branchId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Şube *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-shift-branch">
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

            <div className="flex space-x-3">
              <Button
                type="submit"
                disabled={createShiftMutation.isPending || updateShiftMutation.isPending}
                data-testid="button-submit-shift"
              >
                {createShiftMutation.isPending || updateShiftMutation.isPending
                  ? "Kaydediliyor..."
                  : showEditModal
                  ? "Güncelle"
                  : "Ekle"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setSelectedShift(null);
                  form.reset();
                }}
                data-testid="button-cancel-shift"
              >
                İptal
              </Button>
            </div>
          </form>
        </Form>
      </DetailModal>
    </MainLayout>
  );
}
