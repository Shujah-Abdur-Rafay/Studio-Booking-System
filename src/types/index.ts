// User Types
export interface User {
  id: string;
  email: string;
  role: 'admin' | 'client' | 'editor';
  isSuperAdmin?: boolean;
  profile: {
    firstName: string;
    lastName: string;
    phone?: string;
    company?: string;
    avatar?: string;
  };
  createdAt: Date;
}

export interface Client {
  id: string;
  userId: string;
  source: 'website' | 'referral' | 'social';
  notes: string;
  tags: string[];
  totalBookings: number;
  totalRevenue: number;
  lastBookingDate?: Date;
  preferredContact: 'email' | 'sms' | 'call';
  createdAt: Date;
  name?: string;
  email?: string;
}

// Service Types
export interface Service {
  id: string;
  name: string;
  slug: string;
  category: 'photo' | 'video' | 'drone' | 'mixed' | 'real-estate';
  description: string;
  duration: number;
  basePrice: number;
  depositRequired: number;
  deliverables: string[];
  addons: string[];
  bufferTime: number;
  minNotice: number;
  maxAdvance: number;
  isActive: boolean;
  image?: string;
  sortOrder: number;
  pricingTiers?: Record<string, number>;
}

export interface AddOn {
  id: string;
  name: string;
  description: string;
  price: number;
  priceType: 'fixed' | 'percentage' | 'per-photo';
  applicableServices: string[];
  isActive: boolean;
}

// Booking Types
export type BookingStatus = 'pending_payment' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
export type PaymentStatus = 'pending' | 'deposit_paid' | 'paid_in_full' | 'refunded' | 'failed';
export type PaymentMethod = 'stripe' | 'paypal' | 'venmo' | 'zelle' | 'manual';

export interface Booking {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  serviceId: string;
  serviceName: string;
  addons: Array<{
    addonId: string;
    name: string;
    price: number;
  }>;
  dateTime: {
    start: Date;
    end: Date;
    timezone: string;
  };
  location: {
    address: string;
    notes?: string;
  };
  pricing: {
    subtotal: number;
    travelFee: number;
    total: number;
    depositAmount: number;
  };
  payment: {
    status: PaymentStatus;
    method: PaymentMethod;
    paidAt?: Date;
    manualReference?: string;
  };
  status: BookingStatus;
  notes: string;
  createdAt: Date;
}

// Invoice Types
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  projectId?: string;
  bookingId?: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  status: InvoiceStatus;
  dueDate: Date;
  paidAt?: Date;
  payment?: {
    status: PaymentStatus;
    method: PaymentMethod;
    paidAt?: Date;
    manualReference?: string;
  };
  sentAt?: Date;
  createdAt: Date;
}

// Project Types
export type ProjectStatus = 'lead' | 'booked' | 'shot' | 'editing' | 'review' | 'delivered' | 'closed';

export interface Project {
  id: string;
  projectNumber: string;
  clientId: string;
  clientName: string;
  bookingId: string;
  name: string;
  description: string;
  status: ProjectStatus;
  workflowStage: number;
  deliverables: Array<{
    id: string;
    name: string;
    type: 'photo' | 'video' | 'raw';
    url?: string;
    thumbnail?: string;
    status: 'pending' | 'ready' | 'downloaded';
    expiresAt?: Date;
  }>;
  dueDate?: Date;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

// Portfolio Types
export interface PortfolioItem {
  id: string;
  title: string;
  category: string; // dynamic, managed by admin
  image: string;
  videoUrl?: string;
  thumbnail: string;
  description: string;
  client?: string;
  date: Date;
  featured: boolean;
}

// Testimonial Types
export interface Testimonial {
  id: string;
  name: string;
  role: string;
  company: string;
  content: string;
  rating: number;
  avatar?: string;
  category: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
}

// Calendar Types
export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
}

// Admin Metrics
export interface DashboardMetrics {
  totalBookings: number;
  totalRevenue: number;
  pendingInvoices: number;
  activeProjects: number;
  conversionRate: number;
  averageOrderValue: number;
  repeatClientRate: number;
  monthlyGrowth: number;
}

// Carousel Video Types
export interface CarouselVideo {
  id: string;
  title: string;
  url: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
}

// Contact Message Types
export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}


// Payment Transaction Types (from Stripe Webhooks)
export interface Payment {
  id: string;
  eventId?: string;
  paymentIntentId: string;
  amount: number; // in cents
  currency: string;
  status: string;
  created: Date;
  userId?: string;
  invoiceId?: string;
  metadata?: Record<string, any>;
  processedAt?: Date;
}

// Activity Log
export interface ActivityLog {
  id: string;
  entityType: 'booking' | 'project' | 'invoice' | 'client';
  entityId: string;
  action: string;
  actorId: string;
  actorName: string;
  metadata: Record<string, any>;
  createdAt: Date;
}
