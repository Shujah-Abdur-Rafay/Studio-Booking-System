// @ts-nocheck
import type {
  Service,
  AddOn,
  PortfolioItem,
  Testimonial,
  Booking,
  Invoice,
  Project,
  Client,
  DashboardMetrics,
  ActivityLog
} from '@/types';

export const services: Service[] = [
  {
    id: 'svc-1',
    name: 'Real Estate Photo Package',
    slug: 'real-estate-photo',
    category: 'photo',
    description: 'Professional photography for property listings. Includes exterior and interior shots, HDR processing, and fast turnaround.',
    duration: 90,
    basePrice: 24900,
    depositRequired: 50,
    deliverables: ['25+ edited photos', '48-hour delivery', 'Online gallery', 'Download rights'],
    addons: ['addon-1', 'addon-2', 'addon-3'],
    bufferTime: 30,
    minNotice: 24,
    maxAdvance: 90,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
    sortOrder: 1
  },
  {
    id: 'svc-2',
    name: 'Luxury Property Package',
    slug: 'luxury-property',
    category: 'photo',
    description: 'Premium photography for high-end properties. Includes twilight shots, aerial drone footage, and luxury staging consultation.',
    duration: 180,
    basePrice: 49900,
    depositRequired: 50,
    deliverables: ['40+ edited photos', 'Drone aerial shots', 'Twilight photography', '24-hour delivery', 'Priority support'],
    addons: ['addon-1', 'addon-2', 'addon-3', 'addon-4'],
    bufferTime: 60,
    minNotice: 48,
    maxAdvance: 90,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80',
    sortOrder: 2
  },
  {
    id: 'svc-3',
    name: 'Brand Photography',
    slug: 'brand-photo',
    category: 'photo',
    description: 'Professional brand photography for businesses. Headshots, product shots, and lifestyle imagery that tells your story.',
    duration: 120,
    basePrice: 39900,
    depositRequired: 50,
    deliverables: ['15+ edited photos', 'Commercial usage rights', 'Online gallery', '48-hour delivery'],
    addons: ['addon-1', 'addon-2', 'addon-5'],
    bufferTime: 30,
    minNotice: 48,
    maxAdvance: 60,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&q=80',
    sortOrder: 3
  },
  {
    id: 'svc-4',
    name: 'Property Video Tour',
    slug: 'video-tour',
    category: 'video',
    description: 'Cinematic video walkthrough of your property. Perfect for listings that need to stand out with motion and sound.',
    duration: 120,
    basePrice: 44900,
    depositRequired: 50,
    deliverables: ['2-3 minute video', '4K quality', 'Music licensing', 'Social media versions', '5-day delivery'],
    addons: ['addon-1', 'addon-3', 'addon-4'],
    bufferTime: 60,
    minNotice: 48,
    maxAdvance: 60,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&q=80',
    sortOrder: 4
  },
  {
    id: 'svc-5',
    name: 'Drone Aerial Package',
    slug: 'drone-aerial',
    category: 'drone',
    description: 'Stunning aerial photography and video. Showcase property surroundings, land, and unique perspectives.',
    duration: 60,
    basePrice: 29900,
    depositRequired: 50,
    deliverables: ['10+ aerial photos', '1-minute aerial video', '4K quality', '48-hour delivery'],
    addons: ['addon-1', 'addon-2'],
    bufferTime: 30,
    minNotice: 24,
    maxAdvance: 90,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&q=80',
    sortOrder: 5
  },
  {
    id: 'svc-6',
    name: 'Complete Marketing Package',
    slug: 'complete-package',
    category: 'mixed',
    description: 'Everything you need for property marketing. Photos, video, drone, and social media content in one package.',
    duration: 240,
    basePrice: 79900,
    depositRequired: 50,
    deliverables: ['50+ edited photos', '3-minute video', 'Drone footage', 'Social media clips', 'Priority 24-hour delivery'],
    addons: ['addon-1', 'addon-2', 'addon-3', 'addon-4', 'addon-5'],
    bufferTime: 60,
    minNotice: 72,
    maxAdvance: 90,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80',
    sortOrder: 6
  }
];

