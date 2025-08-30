import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { netgsmService } from "./services/netgsm";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

function generateTwoFactorCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "default-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: 'phone' },
      async (phone, password, done) => {
        try {
          const user = await storage.getUserByPhone(phone);
          if (!user || !user.isActive || !(await comparePasswords(password, user.password))) {
            return done(null, false, { message: 'Telefon numarası veya şifre hatalı' });
          }
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Register endpoint
  app.post("/api/register", async (req, res, next) => {
    try {
      const { phone, password, name, role, branchId } = req.body;

      if (!phone || !password || !name) {
        return res.status(400).json({ message: "Telefon, şifre ve ad alanları zorunludur" });
      }

      const existingUser = await storage.getUserByPhone(phone);
      if (existingUser) {
        return res.status(400).json({ message: "Bu telefon numarası zaten kullanılıyor" });
      }

      const user = await storage.createUser({
        phone,
        password: await hashPassword(password),
        name,
        role: role || 'branch_admin',
        branchId,
        isActive: true
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json({
          id: user.id,
          phone: user.phone,
          name: user.name,
          role: user.role,
          branchId: user.branchId
        });
      });
    } catch (error) {
      next(error);
    }
  });

  // Login endpoint with 2FA
  app.post("/api/login", async (req, res, next) => {
    passport.authenticate("local", async (err: any, user: SelectUser, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Giriş başarısız" });
      }

      try {
        // Generate and send 2FA code
        const twoFactorCode = generateTwoFactorCode();
        const twoFactorExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        await storage.updateUser(user.id, {
          twoFactorCode,
          twoFactorExpiry
        });

        // Send SMS
        const smsSuccess = await netgsmService.send2FA(user.phone, twoFactorCode);
        if (!smsSuccess) {
          console.error(`2FA SMS gönderilemedi: ${user.phone}`);
          // In production, you might want to fail here, but for development we continue
        }

        res.json({ 
          message: "Doğrulama kodu telefon numaranıza gönderildi",
          requiresTwoFactor: true,
          userId: user.id
        });
      } catch (error) {
        next(error);
      }
    })(req, res, next);
  });

  // 2FA verification endpoint
  app.post("/api/verify-2fa", async (req, res, next) => {
    try {
      const { userId, code } = req.body;

      if (!userId || !code) {
        return res.status(400).json({ message: "Kullanıcı ID ve doğrulama kodu gerekli" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }

      if (!user.twoFactorCode || !user.twoFactorExpiry) {
        return res.status(400).json({ message: "Doğrulama kodu bulunamadı" });
      }

      if (new Date() > user.twoFactorExpiry) {
        return res.status(400).json({ message: "Doğrulama kodu süresi dolmuş" });
      }

      if (user.twoFactorCode !== code) {
        return res.status(400).json({ message: "Doğrulama kodu hatalı" });
      }

      // Clear 2FA code
      await storage.updateUser(user.id, {
        twoFactorCode: null,
        twoFactorExpiry: null
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.json({
          id: user.id,
          phone: user.phone,
          name: user.name,
          role: user.role,
          branchId: user.branchId
        });
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user!;
    res.json({
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      branchId: user.branchId
    });
  });
}
