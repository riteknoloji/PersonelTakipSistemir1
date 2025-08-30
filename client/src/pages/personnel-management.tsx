import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import MainLayout from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DetailModal } from "@/components/modals/detail-modal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Personnel, InsertPersonnel, Branch } from "@shared/schema";
import { Plus, Search, Edit, Eye } from "lucide-react";

export default function PersonnelManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPersonnel, setSelectedPersonnel] = useState<Personnel | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const { toast } = useToast();

  const { data: personnel = [], isLoading: personnelLoading } = useQuery<Personnel[]>({
    queryKey: ["/api/personnel", searchQuery ? { search: searchQuery } : {}],
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const createPersonnelMutation = useMutation({
    mutationFn: async (data: InsertPersonnel) => {
      const res = await apiRequest("POST", "/api/personnel", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/personnel"] });
      setShowAddModal(false);
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

  const handleAddPersonnel = () => {
    // Mock personnel data for demo
    const mockPersonnel: InsertPersonnel = {
      employeeNumber: `EMP${Date.now()}`,
      firstName: "Yeni",
      lastName: "Personel",
      phone: "05xxxxxxxxx",
      nationalId: "11111111111",
      position: "Çalışan",
      branchId: branches[0]?.id || "",
      startDate: new Date(),
      isActive: true,
    };

    createPersonnelMutation.mutate(mockPersonnel);
  };

  const filteredPersonnel = personnel.filter(p =>
    `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.employeeNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Personel Yönetimi</h1>
          <Button onClick={() => setShowAddModal(true)} data-testid="button-add-personnel">
            <Plus className="w-4 h-4 mr-2" />
            Yeni Personel
          </Button>
        </div>

        {/* Search */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-sm">
            <Input
              placeholder="Personel ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-personnel"
            />
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        {/* Personnel Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {personnelLoading ? (
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
          ) : filteredPersonnel.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">Personel bulunamadı</p>
            </div>
          ) : (
            filteredPersonnel.map((person) => (
              <Card
                key={person.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedPersonnel(person)}
                data-testid={`card-personnel-${person.id}`}
              >
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {person.firstName} {person.lastName}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {person.employeeNumber}
                        </p>
                      </div>
                      <Badge variant={person.isActive ? "default" : "secondary"}>
                        {person.isActive ? "Aktif" : "Pasif"}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm">
                        <span className="font-medium">Pozisyon:</span> {person.position}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Departman:</span> {person.department || "Belirtilmemiş"}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Telefon:</span> {person.phone}
                      </p>
                    </div>

                    <div className="flex space-x-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPersonnel(person);
                        }}
                        data-testid={`button-view-${person.id}`}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Görüntüle
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle edit
                        }}
                        data-testid={`button-edit-${person.id}`}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Düzenle
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Personnel Detail Modal */}
      <DetailModal
        open={!!selectedPersonnel}
        onOpenChange={(open) => !open && setSelectedPersonnel(null)}
        title="Personel Detayları"
      >
        {selectedPersonnel && (
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Ad Soyad</label>
                <p className="mt-1 text-foreground">
                  {selectedPersonnel.firstName} {selectedPersonnel.lastName}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Personel No</label>
                <p className="mt-1 text-foreground">{selectedPersonnel.employeeNumber}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Pozisyon</label>
                <p className="mt-1 text-foreground">{selectedPersonnel.position}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Departman</label>
                <p className="mt-1 text-foreground">{selectedPersonnel.department || "Belirtilmemiş"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Telefon</label>
                <p className="mt-1 text-foreground">{selectedPersonnel.phone}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">E-posta</label>
                <p className="mt-1 text-foreground">{selectedPersonnel.email || "Belirtilmemiş"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">TC Kimlik No</label>
                <p className="mt-1 text-foreground">{selectedPersonnel.nationalId}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">İşe Başlama</label>
                <p className="mt-1 text-foreground">
                  {new Date(selectedPersonnel.startDate).toLocaleDateString('tr-TR')}
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              <Button data-testid="button-edit-personnel">
                Düzenle
              </Button>
              <Button variant="secondary" data-testid="button-view-attendance">
                Devam Bilgileri
              </Button>
              <Button variant="secondary" data-testid="button-view-leaves">
                İzin Bilgileri
              </Button>
            </div>
          </div>
        )}
      </DetailModal>

      {/* Add Personnel Modal */}
      <DetailModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        title="Yeni Personel Ekle"
      >
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Gerçek uygulamada burada personel ekleme formu olacaktır.
          </p>
          <div className="flex space-x-3">
            <Button 
              onClick={handleAddPersonnel}
              disabled={createPersonnelMutation.isPending}
              data-testid="button-confirm-add-personnel"
            >
              {createPersonnelMutation.isPending ? "Ekleniyor..." : "Demo Personel Ekle"}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowAddModal(false)}
              data-testid="button-cancel-add"
            >
              İptal
            </Button>
          </div>
        </div>
      </DetailModal>
    </MainLayout>
  );
}
