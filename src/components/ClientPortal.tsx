import { useState, useEffect } from 'react';
import {
    Lock, Plus, LayoutDashboard, FolderOpen, FileText, Download, MessageSquare,
    CreditCard, Video, Image as ImageIcon, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useAuth, usePortal, useStore } from '@/hooks/useStore';
import { formatDate, formatTime, formatPrice } from '@/data/mockData';
import { ClientTestimonialForm } from '@/components/ClientTestimonialForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PaymentForm } from '@/components/PaymentForm';
import { invoicesService } from '@/lib/firebaseService';
import type { Project, Invoice } from '@/types';

type View = 'home' | 'portfolio' | 'services' | 'booking' | 'about' | 'contact' | 'portal' | 'admin' | 'login';

export function ClientPortal({ setView }: { setView: (v: View) => void }) {
    const { user } = useAuth();
    const { bookings, invoices, projects } = usePortal();
    const loadPortalData = useStore(state => state.loadPortalData);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [payInvoice, setPayInvoice] = useState<Invoice | null>(null);

    useEffect(() => {
        if (user) {
            loadPortalData(user.id);
        }
    }, [user, loadPortalData]);


    if (!user) {
        return (
            <div className="min-h-screen pt-20 pb-20 px-4 flex items-center justify-center">
                <div className="text-center">
                    <Lock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <h2 className="text-2xl font-bold mb-2">Please Log In</h2>
                    <p className="text-muted-foreground mb-4">Access your client portal to view projects and invoices</p>
                    <Button onClick={() => setView('login')}>Sign In</Button>
                </div>
            </div>
        );
    }

    const upcomingBooking = bookings[0];
    const pendingInvoices = invoices.filter((i: Invoice) => i.status === 'sent');
    const activeProjects = projects.filter((p: Project) => p.status !== 'delivered' && p.status !== 'closed');

    const handleDownload = async (url: string, filename?: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename || url.split('/').pop() || 'download';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error('Download failed:', error);
            window.open(url, '_blank');
        }
    };

    return (
        <div className="min-h-screen pt-20 pb-20 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold">Client Portal</h1>
                        <p className="text-muted-foreground">Welcome back, {user.profile?.firstName || 'Client'}</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => loadPortalData(user.id)}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Refresh
                        </Button>
                        <Button onClick={() => setView('booking')}>
                            <Plus className="w-4 h-4 mr-2" />
                            New Booking
                        </Button>
                    </div>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="mb-6 flex-wrap">
                        <TabsTrigger value="dashboard"><LayoutDashboard className="w-4 h-4 mr-2" />Dashboard</TabsTrigger>
                        <TabsTrigger value="projects"><FolderOpen className="w-4 h-4 mr-2" />Projects</TabsTrigger>
                        <TabsTrigger value="invoices"><FileText className="w-4 h-4 mr-2" />Invoices</TabsTrigger>
                        <TabsTrigger value="downloads"><Download className="w-4 h-4 mr-2" />Downloads</TabsTrigger>
                        <TabsTrigger value="testimonials"><MessageSquare className="w-4 h-4 mr-2" />Testimonials</TabsTrigger>
                    </TabsList>

                    {/* Dashboard Tab */}
                    <TabsContent value="dashboard" className="space-y-6">
                        <div className="grid sm:grid-cols-3 gap-4">
                            <Card><CardHeader className="pb-2"><CardDescription>Total Bookings</CardDescription><CardTitle className="text-3xl text-[#8f5e25]">{bookings.length}</CardTitle></CardHeader></Card>
                            <Card><CardHeader className="pb-2"><CardDescription>Active Projects</CardDescription><CardTitle className="text-3xl text-[#8f5e25]">{activeProjects.length}</CardTitle></CardHeader></Card>
                            <Card><CardHeader className="pb-2"><CardDescription>Pending Invoices</CardDescription><CardTitle className="text-3xl text-[#8f5e25]">{pendingInvoices.length}</CardTitle></CardHeader></Card>
                        </div>

                        {upcomingBooking && (
                            <Card>
                                <CardHeader><CardTitle>Upcoming Booking</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                        <div>
                                            <p className="font-semibold text-lg">{upcomingBooking.serviceName}</p>
                                            <p className="text-muted-foreground">{formatDate(upcomingBooking.dateTime.start)} at {formatTime(upcomingBooking.dateTime.start)}</p>
                                            <p className="text-sm text-muted-foreground">{upcomingBooking.location.address}</p>
                                        </div>
                                        <Badge variant={upcomingBooking.status === 'confirmed' ? 'default' : 'secondary'}>{upcomingBooking.status}</Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <div className="grid sm:grid-cols-2 gap-4">
                            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('invoices')}>
                                <CardContent className="p-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-[#cbb26a]/20 rounded-lg flex items-center justify-center"><CreditCard className="w-6 h-6 text-[#8f5e25]" /></div>
                                        <div><p className="font-semibold">Pay Invoices</p><p className="text-sm text-muted-foreground">{pendingInvoices.length} pending</p></div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('downloads')}>
                                <CardContent className="p-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-[#cbb26a]/20 rounded-lg flex items-center justify-center"><Download className="w-6 h-6 text-[#8f5e25]" /></div>
                                        <div><p className="font-semibold">Download Files</p><p className="text-sm text-muted-foreground">Access your deliverables</p></div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Projects Tab */}
                    <TabsContent value="projects" className="space-y-4">
                        {projects.map((project: Project) => (
                            <Card key={project.id}>
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div><CardTitle>{project.name}</CardTitle><CardDescription>{project.projectNumber}</CardDescription></div>
                                        <Badge>{project.status}</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground mb-4">{project.description}</p>

                                    {project.deliverables && project.deliverables.length > 0 && (
                                        <div>
                                            <p className="text-sm font-medium mb-2">Deliverables</p>
                                            <div className="space-y-2">
                                                {project.deliverables.map((del: any) => (
                                                    <div key={del.id} className="flex items-center justify-between p-2 bg-card border border-border rounded-lg">
                                                        <div className="flex items-center gap-2">
                                                            {del.type === 'photo' && <ImageIcon className="w-4 h-4 text-[#8f5e25]" />}
                                                            {del.type === 'video' && <Video className="w-4 h-4 text-[#8f5e25]" />}
                                                            <span className="text-sm">{del.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant={del.status === 'ready' ? 'default' : 'secondary'} className="text-xs">{del.status}</Badge>
                                                            {del.status === 'ready' && del.url && (
                                                                <Button size="sm" variant="ghost" onClick={() => handleDownload(del.url)}>
                                                                    <Download className="w-4 h-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                        {projects.length === 0 && <p className="text-center py-12 text-muted-foreground">No projects found.</p>}
                    </TabsContent>

                    {/* Invoices Tab */}
                    <TabsContent value="invoices" className="space-y-4">
                        {invoices.map((invoice: Invoice) => (
                            <Card key={invoice.id}>
                                <CardContent className="p-6">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                        <div>
                                            <p className="font-semibold">{invoice.invoiceNumber}</p>
                                            <p className="text-sm text-muted-foreground">{invoice.items.map((i: any) => i.description).join(', ')}</p>
                                            <p className="text-sm text-muted-foreground">Due: {formatDate(invoice.dueDate)}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className="font-bold text-lg">{formatPrice(invoice.balanceDue)}</p>
                                                <Badge variant={invoice.status === 'paid' ? 'default' : invoice.status === 'overdue' ? 'destructive' : 'secondary'}>{invoice.status}</Badge>
                                            </div>
                                            <Button variant="outline" size="sm" onClick={() => setSelectedInvoice(invoice)}>View Details</Button>
                                            {invoice.status !== 'paid' && (
                                                <Button size="sm" onClick={() => setPayInvoice(invoice)}>Pay Now</Button>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        {invoices.length === 0 && <p className="text-center py-12 text-muted-foreground">No invoices found.</p>}
                    </TabsContent>

                    <Dialog open={!!payInvoice} onOpenChange={(open) => !open && setPayInvoice(null)}>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Pay Invoice {payInvoice?.invoiceNumber}</DialogTitle>
                            </DialogHeader>
                            {payInvoice && (
                                <PaymentForm
                                    amount={payInvoice.balanceDue}
                                    email={user?.email}
                                    invoiceId={payInvoice.id}
                                    onSuccess={() => {
                                        // RELY ON WEBHOOK: Do not update status here.
                                        // Just close the modal and show a success message.
                                        setPayInvoice(null);
                                        // Ideally, show a toast here saying "Payment Received. Invoice status will update shortly."
                                        alert("Payment Received! Your invoice status will update automatically in a few moments.");
                                        loadPortalData(user.id);
                                    }}
                                />
                            )}
                        </DialogContent>
                    </Dialog>

                    {/* Downloads Tab */}
                    <TabsContent value="downloads" className="space-y-4">
                        {projects.flatMap((p: Project) => p.deliverables || []).filter((d: any) => d.status === 'ready').map((deliverable: any) => (
                            <Card key={deliverable.id}>
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            {deliverable.thumbnail ? (
                                                <img src={deliverable.thumbnail} alt={deliverable.name} className="w-16 h-16 object-cover rounded-lg" />
                                            ) : (
                                                <div className="w-16 h-16 bg-[#cbb26a]/20 rounded-lg flex items-center justify-center">
                                                    {deliverable.type === 'photo' ? <ImageIcon className="w-6 h-6 text-[#8f5e25]" /> : <Video className="w-6 h-6 text-[#8f5e25]" />}
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-semibold">{deliverable.name}</p>
                                                <p className="text-sm text-muted-foreground uppercase">{deliverable.type}</p>
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm" onClick={() => handleDownload(deliverable.url, deliverable.name)}>
                                            <Download className="w-4 h-4 mr-2" />Download
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        {projects.flatMap((p: Project) => p.deliverables || []).filter((d: any) => d.status === 'ready').length === 0 && (
                            <div className="text-center py-12">
                                <Download className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                <p className="text-muted-foreground">No downloads available yet</p>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="testimonials">
                        <ClientTestimonialForm user={user} />
                    </TabsContent>
                </Tabs>

                {/* Invoice Modal */}
                <Dialog open={!!selectedInvoice} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Invoice Details</DialogTitle>
                        </DialogHeader>
                        {selectedInvoice && (
                            <div className="space-y-6">
                                <div className="flex justify-between border-b pb-4">
                                    <div>
                                        <h3 className="font-bold text-lg">Invoice #{selectedInvoice.invoiceNumber}</h3>
                                        <p className="text-muted-foreground">Issued to: {user.profile?.firstName} {user.profile?.lastName}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-muted-foreground">Due Date: {formatDate(selectedInvoice.dueDate)}</p>
                                        <Badge>{selectedInvoice.status}</Badge>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="font-medium">Items</h4>
                                    <div className="border rounded-lg overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-muted">
                                                <tr>
                                                    <th className="p-3 text-left">Description</th>
                                                    <th className="p-3 text-center">Qty</th>
                                                    <th className="p-3 text-right">Price</th>
                                                    <th className="p-3 text-right">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedInvoice.items.map((item, index) => (
                                                    <tr key={index} className="border-t">
                                                        <td className="p-3">{item.description}</td>
                                                        <td className="p-3 text-center">{item.quantity}</td>
                                                        <td className="p-3 text-right">{formatPrice(item.unitPrice)}</td>
                                                        <td className="p-3 text-right">{formatPrice(item.total)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="flex justify-end space-y-2">
                                    <div className="w-48 space-y-2">
                                        <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(selectedInvoice.subtotal)}</span></div>
                                        <div className="flex justify-between"><span>Tax</span><span>{formatPrice(selectedInvoice.tax)}</span></div>
                                        <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total</span><span>{formatPrice(selectedInvoice.total)}</span></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setSelectedInvoice(null)}>Close</Button>
                            <Button onClick={() => window.print()}>Print / Save as PDF</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
