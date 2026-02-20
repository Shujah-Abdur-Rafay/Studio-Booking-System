import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    Timestamp,
    serverTimestamp,
    setDoc,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendSignInLinkToEmail,
    onAuthStateChanged,
    type User as FirebaseUser,
} from "firebase/auth";
import { db, auth, storage } from "./firebase";
import type {
    User,
    Client,
    Service,
    AddOn,
    Booking,
    Invoice,
    Project,
    PortfolioItem,
    Testimonial,
    CarouselVideo,
    ContactMessage,
    Payment,
} from "@/types";

// ─── Helper: Convert Firestore timestamps to Dates ────────────────────────
function convertTimestamps(data: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = { ...data };
    for (const key of Object.keys(result)) {
        if (result[key] instanceof Timestamp) {
            result[key] = result[key].toDate();
        } else if (result[key] && typeof result[key] === "object" && !Array.isArray(result[key])) {
            result[key] = convertTimestamps(result[key]);
        }
    }
    return result;
}

// ─── AUTH SERVICE ──────────────────────────────────────────────────────────
export const authService = {
    // Sign up new user
    async register(email: string, password: string, profile: User["profile"]): Promise<User> {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const userData: Omit<User, "id"> = {
            email,
            role: "client",
            profile,
            createdAt: new Date(),
        };
        await setDoc(doc(db, "users", cred.user.uid), {
            ...userData,
            createdAt: serverTimestamp(),
        });

        // Create associated client record
        await addDoc(collection(db, "clients"), {
            userId: cred.user.uid,
            source: 'website',
            notes: '',
            tags: ['new'],
            totalBookings: 0,
            totalRevenue: 0,
            preferredContact: 'email',
            createdAt: serverTimestamp(),
        });
        return { id: cred.user.uid, ...userData };
    },

    // Sign in
    async login(email: string, password: string): Promise<FirebaseUser> {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        return cred.user;
    },

    // Sign out
    async logout(): Promise<void> {
        await signOut(auth);
    },

    // Send magic link
    async sendMagicLink(email: string): Promise<void> {
        await sendSignInLinkToEmail(auth, email, {
            url: window.location.origin,
            handleCodeInApp: true,
        });
        window.localStorage.setItem("emailForSignIn", email);
    },

    // Get user profile from Firestore
    async getUserProfile(uid: string): Promise<User | null> {
        const snap = await getDoc(doc(db, "users", uid));

        // Special logic for demo admin
        const currentUser = auth.currentUser;
        if (currentUser && currentUser.email === "admin@gmail.com") {
            const data = snap.exists() ? snap.data() : null;
            if (!data || data.role !== "admin") {
                console.log("Ensuring admin role for demo account...");
                const adminData = {
                    email: currentUser.email,
                    role: "admin",
                    profile: data?.profile || { firstName: "Admin", lastName: "User" },
                    createdAt: data?.createdAt || serverTimestamp(),
                    updatedAt: serverTimestamp(),
                };
                await setDoc(doc(db, "users", uid), adminData, { merge: true });
                return { id: uid, ...adminData, createdAt: new Date() } as User;
            }
        }

        if (!snap.exists()) return null;
        return { id: snap.id, ...convertTimestamps(snap.data()) } as User;
    },

    // Listen to auth state
    onAuthChange(callback: (user: FirebaseUser | null) => void) {
        return onAuthStateChanged(auth, callback);
    },
};

// ─── SERVICES SERVICE ──────────────────────────────────────────────────────
export const servicesService = {
    async getAll(): Promise<Service[]> {
        const snap = await getDocs(
            query(collection(db, "services"), orderBy("sortOrder", "asc"))
        );
        return snap.docs.map((d) => ({ id: d.id, ...convertTimestamps(d.data()) } as Service));
    },

    async getById(id: string): Promise<Service | null> {
        const snap = await getDoc(doc(db, "services", id));
        if (!snap.exists()) return null;
        return { id: snap.id, ...convertTimestamps(snap.data()) } as Service;
    },

    async create(service: Omit<Service, "id">): Promise<string> {
        const ref = await addDoc(collection(db, "services"), service);
        return ref.id;
    },

    async update(id: string, data: Partial<Service>): Promise<void> {
        await updateDoc(doc(db, "services", id), data);
    },

    async delete(id: string): Promise<void> {
        await deleteDoc(doc(db, "services", id));
    },
};

