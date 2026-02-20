import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  User,
  Booking,
  Invoice,
  Project,
  Service,
  AddOn,
  Client,
  PortfolioItem,
  Testimonial,
  CarouselVideo,
  ContactMessage,
  Payment,
} from '@/types';
import {
  authService,
  servicesService,
  addOnsService,
  bookingsService,
  clientsService,
  invoicesService,
  projectsService,
  portfolioService,
  portfolioCategoriesService,
  testimonialsService,
  carouselVideosService,
  contactMessagesService,
  paymentsService,
  seedFirestore,
} from '@/lib/firebaseService';

// Auth State
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  magicLinkLogin: (email: string) => Promise<boolean>;
  setUser: (user: User | null) => void;
}

// Booking State
interface BookingState {
  currentBooking: Partial<Booking> | null;
  selectedService: Service | null;
  selectedAddOns: AddOn[];
  selectedDate: Date | null;
  selectedTimeSlot: { start: Date; end: Date } | null;
  setService: (service: Service) => void;
  toggleAddOn: (addon: AddOn) => void;
  setDate: (date: Date) => void;
  setTimeSlot: (slot: { start: Date; end: Date }) => void;
  updateBookingDetails: (details: Partial<Booking>) => void;
  clearBooking: () => void;
}

// Data State (replaces both Portal and Admin with Firebase-backed data)
interface DataState {
  // Shared data loaded from Firebase
  services: Service[];
  addOns: AddOn[];
  portfolioItems: PortfolioItem[];
  portfolioCategories: string[];
  testimonials: Testimonial[];
  carouselVideos: CarouselVideo[];
  contactMessages: ContactMessage[];

  // Client portal data
  bookings: Booking[];
  invoices: Invoice[];
  projects: Project[];

  // Admin data
  clients: Client[];
  allBookings: Booking[];
  allInvoices: Invoice[];
  allProjects: Project[];
  allPayments: Payment[];

  // Data loading states
  dataLoaded: boolean;
  dataLoading: boolean;

  // Actions
  loadPublicData: () => Promise<void>;
  loadPortalData: (clientId: string) => Promise<void>;
  loadAdminData: () => Promise<void>;
  refreshData: () => void;
  updateBookingStatus: (id: string, status: string) => void;
  updateProjectStatus: (id: string, status: string) => void;
  updateInvoiceStatus: (id: string, status: string) => void;
  seedDatabase: () => Promise<void>;

  // CRUD for admin
  adminCreateService: (service: Omit<Service, 'id'>) => Promise<void>;
  adminUpdateService: (id: string, data: Partial<Service>) => Promise<void>;
  adminDeleteService: (id: string) => Promise<void>;
  adminCreateAddOn: (addon: Omit<AddOn, 'id'>) => Promise<void>;
  adminUpdateAddOn: (id: string, data: Partial<AddOn>) => Promise<void>;
  adminDeleteAddOn: (id: string) => Promise<void>;
  adminCreatePortfolioItem: (item: Omit<PortfolioItem, 'id'>) => Promise<void>;
  adminUpdatePortfolioItem: (id: string, data: Partial<PortfolioItem>) => Promise<void>;
  adminDeletePortfolioItem: (id: string) => Promise<void>;
  adminCreateCarouselVideo: (video: Omit<CarouselVideo, 'id' | 'createdAt'>) => Promise<void>;
  adminUpdateCarouselVideo: (id: string, data: Partial<CarouselVideo>) => Promise<void>;
  adminDeleteCarouselVideo: (id: string) => Promise<void>;
  adminMarkMessageRead: (id: string) => Promise<void>;
  adminMarkMessageUnread: (id: string) => Promise<void>;
  adminDeleteMessage: (id: string) => Promise<void>;

  // Portfolio category actions
  adminSetPortfolioCategories: (categories: string[]) => Promise<void>;
  adminDeletePortfolioCategory: (category: string) => Promise<void>;

