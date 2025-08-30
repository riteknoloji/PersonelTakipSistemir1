import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure SSL settings for development environment
const poolConfig = { 
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'development' ? { rejectUnauthorized: false } : true
};

export const pool = new Pool(poolConfig);
export const db = drizzle({ client: pool, schema });
