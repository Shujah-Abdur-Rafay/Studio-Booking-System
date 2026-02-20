import { useState, useMemo, useEffect } from 'react';
import {
    Calendar, Shield, Plus, Database, Edit, BarChart3, Users,
    Star, Trash2, Check,
    X, Video, Image as ImageIcon, Package, Mail, MailOpen,
    Play, TrendingUp, AlertCircle, Loader2, CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth, useAdmin } from '@/hooks/useStore';
import { storageService } from '@/lib/firebaseService';
import { formatPrice, formatDate } from '@/data/mockData';
import type {
    Service, AddOn, PortfolioItem, Testimonial, Booking, Client, CarouselVideo, ContactMessage,

} from '@/types';
import { ProjectsTab, InvoicesTab } from '@/components/AdminProjectTabs';
import { TransactionsTab } from '@/components/AdminTransactionsTab';

type View = 'home' | 'portfolio' | 'services' | 'booking' | 'about' | 'contact' | 'portal' | 'admin' | 'login';

// ─── Modal Shell ──────────────────────────────────────────────
function Modal({ open, onClose, title, children }: {
    open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card z-10">
                    <h2 className="text-xl font-bold">{title}</h2>
                    <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
}

export function AdminDashboard({ setView }: { setView: (v: View) => void }) {
    const { user } = useAuth();
    const {
        services, addOns, clients, allBookings, allInvoices, allProjects, allPayments,
        testimonials, portfolioItems, portfolioCategories, carouselVideos, contactMessages,
        updateBookingStatus, adminCreateService, adminUpdateService, adminDeleteService,
        adminCreateAddOn, adminUpdateAddOn, adminDeleteAddOn,
        adminCreatePortfolioItem, adminUpdatePortfolioItem, adminDeletePortfolioItem,
        adminSetPortfolioCategories, adminDeletePortfolioCategory,
        adminCreateCarouselVideo, adminUpdateCarouselVideo, adminDeleteCarouselVideo,
        adminMarkMessageRead, adminMarkMessageUnread, adminDeleteMessage, loadAdminData,
        adminUpdateTestimonial, adminDeleteTestimonial,
        adminCreateProject, adminUpdateProject, adminDeleteProject, adminCreateInvoice, adminUpdateInvoice
    } = useAdmin();

    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        if (user?.role === 'admin') {
            loadAdminData();
        }
    }, [user, loadAdminData]);

    // ── Live Metrics computed from real data ──
    const metrics = useMemo(() => {
        const validBookings = allBookings.filter(b => b.status !== 'cancelled');
        const totalRevenue = validBookings.reduce((sum, b) => sum + (b.pricing?.total || 0), 0);
        const totalBookings = allBookings.length;
        const pendingInvoices = allInvoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled').length;
        const activeProjects = allProjects.filter(p => p.status !== 'delivered' && p.status !== 'closed').length;
        const avgOrderValue = validBookings.length > 0 ? Math.round(totalRevenue / validBookings.length) : 0;
        const unreadMessages = contactMessages.filter(m => !m.isRead).length;
        return { totalRevenue, totalBookings, pendingInvoices, activeProjects, avgOrderValue, unreadMessages };
    }, [allBookings, allInvoices, allProjects, contactMessages]);

    if (!user || user.role !== 'admin') {
        return (
            <div className="min-h-screen pt-20 pb-20 px-4 flex items-center justify-center">
                <div className="text-center">
                    <Shield className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <h2 className="text-2xl font-bold mb-2">Admin Access Required</h2>
                    <p className="text-muted-foreground mb-4">Please log in with an admin account</p>
                    <Button onClick={() => setView('login')}>Sign In</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-20 pb-20 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                        <p className="text-muted-foreground">Manage your business</p>
                    </div>
                    <div className="flex gap-2">

                        <Button variant="outline" onClick={() => loadAdminData()}>
                            <TrendingUp className="w-4 h-4 mr-2" />Refresh
                        </Button>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="mb-6 flex-wrap">
                        <TabsTrigger value="overview"><BarChart3 className="w-4 h-4 mr-1" />Overview</TabsTrigger>
                        <TabsTrigger value="bookings"><Calendar className="w-4 h-4 mr-1" />Bookings</TabsTrigger>
                        <TabsTrigger value="clients" className="flex items-center gap-2 data-[state=active]:bg-[#cbb26a] data-[state=active]:text-white"><Users className="w-4 h-4" />Clients</TabsTrigger>
                        <TabsTrigger value="projects" className="flex items-center gap-2 data-[state=active]:bg-[#cbb26a] data-[state=active]:text-white"><Package className="w-4 h-4" />Projects</TabsTrigger>
                        <TabsTrigger value="invoices" className="flex items-center gap-2 data-[state=active]:bg-[#cbb26a] data-[state=active]:text-white"><Database className="w-4 h-4" />Invoices</TabsTrigger>
                        <TabsTrigger value="transactions" className="flex items-center gap-2 data-[state=active]:bg-[#cbb26a] data-[state=active]:text-white"><CreditCard className="w-4 h-4" />Transactions</TabsTrigger>
                        <TabsTrigger value="testimonials" className="flex items-center gap-2 data-[state=active]:bg-[#cbb26a] data-[state=active]:text-white"><Star className="w-4 h-4" />Tesimonials</TabsTrigger>
                        <TabsTrigger value="carousel"><Play className="w-4 h-4 mr-1" />Carousel</TabsTrigger>
                        <TabsTrigger value="portfolio"><ImageIcon className="w-4 h-4 mr-1" />Portfolio</TabsTrigger>
                        <TabsTrigger value="packages"><Package className="w-4 h-4 mr-1" />Packages</TabsTrigger>
                        <TabsTrigger value="messages">
                            <Mail className="w-4 h-4 mr-1" />Messages
                            {metrics.unreadMessages > 0 && (
                                <span className="ml-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                    {metrics.unreadMessages}
                                </span>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    {/* ═══════ OVERVIEW TAB ═══════ */}
                    <TabsContent value="overview" className="space-y-6">
                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card><CardHeader className="pb-2"><CardDescription>Total Revenue</CardDescription><CardTitle className="text-2xl text-[#8f5e25]">{formatPrice(metrics.totalRevenue)}</CardTitle></CardHeader></Card>
                            <Card><CardHeader className="pb-2"><CardDescription>Total Bookings</CardDescription><CardTitle className="text-2xl text-[#8f5e25]">{metrics.totalBookings}</CardTitle></CardHeader></Card>
                            <Card><CardHeader className="pb-2"><CardDescription>Pending Invoices</CardDescription><CardTitle className="text-2xl text-[#8f5e25]">{metrics.pendingInvoices}</CardTitle></CardHeader></Card>
                            <Card><CardHeader className="pb-2"><CardDescription>Active Projects</CardDescription><CardTitle className="text-2xl text-[#8f5e25]">{metrics.activeProjects}</CardTitle></CardHeader></Card>
                        </div>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card><CardHeader className="pb-2"><CardDescription>Avg Order Value</CardDescription><CardTitle className="text-2xl text-[#8f5e25]">{formatPrice(metrics.avgOrderValue)}</CardTitle></CardHeader></Card>
                            <Card><CardHeader className="pb-2"><CardDescription>Portfolio Items</CardDescription><CardTitle className="text-2xl text-[#8f5e25]">{portfolioItems.length}</CardTitle></CardHeader></Card>
                            <Card><CardHeader className="pb-2"><CardDescription>Carousel Videos</CardDescription><CardTitle className="text-2xl text-[#8f5e25]">{carouselVideos.length}</CardTitle></CardHeader></Card>
                            <Card><CardHeader className="pb-2"><CardDescription>Unread Messages</CardDescription><CardTitle className="text-2xl text-[#8f5e25]">{metrics.unreadMessages}</CardTitle></CardHeader></Card>
                        </div>
                        <div className="grid lg:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader><CardTitle>Recent Bookings</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {allBookings.slice(0, 5).map((b: Booking) => (
                                            <div key={b.id} className="flex items-center justify-between">
                                                <div><p className="font-medium">{b.clientName}</p><p className="text-sm text-muted-foreground">{b.serviceName}</p></div>
                                                <Badge variant={b.status === 'confirmed' ? 'default' : 'secondary'}>{b.status}</Badge>
                                            </div>
                                        ))}
                                        {allBookings.length === 0 && <p className="text-muted-foreground text-center py-4">No bookings yet</p>}
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle>Recent Messages</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {contactMessages.slice(0, 5).map((m: ContactMessage) => (
                                            <div key={m.id} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    {!m.isRead && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                                                    <div><p className="font-medium">{m.name}</p><p className="text-sm text-muted-foreground truncate max-w-[200px]">{m.subject}</p></div>
                                                </div>
                                                <span className="text-xs text-muted-foreground">{m.createdAt instanceof Date ? m.createdAt.toLocaleDateString() : ''}</span>
                                            </div>
                                        ))}
                                        {contactMessages.length === 0 && <p className="text-muted-foreground text-center py-4">No messages yet</p>}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* ═══════ TESTIMONIALS TAB ═══════ */}
                    <TabsContent value="testimonials">
                        <TestimonialsTab testimonials={testimonials} onUpdate={adminUpdateTestimonial} onDelete={adminDeleteTestimonial} />
                    </TabsContent>

                    {/* ═══════ PROJECTS TAB ═══════ */}
                    <TabsContent value="projects">
                        <ProjectsTab projects={allProjects} clients={clients} onCreate={adminCreateProject} onUpdate={adminUpdateProject} onDelete={adminDeleteProject} />
                    </TabsContent>

                    {/* ═══════ INVOICES TAB ═══════ */}
                    <TabsContent value="invoices">
                        <InvoicesTab invoices={allInvoices} clients={clients} onCreate={adminCreateInvoice} onUpdate={adminUpdateInvoice} />
                    </TabsContent>

                    {/* ═══════ TRANSACTIONS TAB ═══════ */}
                    <TabsContent value="transactions">
                        <TransactionsTab payments={allPayments || []} clients={clients} />
                    </TabsContent>

                    {/* ═══════ CAROUSEL VIDEOS TAB ═══════ */}
                    <TabsContent value="carousel"><CarouselTab videos={carouselVideos} onCreate={adminCreateCarouselVideo} onUpdate={adminUpdateCarouselVideo} onDelete={adminDeleteCarouselVideo} /></TabsContent>

                    {/* ═══════ PORTFOLIO TAB ═══════ */}
                    <TabsContent value="portfolio"><PortfolioTab items={portfolioItems} categories={portfolioCategories} onCreate={adminCreatePortfolioItem} onUpdate={adminUpdatePortfolioItem} onDelete={adminDeletePortfolioItem} onSetCategories={adminSetPortfolioCategories} onDeleteCategory={adminDeletePortfolioCategory} /></TabsContent>

                    {/* ═══════ PACKAGES TAB ═══════ */}
                    <TabsContent value="packages"><PackagesTab services={services} addOns={addOns} onCreateService={adminCreateService} onUpdateService={adminUpdateService} onDeleteService={adminDeleteService} onCreateAddOn={adminCreateAddOn} onUpdateAddOn={adminUpdateAddOn} onDeleteAddOn={adminDeleteAddOn} /></TabsContent>

                    {/* ═══════ MESSAGES TAB ═══════ */}
                    <TabsContent value="messages"><MessagesTab messages={contactMessages} onMarkRead={adminMarkMessageRead} onMarkUnread={adminMarkMessageUnread} onDelete={adminDeleteMessage} /></TabsContent>

                    {/* ═══════ BOOKINGS TAB ═══════ */}
                    <TabsContent value="bookings">
                        <Card>
                            <CardHeader><CardTitle>All Bookings ({allBookings.length})</CardTitle></CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b">
                                    <th className="text-left py-3 px-4">Client</th><th className="text-left py-3 px-4">Service</th><th className="text-left py-3 px-4">Date</th><th className="text-left py-3 px-4">Amount</th><th className="text-left py-3 px-4">Status</th><th className="text-left py-3 px-4">Actions</th>
                                </tr></thead><tbody>
                                        {allBookings.map((b: Booking) => (
                                            <tr key={b.id} className="border-b"><td className="py-3 px-4">{b.clientName}</td><td className="py-3 px-4">{b.serviceName}</td><td className="py-3 px-4">{b.dateTime?.start instanceof Date ? formatDate(b.dateTime.start) : '—'}</td><td className="py-3 px-4">{formatPrice(b.pricing?.total || 0)}</td>
                                                <td className="py-3 px-4"><Badge variant={b.status === 'confirmed' ? 'default' : 'secondary'}>{b.status}</Badge></td>
                                                <td className="py-3 px-4">
                                                    <select
                                                        className="text-sm border rounded px-2 py-1 bg-background"
                                                        value={b.status}
                                                        onChange={e => updateBookingStatus(b.id, e.target.value)}
                                                    >
                                                        <option value="pending">Pending Approval</option>
                                                        <option value="pending_payment">Pending Payment</option>
                                                        <option value="confirmed">Confirmed</option>
                                                        <option value="completed">Completed</option>
                                                        <option value="cancelled">Cancelled</option>
                                                    </select>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody></table></div>
                                {allBookings.length === 0 && <p className="text-center py-8 text-muted-foreground">No bookings found</p>}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ═══════ CLIENTS TAB ═══════ */}
                    <TabsContent value="clients">
                        <Card>
                            <CardHeader><CardTitle>All Clients ({clients.length})</CardTitle></CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {clients.map((c: Client) => {
                                        const displayName = c.name || `Client #${c.id.split('-')[1] || c.id.slice(-4)}`;
                                        const initials = c.name
                                            ? c.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
                                            : c.id.charAt(c.id.length - 1).toUpperCase();

                                        return (
                                            <div key={c.id} className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
                                                <div className="flex items-center gap-4">
                                                    <Avatar><AvatarFallback>{initials}</AvatarFallback></Avatar>
                                                    <div>
                                                        <p className="font-medium">{displayName}</p>
                                                        <p className="text-sm text-muted-foreground">{c.email || 'No email'} • {c.totalBookings} bookings • {formatPrice(c.totalRevenue)} lifetime</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {c.tags.map((tag: string) => (<Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {clients.length === 0 && <p className="text-center py-8 text-muted-foreground">No clients found</p>}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// ██ CAROUSEL VIDEOS TAB
// ═══════════════════════════════════════════════════════════════
function CarouselTab({ videos, onCreate, onUpdate, onDelete }: {
    videos: CarouselVideo[];
    onCreate: (v: Omit<CarouselVideo, 'id' | 'createdAt'>) => Promise<void>;
    onUpdate: (id: string, data: Partial<CarouselVideo>) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}) {
    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState<CarouselVideo | null>(null);
    const [form, setForm] = useState({ title: '', url: '', sortOrder: 0, isActive: true });
    const [uploading, setUploading] = useState(false);

    const openCreate = () => { setForm({ title: '', url: '', sortOrder: videos.length, isActive: true }); setEditItem(null); setShowForm(true); };
    const openEdit = (v: CarouselVideo) => { setForm({ title: v.title, url: v.url, sortOrder: v.sortOrder, isActive: v.isActive }); setEditItem(v); setShowForm(true); };

    const handleSave = async () => {
        if (!form.title) { alert('Title is required'); return; }
        if (!form.url) { alert('Video URL is required'); return; }
        if (editItem) { await onUpdate(editItem.id, form); }
        else { await onCreate(form); }
        setShowForm(false);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Carousel Videos ({videos.length})</CardTitle>
                    <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Add Video</Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {videos.map(v => (
                        <div key={v.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:shadow-sm transition-shadow">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-[#cbb26a]/20 rounded-lg flex items-center justify-center"><Play className="w-6 h-6 text-[#8f5e25]" /></div>
                                <div>
                                    <p className="font-medium">{v.title}</p>
                                    <p className="text-xs text-muted-foreground truncate max-w-[300px]">{v.url}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant={v.isActive ? 'default' : 'secondary'}>{v.isActive ? 'Active' : 'Inactive'}</Badge>
                                <span className="text-xs text-muted-foreground">Order: {v.sortOrder}</span>
                                <Button variant="ghost" size="icon" onClick={() => openEdit(v)}><Edit className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => onDelete(v.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                            </div>
                        </div>
                    ))}
                    {videos.length === 0 && <p className="text-center py-8 text-muted-foreground">No carousel videos. Add some to display on the homepage.</p>}
                </div>
            </CardContent>

            <Modal open={showForm} onClose={() => setShowForm(false)} title={editItem ? 'Edit Carousel Video' : 'Add Carousel Video'}>
                <div className="space-y-4">
                    <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Video title" /></div>

                    <div className="space-y-2">
                        <Label>Upload Video</Label>
                        <div className="flex gap-2 items-center">
                            <Input
                                type="file"
                                accept="video/*"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    setUploading(true);
                                    try {
                                        const url = await storageService.uploadFile(file, 'carousel-videos');
                                        setForm(prev => ({ ...prev, url }));
                                    } catch (err) {
                                        console.error(err);
                                        alert('Upload failed');
                                    } finally {
                                        setUploading(false);
                                    }
                                }}
                                disabled={uploading}
                            />
                            {uploading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                        </div>
                    </div>

                    <div><Label>Video URL</Label><Input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://..." /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><Label>Sort Order</Label><Input type="number" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })} /></div>
                        <div className="flex items-center gap-2 pt-6">
                            <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4" />
                            <Label>Active</Label>
                        </div>
                    </div>
                    <Button className="w-full btn-gold text-white" onClick={handleSave}>{editItem ? 'Update Video' : 'Add Video'}</Button>
                </div>
            </Modal>
        </Card>
    );
}

// ═══════════════════════════════════════════════════════════════
// ██ PORTFOLIO TAB
// ═══════════════════════════════════════════════════════════════
function PortfolioTab({ items, categories, onCreate, onUpdate, onDelete, onSetCategories, onDeleteCategory }: {
    items: PortfolioItem[];
    categories: string[];
    onCreate: (item: Omit<PortfolioItem, 'id'>) => Promise<void>;
    onUpdate: (id: string, data: Partial<PortfolioItem>) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onSetCategories: (categories: string[]) => Promise<void>;
    onDeleteCategory: (category: string) => Promise<void>;
}) {
    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState<PortfolioItem | null>(null);
    const [activeTab, setActiveTab] = useState<'items' | 'categories'>('items');
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isAddingCategory, setIsAddingCategory] = useState(false);

    const emptyForm = { title: '', category: categories[0] || 'real-estate', image: '', videoUrl: '', thumbnail: '', description: '', client: '', featured: false };
    const [form, setForm] = useState(emptyForm);
    const [uploading, setUploading] = useState(false);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'image' | 'videoUrl' | 'thumbnail', path: string) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const url = await storageService.uploadFile(file, path);
            setForm(prev => ({ ...prev, [field]: url }));
        } catch (err) {
            console.error(err);
            alert('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const openCreate = () => { setForm({ ...emptyForm, category: categories[0] || '' }); setEditItem(null); setShowForm(true); };
    const openEdit = (item: PortfolioItem) => {
        setForm({ title: item.title, category: item.category, image: item.image, videoUrl: item.videoUrl || '', thumbnail: item.thumbnail, description: item.description, client: item.client || '', featured: item.featured });
        setEditItem(item); setShowForm(true);
    };

    const handleSave = async () => {
        if (!form.title) { alert('Title is required'); return; }
        if (!form.image && !form.videoUrl) { alert('Image or Video URL is required'); return; }
        const data = { ...form, date: new Date() };
        if (editItem) { await onUpdate(editItem.id, data); }
        else { await onCreate(data); }
        setShowForm(false);
    };

    const handleAddCategory = async () => {
        const trimmed = newCategoryName.trim().toLowerCase().replace(/\s+/g, '-');
        if (!trimmed) return;
        if (categories.includes(trimmed)) { alert('Category already exists'); return; }
        setIsAddingCategory(true);
        try {
            await onSetCategories([...categories, trimmed]);
            setNewCategoryName('');
        } finally {
            setIsAddingCategory(false);
        }
    };

    const handleDeleteCategory = async (cat: string) => {
        const itemsInCategory = items.filter(i => i.category === cat);
        if (itemsInCategory.length > 0) {
            const confirmed = window.confirm(
                `"${cat}" has ${itemsInCategory.length} item(s). Deleting the category won't delete the items — they'll just have no matching filter tab. Continue?`
            );
            if (!confirmed) return;
        }
        await onDeleteCategory(cat);
    };

    // Format category label nicely
    const formatLabel = (cat: string) => cat.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Portfolio ({items.length} items)</CardTitle>
                    <div className="flex gap-2">
                        <Button
                            variant={activeTab === 'items' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setActiveTab('items')}
                        >Items</Button>
                        <Button
                            variant={activeTab === 'categories' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setActiveTab('categories')}
                        >Categories ({categories.length})</Button>
                        {activeTab === 'items' && <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Add Item</Button>}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {activeTab === 'items' && (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {items.map(item => (
                            <div key={item.id} className="border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                                <div className="relative h-40 bg-black/5">
                                    {item.videoUrl ? (
                                        <video
                                            src={item.videoUrl}
                                            poster={item.thumbnail || item.image}
                                            className="w-full h-full object-cover"
                                            muted
                                            playsInline
                                            loop
                                            onMouseOver={e => e.currentTarget.play()}
                                            onMouseOut={e => { e.currentTarget.pause(); }}
                                        />
                                    ) : (
                                        <img src={item.thumbnail || item.image} alt={item.title} className="w-full h-full object-cover" />
                                    )}
                                    {item.featured && <Badge className="absolute top-2 left-2 bg-[#cbb26a]">Featured</Badge>}
                                    {item.videoUrl && <Badge className="absolute top-2 right-2" variant="secondary"><Video className="w-3 h-3 mr-1" />Video</Badge>}
                                </div>
                                <div className="p-3">
                                    <p className="font-medium truncate">{item.title}</p>
                                    <p className="text-xs text-muted-foreground">{item.category} {item.client ? `• ${item.client}` : ''}</p>
                                    <div className="flex gap-1 mt-2">
                                        <Button variant="ghost" size="sm" onClick={() => openEdit(item)}><Edit className="w-3 h-3 mr-1" />Edit</Button>
                                        <Button variant="ghost" size="sm" onClick={() => onDelete(item.id)}><Trash2 className="w-3 h-3 mr-1 text-red-500" />Delete</Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {items.length === 0 && <p className="text-center py-8 text-muted-foreground col-span-3">No portfolio items found</p>}
                    </div>
                )}

                {activeTab === 'categories' && (
                    <div className="space-y-6">
                        {/* Add new category */}
                        <div className="p-4 border border-[#cbb26a]/30 rounded-lg bg-[#cbb26a]/5">
                            <p className="text-sm font-semibold mb-3 text-[#8f5e25]">Add New Category</p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    className="flex-1 border border-border rounded-md px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#cbb26a]/50"
                                    placeholder="e.g. drone, portrait, architecture"
                                    value={newCategoryName}
                                    onChange={e => setNewCategoryName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                                />
                                <Button
                                    onClick={handleAddCategory}
                                    disabled={isAddingCategory || !newCategoryName.trim()}
                                    className="btn-gold text-white"
                                >
                                    {isAddingCategory ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                    Add
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">Spaces will be converted to hyphens (e.g. "real estate" → "real-estate")</p>
                        </div>

                        {/* Existing categories list */}
                        <div className="space-y-2">
                            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Existing Categories</p>
                            {categories.length === 0 && (
                                <p className="text-center py-8 text-muted-foreground">No categories yet.</p>
                            )}
                            {categories.map(cat => {
                                const count = items.filter(i => i.category === cat).length;
                                const hasMedia = count > 0;
                                return (
                                    <div
                                        key={cat}
                                        className="flex items-center justify-between p-3 border border-border rounded-lg hover:shadow-sm transition-shadow"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${hasMedia ? 'bg-green-500' : 'bg-gray-300'}`} />
                                            <div>
                                                <p className="font-medium text-sm">{formatLabel(cat)}</p>
                                                <p className="text-xs text-muted-foreground font-mono">{cat}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Badge variant={hasMedia ? 'default' : 'secondary'} className="text-xs">
                                                {count} item{count !== 1 ? 's' : ''}
                                            </Badge>
                                            {!hasMedia && (
                                                <span className="text-xs text-amber-600 font-medium">Hidden on site</span>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDeleteCategory(cat)}
                                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-xs text-muted-foreground italic">
                            ⚠ Categories with 0 items are automatically hidden in the public portfolio filter tabs.
                        </p>
                    </div>
                )}
            </CardContent>

            <Modal open={showForm} onClose={() => setShowForm(false)} title={editItem ? 'Edit Portfolio Item' : 'Add Portfolio Item'}>
                <div className="space-y-4">
                    <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Item title" /></div>
                    <div><Label>Category</Label>
                        <select className="w-full border rounded-md px-3 py-2 bg-background" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                            {categories.map(c => <option key={c} value={c}>{formatLabel(c)}</option>)}
                        </select>
                    </div>
                    <div><Label>Image (Main)</Label>
                        <div className="flex gap-2 items-center mb-2">
                            <Input type="file" accept="image/*" onChange={(e) => handleUpload(e, 'image', 'portfolio/images')} disabled={uploading} />
                            {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                        </div>
                        <Input value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} placeholder="https://..." />
                    </div>

                    <div><Label>Thumbnail (Optional)</Label>
                        <div className="flex gap-2 items-center mb-2">
                            <Input type="file" accept="image/*" onChange={(e) => handleUpload(e, 'thumbnail', 'portfolio/thumbnails')} disabled={uploading} />
                        </div>
                        <Input value={form.thumbnail} onChange={e => setForm({ ...form, thumbnail: e.target.value })} placeholder="https://..." />
                    </div>

                    <div><Label>Video (Optional)</Label>
                        <div className="flex gap-2 items-center mb-2">
                            <Input type="file" accept="video/*" onChange={(e) => handleUpload(e, 'videoUrl', 'portfolio/videos')} disabled={uploading} />
                        </div>
                        <Input value={form.videoUrl} onChange={e => setForm({ ...form, videoUrl: e.target.value })} placeholder="https://..." />
                        {form.videoUrl && (
                            <div className="mt-2 rounded-lg overflow-hidden border border-border bg-black/5">
                                <video src={form.videoUrl} controls className="w-full max-h-60" />
                            </div>
                        )}
                    </div>
                    <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} /></div>
                    <div><Label>Client</Label><Input value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} placeholder="Client name" /></div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" checked={form.featured} onChange={e => setForm({ ...form, featured: e.target.checked })} className="w-4 h-4" />
                        <Label>Featured</Label>
                    </div>
                    <Button className="w-full btn-gold text-white" onClick={handleSave}>{editItem ? 'Update Item' : 'Add Item'}</Button>
                </div>
            </Modal>
        </Card>
    );
}

// ═══════════════════════════════════════════════════════════════
// ██ PACKAGES & ADD-ONS TAB
// ═══════════════════════════════════════════════════════════════
function PackagesTab({ services, addOns, onCreateService, onUpdateService, onDeleteService, onCreateAddOn, onUpdateAddOn, onDeleteAddOn }: {
    services: Service[]; addOns: AddOn[];
    onCreateService: (s: Omit<Service, 'id'>) => Promise<void>;
    onUpdateService: (id: string, d: Partial<Service>) => Promise<void>;
    onDeleteService: (id: string) => Promise<void>;
    onCreateAddOn: (a: Omit<AddOn, 'id'>) => Promise<void>;
    onUpdateAddOn: (id: string, d: Partial<AddOn>) => Promise<void>;
    onDeleteAddOn: (id: string) => Promise<void>;
}) {
    const sqftTiers = [
        { key: '0-2000', label: '0–2,000 sqft' },
        { key: '2001-3000', label: '2,001–3,000 sqft' },
        { key: '3001-4000', label: '3,001–4,000 sqft' },
        { key: '4001-5000', label: '4,001–5,000 sqft' },
        { key: '5001+', label: '5,001+ sqft' }
    ];
    const [subTab, setSubTab] = useState<'services' | 'addons'>('services');
    const [showServiceForm, setShowServiceForm] = useState(false);
    const [editService, setEditService] = useState<Service | null>(null);
    const emptyServiceForm = { name: '', slug: '', category: 'photo' as Service['category'], description: '', duration: 60, basePrice: 0, depositRequired: 50, deliverables: [] as string[], addons: [] as string[], bufferTime: 30, minNotice: 24, maxAdvance: 90, isActive: true, image: '', sortOrder: 0, pricingTiers: {} as Record<string, number> };
    const [serviceForm, setServiceForm] = useState(emptyServiceForm);
    const [deliverablesText, setDeliverablesText] = useState('');
    const [uploading, setUploading] = useState(false);

    const handleServiceImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const url = await storageService.uploadFile(file, 'services/images');
            setServiceForm(prev => ({ ...prev, image: url }));
        } catch (err) {
            console.error(err);
            alert('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const [showAddonForm, setShowAddonForm] = useState(false);
    const [editAddon, setEditAddon] = useState<AddOn | null>(null);
    const emptyAddonForm = { name: '', description: '', price: 0, priceType: 'fixed' as AddOn['priceType'], applicableServices: [] as string[], isActive: true };
    const [addonForm, setAddonForm] = useState(emptyAddonForm);

    const openCreateService = () => { setServiceForm(emptyServiceForm); setDeliverablesText(''); setEditService(null); setShowServiceForm(true); };
    const openEditService = (s: Service) => {
        setServiceForm({ name: s.name, slug: s.slug, category: s.category, description: s.description, duration: s.duration, basePrice: s.basePrice, depositRequired: s.depositRequired, deliverables: s.deliverables, addons: s.addons, bufferTime: s.bufferTime, minNotice: s.minNotice, maxAdvance: s.maxAdvance, isActive: s.isActive, image: s.image || '', sortOrder: s.sortOrder, pricingTiers: s.pricingTiers || {} });
        setDeliverablesText(s.deliverables.join('\n'));
        setEditService(s); setShowServiceForm(true);
    };
    const handleSaveService = async () => {
        if (!serviceForm.name) { alert('Name is required'); return; }
        const data = { ...serviceForm, deliverables: deliverablesText.split('\n').filter(Boolean) };
        if (editService) await onUpdateService(editService.id, data);
        else await onCreateService(data);
        setShowServiceForm(false);
    };

    const openCreateAddon = () => { setAddonForm(emptyAddonForm); setEditAddon(null); setShowAddonForm(true); };
    const openEditAddon = (a: AddOn) => {
        setAddonForm({ name: a.name, description: a.description, price: a.price, priceType: a.priceType, applicableServices: a.applicableServices, isActive: a.isActive });
        setEditAddon(a); setShowAddonForm(true);
    };
    const handleSaveAddon = async () => {
        if (!addonForm.name) { alert('Name is required'); return; }
        if (editAddon) await onUpdateAddOn(editAddon.id, addonForm);
        else await onCreateAddOn(addonForm);
        setShowAddonForm(false);
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <Button variant={subTab === 'services' ? 'default' : 'outline'} onClick={() => setSubTab('services')}>Packages ({services.length})</Button>
                <Button variant={subTab === 'addons' ? 'default' : 'outline'} onClick={() => setSubTab('addons')}>Add-Ons ({addOns.length})</Button>
            </div>

            {subTab === 'services' && (
                <Card>
                    <CardHeader><div className="flex items-center justify-between"><CardTitle>Packages / Services</CardTitle><Button onClick={openCreateService}><Plus className="w-4 h-4 mr-2" />Add Package</Button></div></CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {services.map(s => (
                                <div key={s.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:shadow-sm transition-shadow">
                                    <div className="flex items-center gap-4">
                                        {s.image && <img src={s.image} alt={s.name} className="w-16 h-12 object-cover rounded" />}
                                        <div>
                                            <p className="font-medium">{s.name}</p>
                                            <p className="text-sm text-muted-foreground">{s.category} • {s.duration}min • {formatPrice(s.basePrice)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={s.isActive ? 'default' : 'secondary'}>{s.isActive ? 'Active' : 'Inactive'}</Badge>
                                        <Button variant="ghost" size="icon" onClick={() => openEditService(s)}><Edit className="w-4 h-4" /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => onDeleteService(s.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                                    </div>
                                </div>
                            ))}
                            {services.length === 0 && <p className="text-center py-8 text-muted-foreground">No packages found</p>}
                        </div>
                    </CardContent>
                    <Modal open={showServiceForm} onClose={() => setShowServiceForm(false)} title={editService ? 'Edit Package' : 'Add Package'}>
                        <div className="space-y-4">
                            <div><Label>Name *</Label><Input value={serviceForm.name} onChange={e => setServiceForm({ ...serviceForm, name: e.target.value })} /></div>
                            <div><Label>Slug</Label><Input value={serviceForm.slug} onChange={e => setServiceForm({ ...serviceForm, slug: e.target.value })} /></div>
                            <div><Label>Category</Label>
                                <select className="w-full border rounded-md px-3 py-2 bg-background" value={serviceForm.category} onChange={e => setServiceForm({ ...serviceForm, category: e.target.value as Service['category'] })}>
                                    {['photo', 'video', 'drone', 'mixed', 'real-estate'].map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div><Label>Description</Label><Textarea value={serviceForm.description} onChange={e => setServiceForm({ ...serviceForm, description: e.target.value })} rows={3} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label>Base Price (cents)</Label><Input type="number" value={serviceForm.basePrice} onChange={e => setServiceForm({ ...serviceForm, basePrice: Number(e.target.value) })} /></div>
                                <div><Label>Duration (min)</Label><Input type="number" value={serviceForm.duration} onChange={e => setServiceForm({ ...serviceForm, duration: Number(e.target.value) })} /></div>
                            </div>

                            <div className="border p-4 rounded-lg bg-muted/20">
                                <Label className="mb-4 block font-semibold text-[#8f5e25]">Pricing by Property Size (Optional overrides)</Label>
                                <div className="grid grid-cols-2 gap-4">
                                    {sqftTiers.map(tier => (
                                        <div key={tier.key}>
                                            <Label className="text-xs text-muted-foreground mb-1 block">{tier.label}</Label>
                                            <Input
                                                type="number"
                                                placeholder="Use base price"
                                                value={serviceForm.pricingTiers?.[tier.key] || ''}
                                                onChange={e => {
                                                    const val = e.target.value ? Number(e.target.value) : undefined;
                                                    const newTiers = { ...serviceForm.pricingTiers };
                                                    if (val !== undefined) newTiers[tier.key] = val;
                                                    else delete newTiers[tier.key];
                                                    setServiceForm({ ...serviceForm, pricingTiers: newTiers });
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <Label>Image</Label>
                                <div className="flex gap-2 items-center mb-2">
                                    <Input type="file" accept="image/*" onChange={handleServiceImageUpload} disabled={uploading} />
                                    {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                                </div>
                                <Input value={serviceForm.image} onChange={e => setServiceForm({ ...serviceForm, image: e.target.value })} placeholder="Image URL" />
                            </div>
                            <div><Label>Deliverables (one per line)</Label><Textarea value={deliverablesText} onChange={e => setDeliverablesText(e.target.value)} rows={4} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label>Deposit %</Label><Input type="number" value={serviceForm.depositRequired} onChange={e => setServiceForm({ ...serviceForm, depositRequired: Number(e.target.value) })} /></div>
                                <div><Label>Sort Order</Label><Input type="number" value={serviceForm.sortOrder} onChange={e => setServiceForm({ ...serviceForm, sortOrder: Number(e.target.value) })} /></div>
                            </div>
                            <div className="flex items-center gap-2"><input type="checkbox" checked={serviceForm.isActive} onChange={e => setServiceForm({ ...serviceForm, isActive: e.target.checked })} className="w-4 h-4" /><Label>Active</Label></div>
                            <Button className="w-full btn-gold text-white" onClick={handleSaveService}>{editService ? 'Update Package' : 'Create Package'}</Button>
                        </div>
                    </Modal>
                </Card>
            )}

            {subTab === 'addons' && (
                <Card>
                    <CardHeader><div className="flex items-center justify-between"><CardTitle>Add-Ons</CardTitle><Button onClick={openCreateAddon}><Plus className="w-4 h-4 mr-2" />Add Add-On</Button></div></CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {addOns.map(a => (
                                <div key={a.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:shadow-sm transition-shadow">
                                    <div><p className="font-medium">{a.name}</p><p className="text-sm text-muted-foreground">{a.description} • {formatPrice(a.price)}</p></div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={a.isActive ? 'default' : 'secondary'}>{a.isActive ? 'Active' : 'Inactive'}</Badge>
                                        <Button variant="ghost" size="icon" onClick={() => openEditAddon(a)}><Edit className="w-4 h-4" /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => onDeleteAddOn(a.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                                    </div>
                                </div>
                            ))}
                            {addOns.length === 0 && <p className="text-center py-8 text-muted-foreground">No add-ons found</p>}
                        </div>
                    </CardContent>
                    <Modal open={showAddonForm} onClose={() => setShowAddonForm(false)} title={editAddon ? 'Edit Add-On' : 'Add Add-On'}>
                        <div className="space-y-4">
                            <div><Label>Name *</Label><Input value={addonForm.name} onChange={e => setAddonForm({ ...addonForm, name: e.target.value })} /></div>
                            <div><Label>Description</Label><Textarea value={addonForm.description} onChange={e => setAddonForm({ ...addonForm, description: e.target.value })} rows={2} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label>Price (cents)</Label><Input type="number" value={addonForm.price} onChange={e => setAddonForm({ ...addonForm, price: Number(e.target.value) })} /></div>
                                <div><Label>Price Type</Label>
                                    <select className="w-full border rounded-md px-3 py-2 bg-background" value={addonForm.priceType} onChange={e => setAddonForm({ ...addonForm, priceType: e.target.value as AddOn['priceType'] })}>
                                        <option value="fixed">Fixed</option><option value="percentage">Percentage</option><option value="per-photo">Per Photo</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex items-center gap-2"><input type="checkbox" checked={addonForm.isActive} onChange={e => setAddonForm({ ...addonForm, isActive: e.target.checked })} className="w-4 h-4" /><Label>Active</Label></div>
                            <Button className="w-full btn-gold text-white" onClick={handleSaveAddon}>{editAddon ? 'Update Add-On' : 'Create Add-On'}</Button>
                        </div>
                    </Modal>
                </Card>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// ██ MESSAGES TAB
// ═══════════════════════════════════════════════════════════════
function MessagesTab({ messages, onMarkRead, onMarkUnread, onDelete }: {
    messages: ContactMessage[];
    onMarkRead: (id: string) => Promise<void>;
    onMarkUnread: (id: string) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}) {
    const [selectedMsg, setSelectedMsg] = useState<ContactMessage | null>(null);

    const handleOpen = (msg: ContactMessage) => {
        setSelectedMsg(msg);
        if (!msg.isRead) onMarkRead(msg.id);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Contact Messages ({messages.length})</CardTitle>
                    <p className="text-sm text-muted-foreground">{messages.filter(m => !m.isRead).length} unread</p>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {messages.map(msg => (
                        <div key={msg.id} className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:shadow-sm transition-shadow ${!msg.isRead ? 'border-blue-300 bg-blue-50/5' : 'border-border'}`} onClick={() => handleOpen(msg)}>
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                {!msg.isRead ? <Mail className="w-5 h-5 text-blue-500 flex-shrink-0" /> : <MailOpen className="w-5 h-5 text-gray-400 flex-shrink-0" />}
                                <div className="min-w-0">
                                    <p className={`font-medium truncate ${!msg.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>{msg.name} — {msg.subject}</p>
                                    <p className="text-sm text-muted-foreground truncate">{msg.message}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                                <span className="text-xs text-muted-foreground whitespace-nowrap">{msg.createdAt instanceof Date ? msg.createdAt.toLocaleDateString() : ''}</span>
                                <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); msg.isRead ? onMarkUnread(msg.id) : onMarkRead(msg.id); }}>
                                    {msg.isRead ? <Mail className="w-4 h-4" /> : <MailOpen className="w-4 h-4" />}
                                </Button>
                                <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); onDelete(msg.id); }}>
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                            </div>
                        </div>
                    ))}
                    {messages.length === 0 && <p className="text-center py-8 text-muted-foreground">No messages received yet</p>}
                </div>
            </CardContent>

            <Modal open={!!selectedMsg} onClose={() => setSelectedMsg(null)} title="Message Details">
                {selectedMsg && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label className="text-muted-foreground">From</Label><p className="font-medium">{selectedMsg.name}</p></div>
                            <div><Label className="text-muted-foreground">Email</Label><p className="font-medium">{selectedMsg.email}</p></div>
                        </div>
                        <div><Label className="text-muted-foreground">Subject</Label><p className="font-medium">{selectedMsg.subject}</p></div>
                        <div><Label className="text-muted-foreground">Message</Label><p className="mt-1 p-4 bg-muted rounded-lg whitespace-pre-wrap">{selectedMsg.message}</p></div>
                        <div><Label className="text-muted-foreground">Received</Label><p className="text-sm">{selectedMsg.createdAt instanceof Date ? selectedMsg.createdAt.toLocaleString() : ''}</p></div>
                        <div className="flex gap-2">
                            <Button variant="outline" className="flex-1" onClick={() => window.open(`mailto:${selectedMsg.email}?subject=Re: ${selectedMsg.subject}`)}>
                                <Mail className="w-4 h-4 mr-2" />Reply via Email
                            </Button>
                            <Button variant="outline" onClick={() => { onDelete(selectedMsg.id); setSelectedMsg(null); }}>
                                <Trash2 className="w-4 h-4 mr-2 text-red-500" />Delete
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </Card>
    );
}

// ═══════════════════════════════════════════════════════════════
// ██ TESTIMONIALS TAB
// ═══════════════════════════════════════════════════════════════
function TestimonialsTab({ testimonials, onUpdate, onDelete }: {
    testimonials: Testimonial[];
    onUpdate: (id: string, data: Partial<Testimonial>) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}) {
    const pending = testimonials.filter(t => t.status === 'pending');
    const approved = testimonials.filter(t => t.status === 'approved' || !t.status); // Handle legacy
    const rejected = testimonials.filter(t => t.status === 'rejected');

    return (
        <div className="space-y-8">
            {/* Pending Requests */}
            {pending.length > 0 && (
                <Card className="border-l-4 border-l-yellow-500 border-yellow-200 bg-yellow-50/10">
                    <CardHeader>
                        <CardTitle className="text-yellow-600 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" /> Pending Reviews ({pending.length})
                        </CardTitle>
                        <CardDescription>Review and approve new testimonials from clients.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {pending.map(t => (
                                <TestimonialCard key={t.id} testimonial={t} onUpdate={onUpdate} onDelete={onDelete} isPending />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Approved */}
            <Card>
                <CardHeader>
                    <CardTitle>Approved Testimonials ({approved.length})</CardTitle>
                    <CardDescription>Testimonials currently visible on the website.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {approved.map(t => (
                            <TestimonialCard key={t.id} testimonial={t} onUpdate={onUpdate} onDelete={onDelete} />
                        ))}
                        {approved.length === 0 && <p className="text-center py-8 text-muted-foreground">No approved testimonials.</p>}
                    </div>
                </CardContent>
            </Card>

            {/* Rejected */}
            {rejected.length > 0 && (
                <Card>
                    <CardHeader><CardTitle className="text-muted-foreground">Rejected ({rejected.length})</CardTitle></CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {rejected.map(t => (
                                <TestimonialCard key={t.id} testimonial={t} onUpdate={onUpdate} onDelete={onDelete} isRejected />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function TestimonialCard({ testimonial, onUpdate, onDelete, isPending, isRejected }: { testimonial: Testimonial, onUpdate: any, onDelete: any, isPending?: boolean, isRejected?: boolean }) {
    return (
        <div className="flex gap-4 p-4 border rounded-lg bg-card hover:shadow-sm transition-shadow">
            <Avatar>
                <AvatarImage src={testimonial.avatar} />
                <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                    <div>
                        <h4 className="font-semibold">{testimonial.name}</h4>
                        <p className="text-sm text-muted-foreground">{testimonial.role} @ {testimonial.company}</p>
                    </div>
                    <div className="flex text-yellow-500">
                        {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-4 h-4 ${i < testimonial.rating ? 'fill-current' : 'text-gray-300'}`} />
                        ))}
                    </div>
                </div>
                <p className="mt-2 text-sm italic">"{testimonial.content}"</p>
                <div className="mt-4 flex flex-wrap gap-2">
                    {isPending && (
                        <>
                            <Button size="sm" onClick={() => onUpdate(testimonial.id, { status: 'approved' })} className="bg-green-600 hover:bg-green-700 text-white">
                                <Check className="w-4 h-4 mr-2" />Approve
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => onUpdate(testimonial.id, { status: 'rejected' })} className="text-red-600 border-red-200 hover:bg-red-50">
                                <X className="w-4 h-4 mr-2" />Reject
                            </Button>
                        </>
                    )}
                    {!isPending && !isRejected && (
                        <Button size="sm" variant="outline" onClick={() => onUpdate(testimonial.id, { status: 'rejected' })}>Reject</Button>
                    )}
                    {isRejected && (
                        <Button size="sm" variant="outline" onClick={() => onUpdate(testimonial.id, { status: 'approved' })}>Approve</Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => onDelete(testimonial.id)} className="text-red-500 ml-auto">
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </Button>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                    {testimonial.createdAt instanceof Date ? `Submitted: ${testimonial.createdAt.toLocaleDateString()}` : ''}
                </div>
            </div>
        </div>
    )
}