  // Testimonial actions
  userSubmitTestimonial: (testimonial: Omit<Testimonial, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  adminUpdateTestimonial: (id: string, data: Partial<Testimonial>) => Promise<void>;
  adminDeleteTestimonial: (id: string) => Promise<void>;

  // Project/Invoice Management
  adminCreateProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  adminUpdateProject: (id: string, data: Partial<Project>) => Promise<void>;
  adminDeleteProject: (id: string) => Promise<void>;
  adminCreateInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt'>) => Promise<void>;
  adminUpdateInvoice: (id: string, data: Partial<Invoice>) => Promise<void>;
}

// Combined Store
interface AppState extends AuthState, BookingState, DataState {
  // UI State
  isLoading: boolean;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  clearToast: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ─── Auth ──────────────────────────────────────────────────
      user: null,
      isAuthenticated: false,
      authLoading: true,

      login: async (email: string, password: string) => {
        try {
          const firebaseUser = await authService.login(email, password);
          const profile = await authService.getUserProfile(firebaseUser.uid);
          if (profile) {
            set({ user: profile, isAuthenticated: true });
            return true;
          }
          return false;
        } catch (error) {
          console.error('Login failed:', error);
          return false;
        }
      },

      logout: async () => {
        try {
          await authService.logout();
        } catch (e) {
          console.error('Logout error:', e);
        }
        set({
          user: null,
          isAuthenticated: false,
          currentBooking: null,
          selectedService: null,
          selectedAddOns: [],
          selectedDate: null,
          selectedTimeSlot: null,
          bookings: [],
          invoices: [],
          projects: [],
        });
      },

      magicLinkLogin: async (email: string) => {
        try {
          await authService.sendMagicLink(email);
          get().showToast('Magic link sent! Check your email.', 'success');
          return true;
        } catch (error) {
          console.error('Magic link failed:', error);
          return false;
        }
      },

      setUser: (user: User | null) => {
        set({
          user,
          isAuthenticated: !!user,
          authLoading: false
        });
      },

      // ─── Booking ───────────────────────────────────────────────
      currentBooking: null,
      selectedService: null,
      selectedAddOns: [],
      selectedDate: null,
      selectedTimeSlot: null,

      setService: (service: Service) => {
        set({
          selectedService: service,
          selectedAddOns: []
        });
      },

      toggleAddOn: (addon: AddOn) => {
        const { selectedAddOns } = get();
        const exists = selectedAddOns.find(a => a.id === addon.id);
        if (exists) {
          set({
            selectedAddOns: selectedAddOns.filter(a => a.id !== addon.id)
          });
        } else {
          set({
            selectedAddOns: [...selectedAddOns, addon]
          });
        }
      },

      setDate: (date: Date) => set({ selectedDate: date }),

      setTimeSlot: (slot: { start: Date; end: Date }) => {
        set({ selectedTimeSlot: slot });
      },

      updateBookingDetails: (details: Partial<Booking>) => {
        set(state => ({
          currentBooking: { ...state.currentBooking, ...details }
        }));
      },

      clearBooking: () => {
        set({
          currentBooking: null,
          selectedService: null,
          selectedAddOns: [],
          selectedDate: null,
          selectedTimeSlot: null
        });
      },

      // ─── Data (Firebase-backed) ────────────────────────────────
      services: [],
      addOns: [],
      portfolioItems: [],
      portfolioCategories: [],
      testimonials: [],
      carouselVideos: [],
      contactMessages: [],
      bookings: [],
      invoices: [],
      projects: [],
      clients: [],
      allBookings: [],
      allInvoices: [],
      allProjects: [],
      allPayments: [],
      dataLoaded: false,
      dataLoading: false,

      loadPublicData: async () => {
        if (get().dataLoading) return;
        set({ dataLoading: true });
        try {
          const [svcs, addons, portfolio, cats, testis, activeVideos] = await Promise.all([
            servicesService.getAll(),
            addOnsService.getAll(),
            portfolioService.getAll(),
            portfolioCategoriesService.getAll(),
            testimonialsService.getAll(),
            carouselVideosService.getActive(),
          ]);

          set({
            services: svcs,
            addOns: addons,
            portfolioItems: portfolio,
            portfolioCategories: cats,
            testimonials: testis,
            carouselVideos: activeVideos,
            dataLoaded: true,
            dataLoading: false,
          });


        } catch (error) {
          console.error('Failed to load public data:', error);
          set({ dataLoading: false });
        }
      },

