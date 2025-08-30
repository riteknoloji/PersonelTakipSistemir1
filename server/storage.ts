import { users, branches, personnel, shifts, attendance, leaveRequests, personnelShifts, type User, type InsertUser, type Branch, type InsertBranch, type Personnel, type InsertPersonnel, type Shift, type InsertShift, type LeaveRequest, type InsertLeaveRequest, type Attendance } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, sql, like, gte, lte } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  
  // Branches
  getBranches(): Promise<Branch[]>;
  getBranch(id: string): Promise<Branch | undefined>;
  createBranch(branch: InsertBranch): Promise<Branch>;
  updateBranch(id: string, updates: Partial<Branch>): Promise<Branch | undefined>;
  
  // Personnel
  getPersonnel(): Promise<Personnel[]>;
  getPersonnelByBranch(branchId: string): Promise<Personnel[]>;
  getPersonnelById(id: string): Promise<Personnel | undefined>;
  createPersonnel(personnel: InsertPersonnel): Promise<Personnel>;
  updatePersonnel(id: string, updates: Partial<Personnel>): Promise<Personnel | undefined>;
  searchPersonnel(query: string): Promise<Personnel[]>;
  
  // Shifts
  getShifts(): Promise<Shift[]>;
  getShiftsByBranch(branchId: string): Promise<Shift[]>;
  createShift(shift: InsertShift): Promise<Shift>;
  updateShift(id: string, updates: Partial<Shift>): Promise<Shift | undefined>;
  
  // Attendance
  getTodayAttendance(): Promise<Attendance[]>;
  getAttendanceByPersonnel(personnelId: string, startDate?: Date, endDate?: Date): Promise<Attendance[]>;
  getAttendanceByPersonnelAndDate(personnelId: string, date: string): Promise<Attendance | undefined>;
  getAttendanceByDate(date: string): Promise<Attendance[]>;
  createAttendance(attendance: Partial<Attendance>): Promise<Attendance>;
  updateAttendance(id: string, updates: Partial<Attendance>): Promise<Attendance | undefined>;
  
  // Leave Requests
  getLeaveRequests(): Promise<LeaveRequest[]>;
  getLeaveRequestsByPersonnel(personnelId: string): Promise<LeaveRequest[]>;
  createLeaveRequest(leaveRequest: InsertLeaveRequest): Promise<LeaveRequest>;
  updateLeaveRequest(id: string, updates: Partial<LeaveRequest>): Promise<LeaveRequest | undefined>;
  
  // Stats
  getStats(): Promise<{
    totalPersonnel: number;
    todayAttendance: number;
    onLeave: number;
    activeShifts: number;
  }>;
  
  // System Settings
  getSystemSettings(): Promise<any>;
  updateSystemSettings(settings: any): Promise<any>;
  
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phone, phone));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getBranches(): Promise<Branch[]> {
    return await db.select().from(branches).where(eq(branches.isActive, true)).orderBy(asc(branches.name));
  }

  async getBranch(id: string): Promise<Branch | undefined> {
    const [branch] = await db.select().from(branches).where(eq(branches.id, id));
    return branch || undefined;
  }

  async createBranch(insertBranch: InsertBranch): Promise<Branch> {
    const [branch] = await db
      .insert(branches)
      .values(insertBranch)
      .returning();
    return branch;
  }

  async updateBranch(id: string, updates: Partial<Branch>): Promise<Branch | undefined> {
    const [branch] = await db
      .update(branches)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(branches.id, id))
      .returning();
    return branch || undefined;
  }

  async getPersonnel(): Promise<Personnel[]> {
    return await db.select().from(personnel).where(eq(personnel.isActive, true)).orderBy(asc(personnel.firstName));
  }

  async getPersonnelByBranch(branchId: string): Promise<Personnel[]> {
    return await db.select()
      .from(personnel)
      .where(and(eq(personnel.branchId, branchId), eq(personnel.isActive, true)))
      .orderBy(asc(personnel.firstName));
  }

  async getPersonnelById(id: string): Promise<Personnel | undefined> {
    const [person] = await db.select().from(personnel).where(eq(personnel.id, id));
    return person || undefined;
  }

  async createPersonnel(insertPersonnel: InsertPersonnel): Promise<Personnel> {
    const [person] = await db
      .insert(personnel)
      .values(insertPersonnel)
      .returning();
    return person;
  }

  async updatePersonnel(id: string, updates: Partial<Personnel>): Promise<Personnel | undefined> {
    const [person] = await db
      .update(personnel)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(personnel.id, id))
      .returning();
    return person || undefined;
  }

  async searchPersonnel(query: string): Promise<Personnel[]> {
    return await db.select()
      .from(personnel)
      .where(
        and(
          eq(personnel.isActive, true),
          sql`LOWER(${personnel.firstName} || ' ' || ${personnel.lastName}) LIKE LOWER('%' || ${query} || '%')`
        )
      )
      .orderBy(asc(personnel.firstName));
  }

  async getShifts(): Promise<Shift[]> {
    return await db.select().from(shifts).where(eq(shifts.isActive, true)).orderBy(asc(shifts.name));
  }

  async getShiftsByBranch(branchId: string): Promise<Shift[]> {
    return await db.select()
      .from(shifts)
      .where(and(eq(shifts.branchId, branchId), eq(shifts.isActive, true)))
      .orderBy(asc(shifts.name));
  }

  async createShift(insertShift: InsertShift): Promise<Shift> {
    const [shift] = await db
      .insert(shifts)
      .values(insertShift)
      .returning();
    return shift;
  }

  async updateShift(id: string, updates: Partial<Shift>): Promise<Shift | undefined> {
    const [shift] = await db
      .update(shifts)
      .set(updates)
      .where(eq(shifts.id, id))
      .returning();
    return shift || undefined;
  }

  async getTodayAttendance(): Promise<Attendance[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await db.select()
      .from(attendance)
      .where(and(
        gte(attendance.date, today),
        lte(attendance.date, tomorrow)
      ))
      .orderBy(desc(attendance.createdAt));
  }

  async getAttendanceByPersonnel(personnelId: string, startDate?: Date, endDate?: Date): Promise<Attendance[]> {
    let whereConditions = [eq(attendance.personnelId, personnelId)];
    
    if (startDate) {
      whereConditions.push(gte(attendance.date, startDate));
    }
    if (endDate) {
      whereConditions.push(lte(attendance.date, endDate));
    }

    return await db.select()
      .from(attendance)
      .where(and(...whereConditions))
      .orderBy(desc(attendance.date));
  }

  async createAttendance(attendanceData: Partial<Attendance>): Promise<Attendance> {
    const data = {
      ...attendanceData,
      personnelId: attendanceData.personnelId!
    };
    const [record] = await db
      .insert(attendance)
      .values(data)
      .returning();
    return record;
  }

  async getLeaveRequests(): Promise<LeaveRequest[]> {
    return await db.select()
      .from(leaveRequests)
      .orderBy(desc(leaveRequests.createdAt));
  }

  async getLeaveRequestsByPersonnel(personnelId: string): Promise<LeaveRequest[]> {
    return await db.select()
      .from(leaveRequests)
      .where(eq(leaveRequests.personnelId, personnelId))
      .orderBy(desc(leaveRequests.createdAt));
  }

  async createLeaveRequest(insertLeaveRequest: InsertLeaveRequest): Promise<LeaveRequest> {
    const [request] = await db
      .insert(leaveRequests)
      .values(insertLeaveRequest)
      .returning();
    return request;
  }

  async updateLeaveRequest(id: string, updates: Partial<LeaveRequest>): Promise<LeaveRequest | undefined> {
    const [request] = await db
      .update(leaveRequests)
      .set(updates)
      .where(eq(leaveRequests.id, id))
      .returning();
    return request || undefined;
  }

  async getAttendanceByPersonnelAndDate(personnelId: string, date: string): Promise<Attendance | undefined> {
    const [record] = await db.select()
      .from(attendance)
      .where(and(
        eq(attendance.personnelId, personnelId),
        sql`DATE(${attendance.date}) = ${date}`
      ));
    return record || undefined;
  }

  async getAttendanceByDate(date: string): Promise<Attendance[]> {
    return await db.select()
      .from(attendance)
      .where(sql`DATE(${attendance.date}) = ${date}`)
      .orderBy(desc(attendance.checkInTime));
  }

  async updateAttendance(id: string, updates: Partial<Attendance>): Promise<Attendance | undefined> {
    const [updated] = await db
      .update(attendance)
      .set(updates)
      .where(eq(attendance.id, id))
      .returning();
    return updated || undefined;
  }

  async getSystemSettings(): Promise<any> {
    // Bu gelecekte ayrı bir tablo olabilir, şimdilik default değerler döndürüyoruz
    return null;
  }

  async updateSystemSettings(settings: any): Promise<any> {
    // Bu gelecekte ayrı bir tablo olabilir, şimdilik ayarları döndürüyoruz
    return settings;
  }

  async getStats(): Promise<{
    totalPersonnel: number;
    todayAttendance: number;
    onLeave: number;
    activeShifts: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalPersonnelResult] = await db.select({ count: sql<number>`count(*)` })
      .from(personnel)
      .where(eq(personnel.isActive, true));

    const [todayAttendanceResult] = await db.select({ count: sql<number>`count(*)` })
      .from(attendance)
      .where(and(
        gte(attendance.date, today),
        lte(attendance.date, tomorrow)
      ));

    const [onLeaveResult] = await db.select({ count: sql<number>`count(*)` })
      .from(leaveRequests)
      .where(and(
        eq(leaveRequests.status, 'approved'),
        lte(leaveRequests.startDate, today),
        gte(leaveRequests.endDate, today)
      ));

    const [activeShiftsResult] = await db.select({ count: sql<number>`count(*)` })
      .from(shifts)
      .where(eq(shifts.isActive, true));

    return {
      totalPersonnel: totalPersonnelResult.count,
      todayAttendance: todayAttendanceResult.count,
      onLeave: onLeaveResult.count,
      activeShifts: activeShiftsResult.count,
    };
  }
}

export const storage = new DatabaseStorage();