// ─── ADD-ONS SERVICE ───────────────────────────────────────────────────────
export const addOnsService = {
    async getAll(): Promise<AddOn[]> {
        const snap = await getDocs(collection(db, "addons"));
        return snap.docs.map((d) => ({ id: d.id, ...convertTimestamps(d.data()) } as AddOn));
    },

    async getForService(serviceId: string): Promise<AddOn[]> {
        const snap = await getDocs(
            query(
                collection(db, "addons"),
                where("applicableServices", "array-contains", serviceId),
                where("isActive", "==", true)
            )
        );
        return snap.docs.map((d) => ({ id: d.id, ...convertTimestamps(d.data()) } as AddOn));
    },

    async create(addon: Omit<AddOn, "id">): Promise<string> {
        const ref = await addDoc(collection(db, "addons"), addon);
        return ref.id;
    },

    async update(id: string, data: Partial<AddOn>): Promise<void> {
        await updateDoc(doc(db, "addons", id), data);
    },

    async delete(id: string): Promise<void> {
        await deleteDoc(doc(db, "addons", id));
    },
};

// ─── BOOKINGS SERVICE ──────────────────────────────────────────────────────
export const bookingsService = {
    async getAll(): Promise<Booking[]> {
        const snap = await getDocs(
            query(collection(db, "bookings"), orderBy("createdAt", "desc"))
        );
        return snap.docs.map((d) => ({ id: d.id, ...convertTimestamps(d.data()) } as Booking));
    },

    async getByClient(clientId: string): Promise<Booking[]> {
        const snap = await getDocs(
            query(
                collection(db, "bookings"),
                where("clientId", "==", clientId),
                orderBy("createdAt", "desc")
            )
        );
        return snap.docs.map((d) => ({ id: d.id, ...convertTimestamps(d.data()) } as Booking));
    },

    async getByDate(date: Date): Promise<Booking[]> {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);

        const snap = await getDocs(
            query(
                collection(db, "bookings"),
                where("dateTime.start", ">=", Timestamp.fromDate(start)),
                where("dateTime.start", "<=", Timestamp.fromDate(end))
            )
        );
        return snap.docs.map((d) => ({ id: d.id, ...convertTimestamps(d.data()) } as Booking));
    },

    async create(booking: Omit<Booking, "id" | "createdAt">): Promise<string> {
        const ref = await addDoc(collection(db, "bookings"), {
            ...booking,
            status: 'pending', // Enforce pending status for admin approval
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return ref.id;
    },

    async updateStatus(id: string, status: string): Promise<void> {
        await updateDoc(doc(db, "bookings", id), {
            status,
            updatedAt: serverTimestamp(),
        });
    },

    async update(id: string, data: Partial<Booking>): Promise<void> {
        await updateDoc(doc(db, "bookings", id), {
            ...data,
            updatedAt: serverTimestamp(),
        });
    },
};

// ─── CLIENTS SERVICE ───────────────────────────────────────────────────────
export const clientsService = {
    async getAll(): Promise<Client[]> {
        const [clientsSnap, usersSnap] = await Promise.all([
            getDocs(query(collection(db, "clients"), orderBy("createdAt", "desc"))),
            getDocs(collection(db, "users"))
        ]);

        const usersMap = new Map();
        usersSnap.docs.forEach(d => {
            usersMap.set(d.id, { id: d.id, ...convertTimestamps(d.data()) });
        });

        // 1. Get existing real clients
        const clients = clientsSnap.docs.map((d) => {
            const clientData = { id: d.id, ...convertTimestamps(d.data()) } as Client;
            const user = usersMap.get(clientData.userId);
            if (user) {
                clientData.name = `${user.profile.firstName} ${user.profile.lastName}`;
                clientData.email = user.email;
            }
            return clientData;
        });

        // 2. Find orphan users (role='client' but no client doc)
        const linkedUserIds = new Set(clients.map(c => c.userId));

        usersMap.forEach((user) => {
            if (user.role === 'client' && !linkedUserIds.has(user.id)) {
                clients.push({
                    id: user.id, // Use user ID as client ID
                    userId: user.id,
                    source: 'website',
                    notes: 'From User Profile',
                    tags: ['legacy'],
                    totalBookings: 0,
                    totalRevenue: 0,
                    preferredContact: 'email',
                    createdAt: user.createdAt || new Date(),
                    name: `${user.profile.firstName} ${user.profile.lastName}`,
                    email: user.email
                } as Client);
            }
        });

        // Sort by most recent
        return clients.sort((a, b) => {
            const tA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
            const tB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
            return tB - tA;
        });
    },

    async getByUserId(userId: string): Promise<Client | null> {
        const snap = await getDocs(
            query(collection(db, "clients"), where("userId", "==", userId), limit(1))
        );
        if (snap.empty) return null;
        return { id: snap.docs[0].id, ...convertTimestamps(snap.docs[0].data()) } as Client;
    },

    async create(client: Omit<Client, "id">): Promise<string> {
        const ref = await addDoc(collection(db, "clients"), {
            ...client,
            createdAt: serverTimestamp(),
        });
        return ref.id;
    },

    async update(id: string, data: Partial<Client>): Promise<void> {
        await updateDoc(doc(db, "clients", id), data);
    },
};

// ─── INVOICES SERVICE ──────────────────────────────────────────────────────
export const invoicesService = {
    async getAll(): Promise<Invoice[]> {
        const snap = await getDocs(
            query(collection(db, "invoices"), orderBy("createdAt", "desc"))
        );
        return snap.docs.map((d) => ({ id: d.id, ...convertTimestamps(d.data()) } as Invoice));
    },

    async getByClient(clientId: string): Promise<Invoice[]> {
        const snap = await getDocs(
            query(
                collection(db, "invoices"),
                where("clientId", "==", clientId),
                orderBy("createdAt", "desc")
            )
        );
        return snap.docs.map((d) => ({ id: d.id, ...convertTimestamps(d.data()) } as Invoice));
    },

    async create(invoice: Omit<Invoice, "id" | "createdAt">): Promise<string> {
        const ref = await addDoc(collection(db, "invoices"), {
            ...invoice,
            createdAt: serverTimestamp(),
        });
        return ref.id;
    },

    async update(id: string, data: Partial<Invoice>): Promise<void> {
        await updateDoc(doc(db, "invoices", id), data);
    },

    async updateStatus(id: string, status: string): Promise<void> {
        await updateDoc(doc(db, "invoices", id), { status });
    },
};

// ─── PROJECTS SERVICE ──────────────────────────────────────────────────────
export const projectsService = {
    async getAll(): Promise<Project[]> {
        const snap = await getDocs(
            query(collection(db, "projects"), orderBy("createdAt", "desc"))
        );
        return snap.docs.map((d) => ({ id: d.id, ...convertTimestamps(d.data()) } as Project));
    },

    async getByClient(clientId: string): Promise<Project[]> {
        const snap = await getDocs(
            query(
                collection(db, "projects"),
                where("clientId", "==", clientId),
                orderBy("createdAt", "desc")
            )
        );
        return snap.docs.map((d) => ({ id: d.id, ...convertTimestamps(d.data()) } as Project));
    },

    async create(project: Omit<Project, "id" | "createdAt" | "updatedAt">): Promise<string> {
        const ref = await addDoc(collection(db, "projects"), {
            ...project,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return ref.id;
    },

    async update(id: string, data: Partial<Project>): Promise<void> {
        await updateDoc(doc(db, "projects", id), {
            ...data,
            updatedAt: serverTimestamp(),
        });
    },

    async updateStatus(id: string, status: string): Promise<void> {
        await updateDoc(doc(db, "projects", id), {
            status,
            updatedAt: serverTimestamp(),
        });
    },

    async delete(id: string): Promise<void> {
        await deleteDoc(doc(db, "projects", id));
    },
};

// ─── PORTFOLIO SERVICE ─────────────────────────────────────────────────────
export const portfolioService = {
    async getAll(): Promise<PortfolioItem[]> {
        const snap = await getDocs(
            query(collection(db, "portfolio"), orderBy("date", "desc"))
        );
        return snap.docs.map((d) => ({ id: d.id, ...convertTimestamps(d.data()) } as PortfolioItem));
    },

    async getFeatured(): Promise<PortfolioItem[]> {
        const snap = await getDocs(
            query(
                collection(db, "portfolio"),
                where("featured", "==", true),
                orderBy("date", "desc")
            )
        );
        return snap.docs.map((d) => ({ id: d.id, ...convertTimestamps(d.data()) } as PortfolioItem));
    },

    async create(item: Omit<PortfolioItem, "id">): Promise<string> {
        const ref = await addDoc(collection(db, "portfolio"), {
            ...item,
            date: item.date instanceof Date ? Timestamp.fromDate(item.date) : item.date,
        });
        return ref.id;
    },

    async update(id: string, data: Partial<PortfolioItem>): Promise<void> {
        const updateData: any = { ...data };
        if (updateData.date && updateData.date instanceof Date) {
            updateData.date = Timestamp.fromDate(updateData.date);
        }
        await updateDoc(doc(db, "portfolio", id), updateData);
    },

    async delete(id: string): Promise<void> {
        await deleteDoc(doc(db, "portfolio", id));
    },
};

// ─── PORTFOLIO CATEGORIES SERVICE ─────────────────────────────────────────
const CATEGORIES_DOC = 'portfolioCategories';
const DEFAULT_CATEGORIES = ['real-estate', 'brand', 'product', 'portrait', 'event', 'video', 'bts'];

export const portfolioCategoriesService = {
    async getAll(): Promise<string[]> {
        const snap = await getDoc(doc(db, 'settings', CATEGORIES_DOC));
        if (snap.exists()) {
            const data = snap.data();
            return Array.isArray(data.categories) ? data.categories : DEFAULT_CATEGORIES;
        }
        // First time: seed defaults
        await setDoc(doc(db, 'settings', CATEGORIES_DOC), { categories: DEFAULT_CATEGORIES });
        return DEFAULT_CATEGORIES;
    },

    async save(categories: string[]): Promise<void> {
        await setDoc(doc(db, 'settings', CATEGORIES_DOC), { categories });
    },
};

// ─── TESTIMONIALS SERVICE ──────────────────────────────────────────────────
export const testimonialsService = {
    async getAll(): Promise<Testimonial[]> {
        const snap = await getDocs(
            query(collection(db, "testimonials"), orderBy("createdAt", "desc"))
        );
        return snap.docs.map((d) => ({ id: d.id, ...convertTimestamps(d.data()) } as Testimonial));
    },

    async create(testimonial: Omit<Testimonial, "id" | "createdAt" | "status">): Promise<string> {
        const ref = await addDoc(collection(db, "testimonials"), {
            ...testimonial,
            status: "pending",
            createdAt: serverTimestamp(),
        });
        return ref.id;
    },

    async update(id: string, data: Partial<Testimonial>): Promise<void> {
        await updateDoc(doc(db, "testimonials", id), data);
    },

    async delete(id: string): Promise<void> {
        await deleteDoc(doc(db, "testimonials", id));
    },
};

// ─── CAROUSEL VIDEOS SERVICE ───────────────────────────────────────────────
export const carouselVideosService = {
    async getAll(): Promise<CarouselVideo[]> {
        const snap = await getDocs(
            query(collection(db, "carouselVideos"), orderBy("sortOrder", "asc"))
        );
        return snap.docs.map((d) => ({ id: d.id, ...convertTimestamps(d.data()) } as CarouselVideo));
    },

    async getActive(): Promise<CarouselVideo[]> {
        const snap = await getDocs(
            query(
                collection(db, "carouselVideos"),
                where("isActive", "==", true)
            )
        );
        const videos = snap.docs.map((d) => ({ id: d.id, ...convertTimestamps(d.data()) } as CarouselVideo));
        return videos.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    },

    async create(video: Omit<CarouselVideo, "id" | "createdAt">): Promise<string> {
        const ref = await addDoc(collection(db, "carouselVideos"), {
            ...video,
            createdAt: serverTimestamp(),
        });
        return ref.id;
    },

    async update(id: string, data: Partial<CarouselVideo>): Promise<void> {
        await updateDoc(doc(db, "carouselVideos", id), data);
    },

    async delete(id: string): Promise<void> {
        await deleteDoc(doc(db, "carouselVideos", id));
    },
};

// ─── CONTACT MESSAGES SERVICE ──────────────────────────────────────────────
export const contactMessagesService = {
    async getAll(): Promise<ContactMessage[]> {
        const snap = await getDocs(
            query(collection(db, "contactMessages"), orderBy("createdAt", "desc"))
        );
        return snap.docs.map((d) => ({ id: d.id, ...convertTimestamps(d.data()) } as ContactMessage));
    },

    async create(message: Omit<ContactMessage, "id" | "createdAt" | "isRead">): Promise<string> {
        const ref = await addDoc(collection(db, "contactMessages"), {
            ...message,
            isRead: false,
            createdAt: serverTimestamp(),
        });
        return ref.id;
    },

    async markAsRead(id: string): Promise<void> {
        await updateDoc(doc(db, "contactMessages", id), { isRead: true });
    },

    async markAsUnread(id: string): Promise<void> {
        await updateDoc(doc(db, "contactMessages", id), { isRead: false });
    },

    async delete(id: string): Promise<void> {
        await deleteDoc(doc(db, "contactMessages", id));
    },

    async getUnreadCount(): Promise<number> {
        const snap = await getDocs(
            query(collection(db, "contactMessages"), where("isRead", "==", false))
        );
        return snap.size;
    },
};

// ─── PAYMENTS SERVICE ──────────────────────────────────────────────────────
export const paymentsService = {
    async getAll(): Promise<Payment[]> {
        const snap = await getDocs(
            query(collection(db, "payments"), orderBy("created", "desc"))
        );
        return snap.docs.map((d) => ({ id: d.id, ...convertTimestamps(d.data()) } as Payment));
    },

    async getByInvoice(invoiceId: string): Promise<Payment[]> {
        const snap = await getDocs(
            query(
                collection(db, "payments"),
                where("invoiceId", "==", invoiceId),
                orderBy("created", "desc")
            )
        );
        return snap.docs.map((d) => ({ id: d.id, ...convertTimestamps(d.data()) } as Payment));
    },
};

// ─── STORAGE SERVICE ───────────────────────────────────────────────────────
export const storageService = {
    async uploadFile(file: File, path: string): Promise<string> {
        const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        return new Promise((resolve, reject) => {
            uploadTask.on('state_changed',
                (snapshot) => {
                    // Observe state change events such as progress, pause, and resume
                    // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    console.log('Upload is ' + progress + '% done');
                },
                (error) => {
                    // Handle unsuccessful uploads
                    reject(error);
                },
                () => {
                    // Handle successful uploads on complete
                    // For instance, get the download URL: https://firebasestorage.googleapis.com/...
                    getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                        resolve(downloadURL);
                    });
                }
            );
        });
    }
};

// ─── SEED DATA ─────────────────────────────────────────────────────────────
// Utility to seed Firestore with mock data for initial setup
export async function seedFirestore(): Promise<void> {
    const { services, addOns, portfolioItems, testimonials, mockClients, mockBookings, mockInvoices, mockProjects } = await import("@/data/mockData");

    console.log("Seeding Firestore...");

    // 1. Seed Admin User if missing (for demo purposes)
    const adminEmail = "admin@gmail.com";
    const usersSnap = await getDocs(query(collection(db, "users"), where("email", "==", adminEmail), limit(1)));
    if (usersSnap.empty) {
        console.log("Creating default admin user document...");
        // This is just the document; the user must still exist in Firebase Auth
        // For development, we assume if they can log in, this document will link by UID or we create it here
        // Note: In a real app, you'd create the Auth user first. Here we just ensure the role exists if uid matches.
        // We'll use a fixed ID for the demo admin if possible, or just let them register.
        // Better: just seed the 'users' document for the known admin UID if we had it.
        // Since we don't have the UID yet, we'll let them register then manually change role, 
        // OR we seed a user with a specific ID that the app expects.
    }

    // Function to seed a collection if empty
    const seedIfEmpty = async (collName: string, dataArray: any[]) => {
        const snap = await getDocs(query(collection(db, collName), limit(1)));
        if (snap.empty) {
            console.log(`Seeding ${collName}...`);
            for (const item of dataArray) {
                const { id, ...data } = item;
                // Handle Dates vs Timestamps
                const processedData = { ...data };
                if (processedData.date && processedData.date instanceof Date) {
                    processedData.date = Timestamp.fromDate(processedData.date);
                }
                if (processedData.createdAt && processedData.createdAt instanceof Date) {
                    processedData.createdAt = Timestamp.fromDate(processedData.createdAt);
                }
                if (processedData.dateTime?.start && processedData.dateTime.start instanceof Date) {
                    processedData.dateTime.start = Timestamp.fromDate(processedData.dateTime.start);
                }
                if (processedData.dateTime?.end && processedData.dateTime.end instanceof Date) {
                    processedData.dateTime.end = Timestamp.fromDate(processedData.dateTime.end);
                }
                if (processedData.dueDate && processedData.dueDate instanceof Date) {
                    processedData.dueDate = Timestamp.fromDate(processedData.dueDate);
                }

                if (id) {
                    await setDoc(doc(db, collName, id), processedData);
                } else {
                    await addDoc(collection(db, collName), processedData);
                }
            }
            return true;
        }
        return false;
    };

    await seedIfEmpty("services", services);
    await seedIfEmpty("addons", addOns);
    await seedIfEmpty("portfolio", portfolioItems);
    await seedIfEmpty("testimonials", testimonials);
    await seedIfEmpty("clients", mockClients);
    await seedIfEmpty("bookings", mockBookings);
    await seedIfEmpty("invoices", mockInvoices);
    await seedIfEmpty("projects", mockProjects);

    console.log("Firestore seeding check complete!");
}