      loadPortalData: async (userId: string) => {
        try {
          // Resolve correct client ID: Check if user has a dedicated client doc
          let targetClientId = userId;
          const clientDoc = await clientsService.getByUserId(userId);
          if (clientDoc) {
            targetClientId = clientDoc.id;
          }

          const [bookings, invoices, projects] = await Promise.all([
            bookingsService.getByClient(targetClientId),
            invoicesService.getByClient(targetClientId),
            projectsService.getByClient(targetClientId),
          ]);
          set({ bookings, invoices, projects });
        } catch (error) {
          console.error('Failed to load portal data:', error);
        }
      },

      loadAdminData: async () => {
        try {
          const [clients, bookings, invoices, projects, carouselVids, messages, payments] = await Promise.all([
            clientsService.getAll(),
            bookingsService.getAll(),
            invoicesService.getAll(),
            projectsService.getAll(),
            carouselVideosService.getAll(),
            contactMessagesService.getAll(),
            paymentsService.getAll(),
          ]);
          set({
            clients,
            allBookings: bookings,
            allInvoices: invoices,
            allProjects: projects,
            carouselVideos: carouselVids,
            contactMessages: messages,
            allPayments: payments,
          });
        } catch (error) {
          console.error('Failed to load admin data:', error);
        }
      },

      refreshData: () => {
        const { user } = get();
        get().loadPublicData();
        if (user?.role === 'admin') {
          get().loadAdminData();
        }
      },

      updateBookingStatus: async (id: string, status: string) => {
        try {
          await bookingsService.updateStatus(id, status);
          set(state => ({
            allBookings: state.allBookings.map(b =>
              b.id === id ? { ...b, status: status as any } : b
            )
          }));
          get().showToast('Booking status updated', 'success');
        } catch (error) {
          console.error('Failed to update booking:', error);
          get().showToast('Failed to update booking', 'error');
        }
      },

      updateProjectStatus: async (id: string, status: string) => {
        try {
          await projectsService.updateStatus(id, status);
          set(state => ({
            allProjects: state.allProjects.map(p =>
              p.id === id ? { ...p, status: status as any } : p
            )
          }));
          get().showToast('Project status updated', 'success');
        } catch (error) {
          console.error('Failed to update project:', error);
          get().showToast('Failed to update project', 'error');
        }
      },

      updateInvoiceStatus: async (id: string, status: string) => {
        try {
          await invoicesService.updateStatus(id, status);
          set(state => ({
            allInvoices: state.allInvoices.map(i =>
              i.id === id ? { ...i, status: status as any } : i
            )
          }));
          get().showToast('Invoice status updated', 'success');
        } catch (error) {
          console.error('Failed to update invoice:', error);
          get().showToast('Failed to update invoice', 'error');
        }
      },

      seedDatabase: async () => {
        try {
          get().showToast('Seeding database...', 'info');
          await seedFirestore();
          get().showToast('Database seeded successfully!', 'success');
          // Reload data after seeding
          await get().loadPublicData();
        } catch (error) {
          console.error('Seed failed:', error);
          get().showToast('Failed to seed database', 'error');
        }
      },

