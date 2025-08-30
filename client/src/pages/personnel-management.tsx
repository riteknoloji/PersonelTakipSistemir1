import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import MainLayout from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PersonnelModal } from "@/components/modals/personnel-modal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Personnel, InsertPersonnel, Branch } from "@shared/schema";
import { Plus, Search, Edit, Eye } from "lucide-react";

export default function PersonnelManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPersonnel, setSelectedPersonnel] = useState<Personnel | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'add'>('view');
  const [showModal, setShowModal] = useState(false);
  const { toast } = useToast();

  const { data: personnel = [], isLoading: personnelLoading } = useQuery<Personnel[]>({
    queryKey: ["/api/personnel", searchQuery ? { search: searchQuery } : {}],
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const handleAddPersonnel = () => {
    setSelectedPersonnel(null);
    setModalMode('add');
    setShowModal(true);
  };

  const handleViewPersonnel = (person: Personnel) => {
    setSelectedPersonnel(person);
    setModalMode('view');
    setShowModal(true);
  };

  const handleEditPersonnel = (person: Personnel) => {
    setSelectedPersonnel(person);
    setModalMode('edit');
    setShowModal(true);
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
          <Button onClick={handleAddPersonnel} data-testid="button-add-personnel">
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

        {/* Personnel Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Personel Numarası</TableHead>
                  <TableHead>Ad Soyad</TableHead>
                  <TableHead>Pozisyon</TableHead>
                  <TableHead>Departman</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Şube</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {personnelLoading ? (
                  // Loading skeletons
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="h-4 bg-muted rounded w-20 animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-32 animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-24 animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-20 animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-24 animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-20 animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-16 animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-20 animate-pulse" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredPersonnel.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <p className="text-muted-foreground">Personel bulunamadı</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPersonnel.map((person) => (
                    <TableRow
                      key={person.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleViewPersonnel(person)}
                      data-testid={`row-personnel-${person.id}`}
                    >
                      <TableCell className="font-medium">{person.employeeNumber}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{person.firstName} {person.lastName}</div>
                          <div className="text-sm text-muted-foreground">{person.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{person.position}</TableCell>
                      <TableCell>{person.department || "Belirtilmemiş"}</TableCell>
                      <TableCell>{person.phone}</TableCell>
                      <TableCell>{branches.find(b => b.id === person.branchId)?.name || "Belirtilmemiş"}</TableCell>
                      <TableCell>
                        <Badge variant={person.isActive ? "default" : "secondary"}>
                          {person.isActive ? "Aktif" : "Pasif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex space-x-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewPersonnel(person);
                            }}
                            data-testid={`button-view-${person.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditPersonnel(person);
                            }}
                            data-testid={`button-edit-${person.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Personnel Modal */}
      <PersonnelModal
        personnel={selectedPersonnel}
        open={showModal}
        onOpenChange={setShowModal}
        mode={modalMode}
      />
    </MainLayout>
  );
}
