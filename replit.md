# Personnel Management and Tracking System

## Overview

This is a comprehensive personnel management and tracking system designed for Turkish companies. The system provides a full-stack solution for managing employees, branches, shifts, leave requests, attendance tracking, and comprehensive reporting through a single unified platform. The application features a modern, responsive design with Turkish language interface throughout.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React + Vite**: Modern frontend framework with fast development server and hot module replacement
- **TypeScript**: Type-safe development with strict type checking enabled
- **Wouter**: Lightweight client-side routing solution for single-page application navigation
- **Shadcn/UI + Radix UI**: Component library providing accessible, customizable UI components
- **TailwindCSS**: Utility-first CSS framework for rapid UI development
- **React Hook Form + Zod**: Form handling with robust validation and type safety
- **TanStack Query**: Server state management with caching, synchronization, and background updates

### Backend Architecture
- **Node.js + Express**: RESTful API server with middleware-based request handling
- **TypeScript**: End-to-end type safety across client and server
- **Passport.js**: Authentication middleware with local strategy and session management
- **Express Session**: Server-side session management with PostgreSQL store
- **JWT + 2FA**: JSON Web Token authentication with SMS-based two-factor authentication

### Role-Based Access Control
- **Super Admin**: Full system access and user management capabilities
- **Admin**: Delegated permissions based on Super Admin authorization
- **Branch Admin**: Limited access to assigned branch personnel and operations only

### Database Design
- **PostgreSQL**: Primary relational database with UUID primary keys
- **Drizzle ORM**: Type-safe database operations with schema validation
- **Connection Pooling**: Neon serverless PostgreSQL with WebSocket support for scalability
- **Schema**: Comprehensive data model covering users, branches, personnel, shifts, attendance, leave requests, and relationships

### Authentication & Security
- **Phone-based Authentication**: Login exclusively via phone number (no email addresses)
- **Password Hashing**: Secure password storage using Node.js scrypt with salt
- **Session Management**: Server-side sessions with PostgreSQL storage
- **Two-Factor Authentication**: SMS verification via Netgsm API integration
- **CSRF Protection**: Session-based protection with secure cookie configuration

## External Dependencies

### SMS Service Integration
- **Netgsm API**: Turkish SMS service provider for 2FA verification codes
- **Configuration**: Username, password, and title configuration via environment variables
- **Failover Handling**: Graceful error handling for SMS delivery failures

### Database Service
- **Neon PostgreSQL**: Serverless PostgreSQL database with WebSocket connection support
- **Connection Management**: Pool-based connections with automatic scaling
- **Migration Support**: Drizzle Kit for database schema migrations

### Development Tools
- **Replit Integration**: Development environment with runtime error overlay and cartographer
- **Vite Plugins**: Hot module replacement, React fast refresh, and development tooling
- **Build System**: ESBuild for production bundling with external package handling

### UI Component Libraries
- **Radix UI Primitives**: Headless, accessible UI component primitives
- **Lucide React**: Comprehensive icon library with consistent styling
- **React Day Picker**: Calendar and date selection components
- **Input OTP**: One-time password input components for 2FA
- **Embla Carousel**: Touch-friendly carousel components

### Form Management
- **React Hook Form**: Performant form library with minimal re-renders
- **Hookform Resolvers**: Zod integration for schema-based validation
- **Zod**: Runtime type validation and schema definition
- **Drizzle Zod**: Automatic schema generation from database models