      // ─── Admin CRUD actions ─────────────────────────────────────
      adminCreateService: async (service) => {
        try {
          await servicesService.create(service);
          const updated = await servicesService.getAll();
          set({ services: updated });
          get().showToast('Service created successfully', 'success');
        } catch (error) {
          console.error('Create service failed:', error);
          get().showToast('Failed to create service', 'error');
        }
      },
      adminUpdateService: async (id, data) => {
        try {
          await servicesService.update(id, data);
          const updated = await servicesService.getAll();
          set({ services: updated });
          get().showToast('Service updated successfully', 'success');
        } catch (error) {
          console.error('Update service failed:', error);
          get().showToast('Failed to update service', 'error');
        }
      },
      adminDeleteService: async (id) => {
        try {
          await servicesService.delete(id);
          set(s => ({ services: s.services.filter(sv => sv.id !== id) }));
          get().showToast('Service deleted', 'success');
        } catch (error) {
          console.error('Delete service failed:', error);
          get().showToast('Failed to delete service', 'error');
        }
      },
      adminCreateAddOn: async (addon) => {
        try {
          await addOnsService.create(addon);
          const updated = await addOnsService.getAll();
          set({ addOns: updated });
          get().showToast('Add-on created successfully', 'success');
        } catch (error) {
          console.error('Create add-on failed:', error);
          get().showToast('Failed to create add-on', 'error');
        }
      },
      adminUpdateAddOn: async (id, data) => {
        try {
          await addOnsService.update(id, data);
          const updated = await addOnsService.getAll();
          set({ addOns: updated });
          get().showToast('Add-on updated successfully', 'success');
        } catch (error) {
          console.error('Update add-on failed:', error);
          get().showToast('Failed to update add-on', 'error');
        }
      },
      adminDeleteAddOn: async (id) => {
        try {
          await addOnsService.delete(id);
          set(s => ({ addOns: s.addOns.filter(a => a.id !== id) }));
          get().showToast('Add-on deleted', 'success');
        } catch (error) {
          console.error('Delete add-on failed:', error);
          get().showToast('Failed to delete add-on', 'error');
        }
      },
      adminCreatePortfolioItem: async (item) => {
        try {
          await portfolioService.create(item);
          const updated = await portfolioService.getAll();
          set({ portfolioItems: updated });
          get().showToast('Portfolio item created', 'success');
        } catch (error) {
          console.error('Create portfolio failed:', error);
          get().showToast('Failed to create portfolio item', 'error');
        }
      },
      adminUpdatePortfolioItem: async (id, data) => {
        try {
          await portfolioService.update(id, data);
          const updated = await portfolioService.getAll();
          set({ portfolioItems: updated });
          get().showToast('Portfolio item updated', 'success');
        } catch (error) {
          console.error('Update portfolio failed:', error);
          get().showToast('Failed to update portfolio item', 'error');
        }
      },
      adminDeletePortfolioItem: async (id) => {
        try {
          await portfolioService.delete(id);
          set(s => ({ portfolioItems: s.portfolioItems.filter(p => p.id !== id) }));
          get().showToast('Portfolio item deleted', 'success');
        } catch (error) {
          console.error('Delete portfolio failed:', error);
          get().showToast('Failed to delete portfolio item', 'error');
        }
      },
      adminCreateCarouselVideo: async (video) => {
        try {
          await carouselVideosService.create(video);
          const updated = await carouselVideosService.getAll();
          set({ carouselVideos: updated });
          get().showToast('Carousel video added', 'success');
        } catch (error) {
          console.error('Create carousel video failed:', error);
          get().showToast('Failed to add carousel video', 'error');
        }
      },
      adminUpdateCarouselVideo: async (id, data) => {
        try {
          await carouselVideosService.update(id, data);
          const updated = await carouselVideosService.getAll();
          set({ carouselVideos: updated });
          get().showToast('Carousel video updated', 'success');
        } catch (error) {
          console.error('Update carousel video failed:', error);
          get().showToast('Failed to update carousel video', 'error');
        }
      },
      adminDeleteCarouselVideo: async (id) => {
        try {
          await carouselVideosService.delete(id);
          set(s => ({ carouselVideos: s.carouselVideos.filter(v => v.id !== id) }));
          get().showToast('Carousel video deleted', 'success');
        } catch (error) {
          console.error('Delete carousel video failed:', error);
          get().showToast('Failed to delete carousel video', 'error');
        }
      },
      adminMarkMessageRead: async (id) => {
        try {
          await contactMessagesService.markAsRead(id);
          set(s => ({ contactMessages: s.contactMessages.map(m => m.id === id ? { ...m, isRead: true } : m) }));
        } catch (error) {
          console.error('Mark message read failed:', error);
        }
      },
      adminMarkMessageUnread: async (id) => {
        try {
          await contactMessagesService.markAsUnread(id);
          set(s => ({ contactMessages: s.contactMessages.map(m => m.id === id ? { ...m, isRead: false } : m) }));
        } catch (error) {
          console.error('Mark message unread failed:', error);
        }
      },
      adminDeleteMessage: async (id) => {
        try {
          await contactMessagesService.delete(id);
          set(s => ({ contactMessages: s.contactMessages.filter(m => m.id !== id) }));
          get().showToast('Message deleted', 'success');
        } catch (error) {
          console.error('Delete message failed:', error);
          get().showToast('Failed to delete message', 'error');
        }
      },