export const addOns: AddOn[] = [
  {
    id: 'addon-1',
    name: 'Rush Delivery (24h)',
    description: 'Get your edited photos within 24 hours',
    price: 9900,
    priceType: 'fixed',
    applicableServices: ['svc-1', 'svc-2', 'svc-3', 'svc-5'],
    isActive: true
  },
  {
    id: 'addon-2',
    name: 'Extra Photos (10 pack)',
    description: 'Additional 10 professionally edited photos',
    price: 7500,
    priceType: 'fixed',
    applicableServices: ['svc-1', 'svc-2', 'svc-3', 'svc-5'],
    isActive: true
  },
  {
    id: 'addon-3',
    name: 'Virtual Staging',
    description: 'Digital furniture staging for empty rooms',
    price: 4900,
    priceType: 'fixed',
    applicableServices: ['svc-1', 'svc-2', 'svc-4'],
    isActive: true
  },
  {
    id: 'addon-4',
    name: 'Weekend Booking',
    description: 'Saturday or Sunday appointment',
    price: 5000,
    priceType: 'fixed',
    applicableServices: ['svc-1', 'svc-2', 'svc-3', 'svc-4', 'svc-5', 'svc-6'],
    isActive: true
  },
  {
    id: 'addon-5',
    name: 'Additional Location',
    description: 'Shoot at a second location same day',
    price: 15000,
    priceType: 'fixed',
    applicableServices: ['svc-3', 'svc-4'],
    isActive: true
  }
];

export const portfolioItems: PortfolioItem[] = [
  {
    id: 'port-1',
    title: 'Modern Hillside Estate',
    category: 'real-estate',
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&q=80',
    description: 'Luxury property in the hills with stunning views',
    client: 'Compass Realty',
    date: new Date('2024-01-15'),
    featured: true
  },
  {
    id: 'port-2',
    title: 'Downtown Loft',
    category: 'real-estate',
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&q=80',
    description: 'Industrial chic loft in the heart of the city',
    client: 'Urban Living',
    date: new Date('2024-01-20'),
    featured: true
  },
  {
    id: 'port-3',
    title: 'Coastal Retreat',
    category: 'real-estate',
    image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400&q=80',
    description: 'Beachfront property with ocean views',
    client: 'Coastal Properties',
    date: new Date('2024-02-01'),
    featured: true
  },
  {
    id: 'port-4',
    title: 'Tech Startup Office',
    category: 'brand',
    image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=400&q=80',
    description: 'Modern office space photography',
    client: 'TechFlow Inc',
    date: new Date('2024-02-10'),
    featured: false
  },
  {
    id: 'port-5',
    title: 'Luxury Watch Collection',
    category: 'product',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1200&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80',
    description: 'High-end product photography',
    client: 'Timepiece Co',
    date: new Date('2024-02-15'),
    featured: false
  },
  {
    id: 'port-6',
    title: 'Executive Portrait',
    category: 'portrait',
    image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=1200&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80',
    description: 'Professional headshot session',
    client: 'Executive Coaching',
    date: new Date('2024-02-20'),
    featured: false
  },
  {
    id: 'port-7',
    title: 'Aerial Property View',
    category: 'real-estate',
    image: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=1200&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=400&q=80',
    description: 'Drone photography showcasing property',
    client: 'Elite Homes',
    date: new Date('2024-03-01'),
    featured: true
  },
  {
    id: 'port-8',
    title: 'Property Walkthrough',
    category: 'video',
    image: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=1200&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=400&q=80',
    description: 'Cinematic video tour',
    client: 'Premier Estates',
    date: new Date('2024-03-05'),
    featured: true
  }
];

export const testimonials: Testimonial[] = [
  {
    id: 'test-1',
    name: 'Sarah Mitchell',
    role: 'Real Estate Agent',
    company: 'Compass Realty',
    content: 'Delivered next-day photos that helped us sell the listing in 48 hours. The quality is consistently outstanding and the booking process is seamless.',
    rating: 5,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80',
    category: 'real-estate'
  },
  {
    id: 'test-2',
    name: 'Mike Thompson',
    role: 'Owner',
    company: 'MT Construction',
    content: 'Professional, punctual, and understands construction timelines. The progress documentation has been invaluable for our projects.',
    rating: 5,
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80',
    category: 'contractor'
  },
  {
    id: 'test-3',
    name: 'Alex Chen',
    role: 'Marketing Director',
    company: 'Bloom Brands',
    content: 'The brand photography exceeded our expectations. Usage rights were clear, turnaround was fast, and the creative direction was spot-on.',
    rating: 5,
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80',
    category: 'brand'
  },
  {
    id: 'test-4',
    name: 'Jennifer Walsh',
    role: 'Broker',
    company: 'Luxury Living',
    content: 'My go-to photographer for all high-end listings. The attention to detail and ability to capture the essence of a property is unmatched.',
    rating: 5,
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&q=80',
    category: 'real-estate'
  }
];

