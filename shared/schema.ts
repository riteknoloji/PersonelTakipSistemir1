import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["super_admin", "admin", "branch_admin"]);
export const leaveTypeEnum = pgEnum("leave_type", ["yillik", "hafta_tatili", "resmi_tatil", "hastalik", "dogum", "babalik", "evlilik", "olum", "mazeret", "ucretsiz"]);
export const shiftTypeEnum = pgEnum("shift_type", ["sabah", "oglen", "aksam", "gece"]);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: text("phone").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: userRoleEnum("role").notNull().default("branch_admin"),
  branchId: varchar("branch_id"),
  isActive: boolean("is_active").notNull().default(true),
  twoFactorCode: text("two_factor_code"),
  twoFactorExpiry: timestamp("two_factor_expiry"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Branches table
export const branches = pgTable("branches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  parentBranchId: varchar("parent_branch_id"),
  managerId: varchar("manager_id"), // Personnel ID of the branch manager
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Personnel table
export const personnel = pgTable("personnel", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeNumber: text("employee_number").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  nationalId: text("national_id").notNull().unique(),
  birthDate: timestamp("birth_date"),
  address: text("address"),
  position: text("position").notNull(),
  department: text("department"),
  branchId: varchar("branch_id").notNull(),
  startDate: timestamp("start_date").notNull(),
  salary: integer("salary"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Shifts table
export const shifts = pgTable("shifts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: shiftTypeEnum("type").notNull(),
  startTime: text("start_time").notNull(), // HH:MM format
  endTime: text("end_time").notNull(), // HH:MM format
  branchId: varchar("branch_id").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Personnel Shifts table
export const personnelShifts = pgTable("personnel_shifts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  personnelId: varchar("personnel_id").notNull(),
  shiftId: varchar("shift_id").notNull(),
  assignedDate: timestamp("assigned_date").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Attendance table
export const attendance = pgTable("attendance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  personnelId: varchar("personnel_id").notNull(),
  checkIn: timestamp("check_in"),
  checkOut: timestamp("check_out"),
  date: timestamp("date").notNull().default(sql`CURRENT_DATE`),
  location: text("location"),
  qrCode: text("qr_code"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Leave Requests table
export const leaveRequests = pgTable("leave_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  personnelId: varchar("personnel_id").notNull(),
  type: leaveTypeEnum("type").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  reason: text("reason"),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  approvedBy: varchar("approved_by"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Relations
export const usersRelations = relations(users, ({ one }) => ({
  branch: one(branches, {
    fields: [users.branchId],
    references: [branches.id],
  }),
}));

export const branchesRelations = relations(branches, ({ one, many }) => ({
  parentBranch: one(branches, {
    fields: [branches.parentBranchId],
    references: [branches.id],
  }),
  manager: one(personnel, {
    fields: [branches.managerId],
    references: [personnel.id],
  }),
  subBranches: many(branches),
  personnel: many(personnel),
  users: many(users),
  shifts: many(shifts),
}));

export const personnelRelations = relations(personnel, ({ one, many }) => ({
  branch: one(branches, {
    fields: [personnel.branchId],
    references: [branches.id],
  }),
  shifts: many(personnelShifts),
  attendance: many(attendance),
  leaveRequests: many(leaveRequests),
}));

export const shiftsRelations = relations(shifts, ({ one, many }) => ({
  branch: one(branches, {
    fields: [shifts.branchId],
    references: [branches.id],
  }),
  personnel: many(personnelShifts),
}));

export const personnelShiftsRelations = relations(personnelShifts, ({ one }) => ({
  personnel: one(personnel, {
    fields: [personnelShifts.personnelId],
    references: [personnel.id],
  }),
  shift: one(shifts, {
    fields: [personnelShifts.shiftId],
    references: [shifts.id],
  }),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  personnel: one(personnel, {
    fields: [attendance.personnelId],
    references: [personnel.id],
  }),
}));

export const leaveRequestsRelations = relations(leaveRequests, ({ one }) => ({
  personnel: one(personnel, {
    fields: [leaveRequests.personnelId],
    references: [personnel.id],
  }),
  approver: one(users, {
    fields: [leaveRequests.approvedBy],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  twoFactorCode: true,
  twoFactorExpiry: true,
});

export const insertBranchSchema = createInsertSchema(branches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPersonnelSchema = createInsertSchema(personnel).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertShiftSchema = createInsertSchema(shifts).omit({
  id: true,
  createdAt: true,
});

export const insertLeaveRequestSchema = createInsertSchema(leaveRequests).omit({
  id: true,
  createdAt: true,
  approvedBy: true,
  approvedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Branch = typeof branches.$inferSelect;
export type InsertBranch = z.infer<typeof insertBranchSchema>;
export type Personnel = typeof personnel.$inferSelect;
export type InsertPersonnel = z.infer<typeof insertPersonnelSchema>;
export type Shift = typeof shifts.$inferSelect;
export type InsertShift = z.infer<typeof insertShiftSchema>;
export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type InsertLeaveRequest = z.infer<typeof insertLeaveRequestSchema>;
export type Attendance = typeof attendance.$inferSelect;