      // ─── Portfolio Category Actions ──────────────────────────────────────
      adminSetPortfolioCategories: async (categories) => {
        try {
          await portfolioCategoriesService.save(categories);
          set({ portfolioCategories: categories });
          get().showToast('Categories updated', 'success');
        } catch (error) {
          console.error('Save categories failed:', error);
          get().showToast('Failed to update categories', 'error');
        }
      },

      adminDeletePortfolioCategory: async (category) => {
        try {
          const updated = get().portfolioCategories.filter(c => c !== category);
          await portfolioCategoriesService.save(updated);
          set({ portfolioCategories: updated });
          get().showToast(`Category "${category}" deleted`, 'success');
        } catch (error) {
          console.error('Delete category failed:', error);
          get().showToast('Failed to delete category', 'error');
        }
      },

      // ─── Testimonial Actions ─────────────────────────────────────
      userSubmitTestimonial: async (testimonial) => {
        try {
          await testimonialsService.create(testimonial);
          get().showToast('Testimonial submitted for review!', 'success');
        } catch (error) {
          console.error('Submit testimonial failed:', error);
          get().showToast('Failed to submit testimonial', 'error');
        }
      },

      adminUpdateTestimonial: async (id, data) => {
        try {
          await testimonialsService.update(id, data);
          const updated = get().testimonials.map(t => t.id === id ? { ...t, ...data } : t);
          set({ testimonials: updated });
          get().showToast('Testimonial updated', 'success');
        } catch (error) {
          console.error('Update testimonial failed:', error);
          get().showToast('Failed to update testimonial', 'error');
        }
      },

      adminDeleteTestimonial: async (id) => {
        try {
          await testimonialsService.delete(id);
          set(s => ({ testimonials: s.testimonials.filter(t => t.id !== id) }));
          get().showToast('Testimonial deleted', 'success');
        } catch (error) {
          console.error('Delete testimonial failed:', error);
          get().showToast('Failed to delete testimonial', 'error');
        }
      },

      // ─── UI ────────────────────────────────────────────────────
      isLoading: false,
      toast: null,

      showToast: (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        set({ toast: { message, type } });
        setTimeout(() => set({ toast: null }), 4000);
      },

      clearToast: () => set({ toast: null }),

      // ─── ADMIN PROJECTS & INVOICES ──────────────────────────────
      adminCreateProject: async (project) => {
        try {
          const id = await projectsService.create(project);
          const newProject = { id, ...project, createdAt: new Date(), updatedAt: new Date() } as Project;
          set(s => ({ allProjects: [newProject, ...s.allProjects] }));
          get().showToast('Project created', 'success');
        } catch (error) {
          console.error('Create project failed:', error);
          get().showToast('Failed to create project', 'error');
        }
      },

      adminUpdateProject: async (id, data) => {
        try {
          await projectsService.update(id, data);
          set(s => ({
            allProjects: s.allProjects.map(p => p.id === id ? { ...p, ...data, updatedAt: new Date() } : p)
          }));
          get().showToast('Project updated', 'success');
        } catch (error) {
          console.error('Update project failed:', error);
          get().showToast('Failed to update project', 'error');
        }
      },

      adminDeleteProject: async (id) => {
        try {
          await projectsService.delete(id);
          set(s => ({ allProjects: s.allProjects.filter(p => p.id !== id) }));
          get().showToast('Project deleted', 'success');
        } catch (error) {
          console.error('Delete project failed:', error);
          get().showToast('Failed to delete project', 'error');
        }
      },