export const mockClients: Client[] = [
  {
    id: 'client-1',
    userId: 'user-2',
    source: 'website',
    notes: 'VIP client, prefers morning shoots',
    tags: ['vip', 'realtor', 'repeat'],
    totalBookings: 8,
    totalRevenue: 325000,
    lastBookingDate: new Date('2024-11-15'),
    preferredContact: 'email',
    createdAt: new Date('2024-01-10')
  },
  {
    id: 'client-2',
    userId: 'user-3',
    source: 'referral',
    notes: 'Construction documentation needs',
    tags: ['contractor', 'ongoing'],
    totalBookings: 5,
    totalRevenue: 180000,
    lastBookingDate: new Date('2024-10-28'),
    preferredContact: 'call',
    createdAt: new Date('2024-03-15')
  },
  {
    id: 'client-3',
    userId: 'user-4',
    source: 'social',
    notes: 'Brand campaigns, quarterly shoots',
    tags: ['brand', 'high-value'],
    totalBookings: 3,
    totalRevenue: 245000,
    lastBookingDate: new Date('2024-09-20'),
    preferredContact: 'email',
    createdAt: new Date('2024-05-01')
  }
];

export const mockBookings: Booking[] = [
  {
    id: 'book-1',
    clientId: 'client-1',
    clientName: 'Sarah Mitchell',
    clientEmail: 'sarah@compassrealty.com',
    serviceId: 'svc-2',
    serviceName: 'Luxury Property Package',
    addons: [
      { addonId: 'addon-1', name: 'Rush Delivery (24h)', price: 9900 }
    ],
    dateTime: {
      start: new Date('2024-12-10T10:00:00'),
      end: new Date('2024-12-10T13:00:00'),
      timezone: 'America/New_York'
    },
    location: {
      address: '123 Luxury Lane, Beverly Hills, CA 90210',
      notes: 'Gate code: 1234'
    },
    pricing: {
      subtotal: 59800,
      travelFee: 0,
      total: 59800,
      depositAmount: 29900
    },
    payment: {
      status: 'deposit_paid',
      method: 'stripe',
      paidAt: new Date('2024-12-01')
    },
    status: 'confirmed',
    notes: 'Twilight shots requested',
    createdAt: new Date('2024-12-01')
  },
  {
    id: 'book-2',
    clientId: 'client-2',
    clientName: 'Mike Thompson',
    clientEmail: 'mike@mtconstruction.com',
    serviceId: 'svc-1',
    serviceName: 'Real Estate Photo Package',
    addons: [],
    dateTime: {
      start: new Date('2024-12-15T14:00:00'),
      end: new Date('2024-12-15T15:30:00'),
      timezone: 'America/New_York'
    },
    location: {
      address: '456 Build Way, Austin, TX 78701',
      notes: 'Active construction site'
    },
    pricing: {
      subtotal: 24900,
      travelFee: 0,
      total: 24900,
      depositAmount: 12450
    },
    payment: {
      status: 'paid_in_full',
      method: 'stripe',
      paidAt: new Date('2024-12-05')
    },
    status: 'confirmed',
    notes: '',
    createdAt: new Date('2024-12-05')
  }
];

export const mockInvoices: Invoice[] = [
  {
    id: 'inv-1',
    invoiceNumber: 'INV-2024-001',
    clientId: 'client-1',
    clientName: 'Sarah Mitchell',
    bookingId: 'book-1',
    items: [
      { description: 'Luxury Property Package', quantity: 1, unitPrice: 49900, total: 49900 },
      { description: 'Rush Delivery (24h)', quantity: 1, unitPrice: 9900, total: 9900 }
    ],
    subtotal: 59800,
    tax: 0,
    total: 59800,
    amountPaid: 29900,
    balanceDue: 29900,
    status: 'sent',
    dueDate: new Date('2024-12-20'),
    sentAt: new Date('2024-12-05'),
    createdAt: new Date('2024-12-05')
  },
  {
    id: 'inv-2',
    invoiceNumber: 'INV-2024-002',
    clientId: 'client-2',
    clientName: 'Mike Thompson',
    bookingId: 'book-2',
    items: [
      { description: 'Real Estate Photo Package', quantity: 1, unitPrice: 24900, total: 24900 }
    ],
    subtotal: 24900,
    tax: 0,
    total: 24900,
    amountPaid: 24900,
    balanceDue: 0,
    status: 'paid',
    dueDate: new Date('2024-12-10'),
    paidAt: new Date('2024-12-05'),
    sentAt: new Date('2024-12-05'),
    createdAt: new Date('2024-12-05')
  },
  {
    id: 'inv-3',
    invoiceNumber: 'INV-2024-003',
    clientId: 'client-3',
    clientName: 'Alex Chen',
    items: [
      { description: 'Brand Photography - Q4 Campaign', quantity: 1, unitPrice: 39900, total: 39900 },
      { description: 'Additional Location', quantity: 1, unitPrice: 15000, total: 15000 }
    ],
    subtotal: 54900,
    tax: 0,
    total: 54900,
    amountPaid: 0,
    balanceDue: 54900,
    status: 'sent',
    dueDate: new Date('2024-12-30'),
    sentAt: new Date('2024-12-01'),
    createdAt: new Date('2024-12-01')
  }
];

