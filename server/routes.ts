import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertPersonnelSchema, insertBranchSchema, insertShiftSchema, insertLeaveRequestSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Middleware to check authentication
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Oturum açmanız gerekiyor" });
    }
    next();
  };

  // Middleware to check admin role
  const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Oturum açmanız gerekiyor" });
    }
    if (req.user.role === 'branch_admin') {
      return res.status(403).json({ message: "Bu işlem için yetkiniz bulunmamaktadır" });
    }
    next();
  };

  // Dashboard stats
  app.get("/api/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "İstatistikler yüklenirken hata oluştu" });
    }
  });

  // Branches
  app.get("/api/branches", requireAuth, async (req, res) => {
    try {
      const branches = await storage.getBranches();
      res.json(branches);
    } catch (error) {
      res.status(500).json({ message: "Şubeler yüklenirken hata oluştu" });
    }
  });

  app.post("/api/branches", requireAdmin, async (req, res) => {
    try {
      const validatedData = insertBranchSchema.parse(req.body);
      const branch = await storage.createBranch(validatedData);
      res.status(201).json(branch);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Şube oluşturulurken hata oluştu" });
    }
  });

  app.put("/api/branches/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const branch = await storage.updateBranch(id, req.body);
      if (!branch) {
        return res.status(404).json({ message: "Şube bulunamadı" });
      }
      res.json(branch);
    } catch (error) {
      res.status(500).json({ message: "Şube güncellenirken hata oluştu" });
    }
  });

  // Personnel
  app.get("/api/personnel", requireAuth, async (req, res) => {
    try {
      const { branchId, search } = req.query;
      let personnel;

      if (search) {
        personnel = await storage.searchPersonnel(search as string);
      } else if (branchId) {
        personnel = await storage.getPersonnelByBranch(branchId as string);
      } else {
        // Branch admins can only see their branch personnel
        if (req.user?.role === 'branch_admin' && req.user?.branchId) {
          personnel = await storage.getPersonnelByBranch(req.user.branchId);
        } else {
          personnel = await storage.getPersonnel();
        }
      }

      res.json(personnel);
    } catch (error) {
      res.status(500).json({ message: "Personel listesi yüklenirken hata oluştu" });
    }
  });

  app.get("/api/personnel/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const person = await storage.getPersonnelById(id);
      if (!person) {
        return res.status(404).json({ message: "Personel bulunamadı" });
      }

      // Branch admins can only see their branch personnel
      if (req.user?.role === 'branch_admin' && req.user?.branchId !== person.branchId) {
        return res.status(403).json({ message: "Bu personeli görme yetkiniz bulunmamaktadır" });
      }

      res.json(person);
    } catch (error) {
      res.status(500).json({ message: "Personel bilgileri yüklenirken hata oluştu" });
    }
  });

  app.post("/api/personnel", requireAuth, async (req, res) => {
    try {
      const validatedData = insertPersonnelSchema.parse(req.body);
      
      // Branch admins can only add to their branch
      if (req.user?.role === 'branch_admin') {
        if (req.user?.branchId !== validatedData.branchId) {
          return res.status(403).json({ message: "Başka şubeye personel ekleyemezsiniz" });
        }
      }

      const person = await storage.createPersonnel(validatedData);
      res.status(201).json(person);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Personel oluşturulurken hata oluştu" });
    }
  });

  app.put("/api/personnel/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const existingPerson = await storage.getPersonnelById(id);
      
      if (!existingPerson) {
        return res.status(404).json({ message: "Personel bulunamadı" });
      }

      // Branch admins can only edit their branch personnel
      if (req.user?.role === 'branch_admin' && req.user?.branchId !== existingPerson.branchId) {
        return res.status(403).json({ message: "Bu personeli düzenleme yetkiniz bulunmamaktadır" });
      }

      const person = await storage.updatePersonnel(id, req.body);
      res.json(person);
    } catch (error) {
      res.status(500).json({ message: "Personel güncellenirken hata oluştu" });
    }
  });

  // Shifts
  app.get("/api/shifts", requireAuth, async (req, res) => {
    try {
      const { branchId } = req.query;
      let shifts;

      if (branchId) {
        shifts = await storage.getShiftsByBranch(branchId as string);
      } else if (req.user?.role === 'branch_admin' && req.user?.branchId) {
        shifts = await storage.getShiftsByBranch(req.user.branchId);
      } else {
        shifts = await storage.getShifts();
      }

      res.json(shifts);
    } catch (error) {
      res.status(500).json({ message: "Vardiyalar yüklenirken hata oluştu" });
    }
  });

  app.post("/api/shifts", requireAuth, async (req, res) => {
    try {
      const validatedData = insertShiftSchema.parse(req.body);
      
      // Branch admins can only add shifts to their branch
      if (req.user?.role === 'branch_admin') {
        if (req.user?.branchId !== validatedData.branchId) {
          return res.status(403).json({ message: "Başka şubeye vardiya ekleyemezsiniz" });
        }
      }

      const shift = await storage.createShift(validatedData);
      res.status(201).json(shift);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Vardiya oluşturulurken hata oluştu" });
    }
  });

  // Attendance
  app.get("/api/attendance", requireAuth, async (req, res) => {
    try {
      const { personnelId, startDate, endDate } = req.query;
      
      if (personnelId) {
        const attendance = await storage.getAttendanceByPersonnel(
          personnelId as string,
          startDate ? new Date(startDate as string) : undefined,
          endDate ? new Date(endDate as string) : undefined
        );
        res.json(attendance);
      } else {
        const todayAttendance = await storage.getTodayAttendance();
        res.json(todayAttendance);
      }
    } catch (error) {
      res.status(500).json({ message: "Devam bilgileri yüklenirken hata oluştu" });
    }
  });

  app.post("/api/attendance", requireAuth, async (req, res) => {
    try {
      const { personnelId, checkIn, checkOut, location, qrCode, notes } = req.body;
      
      const attendanceData = {
        personnelId,
        checkIn: checkIn ? new Date(checkIn) : undefined,
        checkOut: checkOut ? new Date(checkOut) : undefined,
        location,
        qrCode,
        notes,
        date: new Date()
      };

      const attendance = await storage.createAttendance(attendanceData);
      res.status(201).json(attendance);
    } catch (error) {
      res.status(500).json({ message: "Devam kaydı oluşturulurken hata oluştu" });
    }
  });

  // Leave Requests
  app.get("/api/leave-requests", requireAuth, async (req, res) => {
    try {
      const { personnelId } = req.query;
      
      if (personnelId) {
        const requests = await storage.getLeaveRequestsByPersonnel(personnelId as string);
        res.json(requests);
      } else {
        const requests = await storage.getLeaveRequests();
        res.json(requests);
      }
    } catch (error) {
      res.status(500).json({ message: "İzin talepleri yüklenirken hata oluştu" });
    }
  });

  app.post("/api/leave-requests", requireAuth, async (req, res) => {
    try {
      const validatedData = insertLeaveRequestSchema.parse(req.body);
      const request = await storage.createLeaveRequest(validatedData);
      res.status(201).json(request);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "İzin talebi oluşturulurken hata oluştu" });
    }
  });

  app.put("/api/leave-requests/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { status, approvedBy } = req.body;

      const updates: any = { status };
      if (status === 'approved' || status === 'rejected') {
        updates.approvedBy = req.user?.id;
        updates.approvedAt = new Date();
      }

      const request = await storage.updateLeaveRequest(id, updates);
      if (!request) {
        return res.status(404).json({ message: "İzin talebi bulunamadı" });
      }
      res.json(request);
    } catch (error) {
      res.status(500).json({ message: "İzin talebi güncellenirken hata oluştu" });
    }
  });

  // QR Code Scanning
  app.post("/api/qr-scan", requireAuth, async (req, res) => {
    try {
      const { qrCode } = req.body;
      
      if (!qrCode) {
        return res.status(400).json({ message: "QR kod gerekli" });
      }

      // QR kodundan personel ID'sini çıkar (format: PERSONNEL_ID)
      const personnelId = qrCode;
      
      // Personeli bul
      const personnel = await storage.getPersonnelById(personnelId);
      if (!personnel) {
        return res.status(404).json({ message: "Geçersiz QR kod - Personel bulunamadı" });
      }

      // Bugünkü devam kaydını kontrol et
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      const existingAttendance = await storage.getAttendanceByPersonnelAndDate(personnelId, todayStr);
      
      if (!existingAttendance) {
        // Giriş kaydı oluştur
        const attendanceData = {
          personnelId,
          date: today,
          checkInTime: today,
          checkOutTime: undefined,
          notes: "QR kod ile giriş"
        };
        
        await storage.createAttendance(attendanceData);
        res.json({ 
          message: `${personnel.firstName} ${personnel.lastName} başarıyla giriş yaptı`,
          action: "check-in",
          time: today.toLocaleTimeString('tr-TR')
        });
      } else if (existingAttendance.checkInTime && !existingAttendance.checkOutTime) {
        // Çıkış kaydı oluştur
        const updatedAttendance = {
          ...existingAttendance,
          checkOutTime: today
        };
        
        await storage.updateAttendance(existingAttendance.id, updatedAttendance);
        res.json({ 
          message: `${personnel.firstName} ${personnel.lastName} başarıyla çıkış yaptı`,
          action: "check-out",
          time: today.toLocaleTimeString('tr-TR')
        });
      } else {
        res.status(400).json({ message: "Personel zaten giriş ve çıkış kaydı tamamlamış" });
      }
    } catch (error) {
      console.error("QR scan error:", error);
      res.status(500).json({ message: "QR kod işlenirken hata oluştu" });
    }
  });

  // Today's Attendance
  app.get("/api/attendance/today", requireAuth, async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const attendance = await storage.getAttendanceByDate(today);
      res.json(attendance);
    } catch (error) {
      res.status(500).json({ message: "Bugünkü devam kayıtları yüklenirken hata oluştu" });
    }
  });

  // System Settings
  app.get("/api/settings", requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const settings = await storage.getSystemSettings();
      res.json(settings || {
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
    } catch (error) {
      res.status(500).json({ message: "Sistem ayarları yüklenirken hata oluştu" });
    }
  });

  app.put("/api/settings", requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const settings = await storage.updateSystemSettings(req.body);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Sistem ayarları güncellenirken hata oluştu" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