      adminCreateInvoice: async (invoice) => {
        try {
          const id = await invoicesService.create(invoice);
          const newInvoice = { id, ...invoice, createdAt: new Date() } as Invoice;
          set(s => ({ allInvoices: [newInvoice, ...s.allInvoices] }));
          get().showToast('Invoice created', 'success');
        } catch (error) {
          console.error('Create invoice failed:', error);
          get().showToast('Failed to create invoice', 'error');
        }
      },

      adminUpdateInvoice: async (id, data) => {
        try {
          await invoicesService.update(id, data);
          set(s => ({
            allInvoices: s.allInvoices.map(i => i.id === id ? { ...i, ...data } : i)
          }));
          get().showToast('Invoice updated', 'success');
        } catch (error) {
          console.error('Update invoice failed:', error);
          get().showToast('Failed to update invoice', 'error');
        }
      }
    }),
    {
      name: 'studio-booking-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);

// Selector hooks for better performance
export const useAuth = () => {
  const { user, isAuthenticated, authLoading, login, logout, magicLinkLogin, setUser } = useStore();
  return { user, isAuthenticated, authLoading, login, logout, magicLinkLogin, setUser };
};

export const useBooking = () => {
  const {
    selectedService,
    selectedAddOns,
    selectedDate,
    selectedTimeSlot,
    setService,
    toggleAddOn,
    setDate,
    setTimeSlot,
    clearBooking
  } = useStore();

  return {
    selectedService,
    selectedAddOns,
    selectedDate,
    selectedTimeSlot,
    setService,
    toggleAddOn,
    setDate,
    setTimeSlot,
    clearBooking
  };
};

export const usePortal = () => {
  const { bookings, invoices, projects, refreshData, loadPortalData } = useStore();
  return { bookings, invoices, projects, refreshData, loadPortalData };
};

export const useAdmin = () => {
  const {
    services,
    addOns,
    clients,
    allBookings,
    allInvoices,
    allProjects,
    allPayments,
    testimonials,
    portfolioItems,
    portfolioCategories,
    carouselVideos,
    contactMessages,
    updateBookingStatus,
    updateProjectStatus,
    updateInvoiceStatus,
    loadAdminData,
    adminCreateService,
    adminUpdateService,
    adminDeleteService,
    adminCreateAddOn,
    adminUpdateAddOn,
    adminDeleteAddOn,
    adminCreatePortfolioItem,
    adminUpdatePortfolioItem,
    adminDeletePortfolioItem,
    adminSetPortfolioCategories,
    adminDeletePortfolioCategory,
    adminCreateCarouselVideo,
    adminUpdateCarouselVideo,
    adminDeleteCarouselVideo,
    adminMarkMessageRead,
    adminMarkMessageUnread,
    adminDeleteMessage,
    // Testimonials
    userSubmitTestimonial,
    adminUpdateTestimonial,
    adminDeleteTestimonial,
    // Projects & Invoices
    adminCreateProject,
    adminUpdateProject,
    adminDeleteProject,
    adminCreateInvoice,
    adminUpdateInvoice
  } = useStore();

  return {
    services,
    addOns,
    clients,
    allBookings,
    allInvoices,
    allProjects,
    allPayments,
    testimonials,
    portfolioItems,
    portfolioCategories,
    carouselVideos,
    contactMessages,
    updateBookingStatus,
    updateProjectStatus,
    updateInvoiceStatus,
    loadAdminData,
    adminCreateService,
    adminUpdateService,
    adminDeleteService,
    adminCreateAddOn,
    adminUpdateAddOn,
    adminDeleteAddOn,
    adminCreatePortfolioItem,
    adminUpdatePortfolioItem,
    adminDeletePortfolioItem,
    adminSetPortfolioCategories,
    adminDeletePortfolioCategory,
    adminCreateCarouselVideo,
    adminUpdateCarouselVideo,
    adminDeleteCarouselVideo,
    adminMarkMessageRead,
    adminMarkMessageUnread,
    adminDeleteMessage,
    userSubmitTestimonial,
    adminUpdateTestimonial,
    adminDeleteTestimonial,
    adminCreateProject,
    adminUpdateProject,
    adminDeleteProject,
    adminCreateInvoice,
    adminUpdateInvoice
  };
};
