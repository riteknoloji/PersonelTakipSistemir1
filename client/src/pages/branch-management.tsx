import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import MainLayout from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DetailModal } from "@/components/modals/detail-modal";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Branch, InsertBranch, insertBranchSchema } from "@shared/schema";
import { Plus, Building, MapPin, Phone, Edit, Eye, Trash2 } from "lucide-react";
import { z } from "zod";

const branchFormSchema = insertBranchSchema.extend({
  name: z.string().min(2, "Şube adı en az 2 karakter olmalıdır"),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type BranchForm = z.infer<typeof branchFormSchema>;

export default function BranchManagement() {
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: branches = [], isLoading: branchesLoading } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const form = useForm<BranchForm>({
    resolver: zodResolver(branchFormSchema),
    defaultValues: {
      name: "",
      address: "",
      phone: "",
      parentBranchId: "",
      isActive: true,
    },
  });

  const createBranchMutation = useMutation({
    mutationFn: async (data: InsertBranch) => {
      const res = await apiRequest("POST", "/api/branches", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branches"] });
      setShowAddModal(false);
      form.reset();
      toast({
        title: "Başarılı",
        description: "Şube başarıyla eklendi",
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

  const updateBranchMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Branch> }) => {
      const res = await apiRequest("PUT", `/api/branches/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branches"] });
      setShowEditModal(false);
      setSelectedBranch(null);
      form.reset();
      toast({
        title: "Başarılı",
        description: "Şube başarıyla güncellendi",
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

  const handleAddBranch = (data: BranchForm) => {
    createBranchMutation.mutate(data);
  };

  const handleEditBranch = (data: BranchForm) => {
    if (selectedBranch) {
      updateBranchMutation.mutate({
        id: selectedBranch.id,
        data,
      });
    }
  };

  const openAddModal = () => {
    form.reset();
    setShowAddModal(true);
  };

  const openEditModal = (branch: Branch) => {
    setSelectedBranch(branch);
    form.reset({
      name: branch.name,
      address: branch.address || "",
      phone: branch.phone || "",
      parentBranchId: branch.parentBranchId || "",
      isActive: branch.isActive,
    });
    setShowEditModal(true);
  };

  // Filter parent branches (exclude sub-branches for parent selection)
  const parentBranches = branches.filter(branch => !branch.parentBranchId);

  const canManageBranches = user?.role === 'super_admin' || user?.role === 'admin';

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Şube Yönetimi</h1>
            <p className="text-muted-foreground mt-1">
              Şubelerinizi ve alt şubelerinizi yönetin
            </p>
          </div>
          {canManageBranches && (
            <Button onClick={openAddModal} data-testid="button-add-branch">
              <Plus className="w-4 h-4 mr-2" />
              Yeni Şube
            </Button>
          )}
        </div>

        {/* Branches Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {branchesLoading ? (
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
          ) : branches.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Building className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Henüz şube eklenmemiş</p>
              {canManageBranches && (
                <Button onClick={openAddModal} className="mt-4" data-testid="button-add-first-branch">
                  <Plus className="w-4 h-4 mr-2" />
                  İlk Şubeyi Ekle
                </Button>
              )}
            </div>
          ) : (
            branches.map((branch) => (
              <Card
                key={branch.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedBranch(branch)}
                data-testid={`card-branch-${branch.id}`}
              >
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Building className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{branch.name}</h3>
                          {branch.parentBranchId && (
                            <Badge variant="secondary" className="mt-1">
                              Alt Şube
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Badge variant={branch.isActive ? "default" : "secondary"}>
                        {branch.isActive ? "Aktif" : "Pasif"}
                      </Badge>
                    </div>

                    {branch.address && (
                      <div className="flex items-start space-x-2">
                        <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {branch.address}
                        </p>
                      </div>
                    )}

                    {branch.phone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          {branch.phone}
                        </p>
                      </div>
                    )}

                    <div className="flex space-x-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBranch(branch);
                        }}
                        data-testid={`button-view-${branch.id}`}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Görüntüle
                      </Button>
                      {canManageBranches && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(branch);
                          }}
                          data-testid={`button-edit-${branch.id}`}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Düzenle
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Branch Detail Modal */}
      <DetailModal
        open={!!selectedBranch && !showEditModal}
        onOpenChange={(open) => !open && setSelectedBranch(null)}
        title="Şube Detayları"
      >
        {selectedBranch && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Şube Adı</label>
                <p className="mt-1 text-foreground">{selectedBranch.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Durum</label>
                <Badge variant={selectedBranch.isActive ? "default" : "secondary"} className="mt-1">
                  {selectedBranch.isActive ? "Aktif" : "Pasif"}
                </Badge>
              </div>
              {selectedBranch.address && (
                <div className="col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Adres</label>
                  <p className="mt-1 text-foreground">{selectedBranch.address}</p>
                </div>
              )}
              {selectedBranch.phone && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Telefon</label>
                  <p className="mt-1 text-foreground">{selectedBranch.phone}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Oluşturulma Tarihi</label>
                <p className="mt-1 text-foreground">
                  {new Date(selectedBranch.createdAt).toLocaleDateString('tr-TR')}
                </p>
              </div>
            </div>

            {canManageBranches && (
              <div className="flex space-x-3">
                <Button
                  onClick={() => openEditModal(selectedBranch)}
                  data-testid="button-edit-branch"
                >
                  Düzenle
                </Button>
                <Button variant="secondary" data-testid="button-view-branch-personnel">
                  Personel Listesi
                </Button>
              </div>
            )}
          </div>
        )}
      </DetailModal>

      {/* Add/Edit Branch Modal */}
      <DetailModal
        open={showAddModal || showEditModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddModal(false);
            setShowEditModal(false);
            setSelectedBranch(null);
            form.reset();
          }
        }}
        title={showEditModal ? "Şube Düzenle" : "Yeni Şube Ekle"}
      >
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(showEditModal ? handleEditBranch : handleAddBranch)}
            className="space-y-6"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Şube Adı *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Şube adını girin"
                      {...field}
                      data-testid="input-branch-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="parentBranchId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ana Şube</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger data-testid="select-parent-branch">
                        <SelectValue placeholder="Ana şube seçin (isteğe bağlı)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">Ana Şube Yok</SelectItem>
                      {parentBranches.map((branch) => (
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

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adres</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Şube adresini girin"
                      {...field}
                      data-testid="input-branch-address"
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
                  <FormLabel>Telefon</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="0212 xxx xx xx"
                      {...field}
                      data-testid="input-branch-phone"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex space-x-3">
              <Button
                type="submit"
                disabled={createBranchMutation.isPending || updateBranchMutation.isPending}
                data-testid="button-submit-branch"
              >
                {createBranchMutation.isPending || updateBranchMutation.isPending
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
                  setSelectedBranch(null);
                  form.reset();
                }}
                data-testid="button-cancel-branch"
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