export const mockProjects: Project[] = [
  {
    id: 'proj-1',
    projectNumber: 'PRJ-2024-001',
    clientId: 'client-1',
    clientName: 'Sarah Mitchell',
    bookingId: 'book-1',
    name: 'Luxury Hillside Estate',
    description: 'Full marketing package for luxury listing',
    status: 'editing',
    workflowStage: 3,
    deliverables: [
      { id: 'del-1', name: 'Exterior Photos', type: 'photo', status: 'ready' },
      { id: 'del-2', name: 'Interior Photos', type: 'photo', status: 'ready' },
      { id: 'del-3', name: 'Twilight Shots', type: 'photo', status: 'pending' },
      { id: 'del-4', name: 'Drone Footage', type: 'video', status: 'pending' }
    ],
    dueDate: new Date('2024-12-12'),
    notes: 'Client requested extra attention to pool area',
    createdAt: new Date('2024-12-01'),
    updatedAt: new Date('2024-12-08')
  },
  {
    id: 'proj-2',
    projectNumber: 'PRJ-2024-002',
    clientId: 'client-2',
    clientName: 'Mike Thompson',
    bookingId: 'book-2',
    name: 'Construction Progress - Site A',
    description: 'Monthly progress documentation',
    status: 'delivered',
    workflowStage: 5,
    deliverables: [
      { id: 'del-5', name: 'Progress Photos', type: 'photo', status: 'downloaded' },
      { id: 'del-6', name: 'RAW Files', type: 'raw', status: 'ready' }
    ],
    dueDate: new Date('2024-12-18'),
    notes: '',
    createdAt: new Date('2024-12-05'),
    updatedAt: new Date('2024-12-16')
  },
  {
    id: 'proj-3',
    projectNumber: 'PRJ-2024-003',
    clientId: 'client-3',
    clientName: 'Alex Chen',
    bookingId: 'book-3',
    name: 'Q4 Brand Campaign',
    description: 'Holiday marketing campaign photography',
    status: 'booked',
    workflowStage: 1,
    deliverables: [],
    dueDate: new Date('2025-01-15'),
    notes: 'Shoot scheduled for Dec 20th',
    createdAt: new Date('2024-12-01'),
    updatedAt: new Date('2024-12-01')
  }
];

export const dashboardMetrics: DashboardMetrics = {
  totalBookings: 47,
  totalRevenue: 1258000,
  pendingInvoices: 3,
  activeProjects: 8,
  conversionRate: 68,
  averageOrderValue: 26766,
  repeatClientRate: 62,
  monthlyGrowth: 15
};

export const activityLogs: ActivityLog[] = [
  {
    id: 'act-1',
    entityType: 'booking',
    entityId: 'book-1',
    action: 'created',
    actorId: 'user-2',
    actorName: 'Sarah Mitchell',
    metadata: { service: 'Luxury Property Package' },
    createdAt: new Date('2024-12-01T10:30:00')
  },
  {
    id: 'act-2',
    entityType: 'booking',
    entityId: 'book-1',
    action: 'payment_received',
    actorId: 'system',
    actorName: 'System',
    metadata: { amount: 29900, method: 'stripe' },
    createdAt: new Date('2024-12-01T10:35:00')
  },
  {
    id: 'act-3',
    entityType: 'project',
    entityId: 'proj-1',
    action: 'status_changed',
    actorId: 'user-1',
    actorName: 'Admin',
    metadata: { from: 'shot', to: 'editing' },
    createdAt: new Date('2024-12-08T14:00:00')
  }
];

// Helper functions
export const getServiceById = (id: string): Service | undefined => {
  return services.find(s => s.id === id);
};

export const getAddOnById = (id: string): AddOn | undefined => {
  return addOns.find(a => a.id === id);
};

export const getServiceAddOns = (serviceId: string): AddOn[] => {
  const service = getServiceById(serviceId);
  if (!service) return [];
  return addOns.filter(a => a.applicableServices.includes(serviceId));
};

export const formatPrice = (cents: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100);
};

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  }).format(date);
};

export const formatTime = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date);
};
