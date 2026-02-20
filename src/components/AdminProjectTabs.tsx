
import { useState } from 'react';
import { Plus, Edit, Upload, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { storageService } from '@/lib/firebaseService';
import { formatPrice } from '@/data/mockData';
import type { Project, Client, Invoice } from '@/types';

export function ProjectsTab({ projects, clients, onCreate, onUpdate, onDelete }: {
    projects: Project[];
    clients: Client[];
    onCreate: (p: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    onUpdate: (id: string, data: Partial<Project>) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}) {
    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState<Project | null>(null);
    const [form, setForm] = useState({
        name: '', description: '', clientId: '', status: 'lead' as Project['status'],
        workflowStage: 0, deliverables: [] as Project['deliverables']
    });
    const [uploading, setUploading] = useState(false);

    const openCreate = () => {
        setForm({ name: '', description: '', clientId: '', status: 'lead', workflowStage: 0, deliverables: [] });
        setEditItem(null);
        setShowForm(true);
    };

    const openEdit = (p: Project) => {
        setForm({
            name: p.name, description: p.description, clientId: p.clientId, status: p.status,
            workflowStage: p.workflowStage, deliverables: p.deliverables || []
        });
        setEditItem(p);
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!form.name || !form.clientId) { alert('Name and Client are required'); return; }
        const client = clients.find(c => c.id === form.clientId);
        const projectData = {
            ...form,
            clientName: client?.name || client?.userId || 'Unknown',
            bookingId: '',
            projectNumber: `PRJ-${Date.now()}`,
            notes: '',
        };

        if (editItem) { await onUpdate(editItem.id, projectData); }
        else { await onCreate(projectData); }
        setShowForm(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const url = await storageService.uploadFile(file, `projects/${form.clientId}`);
            const newDeliverable = {
                id: Math.random().toString(36).substr(2, 9),
                name: file.name,
                type: file.type.startsWith('image') ? 'photo' : file.type.startsWith('video') ? 'video' : 'raw' as any,
                url,
                status: 'ready' as const,
                thumbnail: file.type.startsWith('image') ? url : undefined
            };
            setForm(prev => ({ ...prev, deliverables: [...prev.deliverables, newDeliverable] }));
        } catch (err) {
            console.error(err);
            alert('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Projects ({projects.length})</CardTitle>
                    <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Add Project</Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {projects.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                                <h4 className="font-semibold">{p.name}</h4>
                                <p className="text-sm text-muted-foreground">{p.clientName} • {p.status}</p>
                                <div className="flex gap-2 mt-2">
                                    {p.deliverables?.map(d => (
                                        <Badge key={d.id} variant="outline" className="text-xs">
                                            {d.type === 'photo' ? <FileText className="w-3 h-3 mr-1" /> : <Upload className="w-3 h-3 mr-1" />}
                                            {d.name}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Edit className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => { if (confirm('Delete project?')) onDelete(p.id) }}><div className="text-red-500"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg></div></Button>
                            </div>
                        </div>
                    ))}
                    {projects.length === 0 && <p className="text-center py-8 text-muted-foreground">No projects found</p>}
                </div>
            </CardContent>

            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>{editItem ? 'Edit Project' : 'New Project'}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Project Name</Label>
                                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div>
                                <Label>Client</Label>
                                <select
                                    className="w-full border rounded-md px-3 py-2 bg-background"
                                    value={form.clientId}
                                    onChange={e => setForm({ ...form, clientId: e.target.value })}
                                >
                                    <option value="">Select Client</option>
                                    {clients.map(c => (
                                        <option key={c.id} value={c.id}>{c.name || `Client #${c.id.slice(-4)}`}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>

                        <div className="border-t pt-4">
                            <Label className="mb-2 block">Deliverables / Downloads</Label>
                            <div className="flex items-center gap-4 mb-4">
                                <Input type="file" onChange={handleFileUpload} disabled={uploading} />
                                {uploading && <span className="text-sm text-muted-foreground">Uploading...</span>}
                            </div>
                            <div className="space-y-2">
                                {form.deliverables.map((d, i) => (
                                    <div key={d.id} className="flex items-center justify-between p-2 bg-muted rounded">
                                        <div className="flex items-center gap-2">
                                            {d.thumbnail && <img src={d.thumbnail} alt="" className="w-8 h-8 rounded" />}
                                            <span className="text-sm truncate max-w-[200px]">{d.name}</span>
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={() => setForm(prev => ({
                                            ...prev, deliverables: prev.deliverables.filter((_, idx) => idx !== i)
                                        }))}><X className="w-4 h-4" /></Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                        <Button onClick={handleSave} className="bg-[#cbb26a] text-white">Save Project</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}

export function InvoicesTab({ invoices, clients, onCreate, onUpdate }: {
    invoices: Invoice[];
    clients: Client[];
    onCreate: (i: Omit<Invoice, 'id' | 'createdAt'>) => Promise<void>;
    onUpdate: (id: string, data: Partial<Invoice>) => Promise<void>;
}) {
    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState<Invoice | null>(null);
    const [form, setForm] = useState({
        invoiceNumber: `INV-${Date.now()}`,
        clientId: '',
        status: 'draft' as Invoice['status'],
        dueDate: new Date().toISOString().split('T')[0],
        items: [] as Invoice['items']
    });
    const [newItem, setNewItem] = useState<{ description: string; quantity: number | string; unitPrice: number | string }>({ description: '', quantity: 1, unitPrice: '' });

    const openCreate = () => {
        setForm({ invoiceNumber: `INV-${Date.now()}`, clientId: '', status: 'draft', dueDate: new Date().toISOString().split('T')[0], items: [] });
        setEditItem(null);
        setShowForm(true);
    };

    const addItem = () => {
        if (!newItem.description) return;
        const qty = Number(newItem.quantity) || 0;
        const price = Math.round((Number(newItem.unitPrice) || 0) * 100);
        setForm(prev => ({
            ...prev,
            items: [...prev.items, { description: newItem.description, quantity: qty, unitPrice: price, total: qty * price }]
        }));
        setNewItem({ description: '', quantity: 1, unitPrice: '' });
    };

    const calculateTotals = () => {
        const subtotal = form.items.reduce((acc, item) => acc + item.total, 0);
        const tax = subtotal * 0.0; // 0% tax for now
        return { subtotal, tax, total: subtotal + tax };
    };

    const handleSave = async () => {
        if (!form.clientId) { alert('Client is required'); return; }
        const totals = calculateTotals();
        const client = clients.find(c => c.id === form.clientId);

        const invoiceData = {
            ...form,
            clientName: client?.name || client?.userId || 'Unknown',
            dueDate: new Date(form.dueDate),
            ...totals,
            amountPaid: 0,
            balanceDue: totals.total,
        };

        if (editItem) { await onUpdate(editItem.id, invoiceData); }
        else { await onCreate(invoiceData); }
        setShowForm(false);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Invoices ({invoices.length})</CardTitle>
                    <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Create Invoice</Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b">
                        <th className="text-left py-2">Invoice #</th><th className="text-left py-2">Client</th><th className="text-left py-2">Due Date</th><th className="text-left py-2">Amount</th><th className="text-left py-2">Status</th><th className="text-left py-2">Actions</th>
                    </tr></thead><tbody>
                            {invoices.map(inv => (
                                <tr key={inv.id} className="border-b">
                                    <td className="py-2">{inv.invoiceNumber}</td>
                                    <td className="py-2">{inv.clientName}</td>
                                    <td className="py-2">{new Date(inv.dueDate).toLocaleDateString()}</td>
                                    <td className="py-2">{formatPrice(inv.total)}</td>
                                    <td className="py-2"><Badge variant={inv.status === 'paid' ? 'default' : 'secondary'}>{inv.status}</Badge></td>
                                    <td className="py-2">
                                        <Button variant="ghost" size="sm" onClick={() => { setEditItem(inv); setForm({ ...inv, dueDate: new Date(inv.dueDate).toISOString().split('T')[0] }); setShowForm(true); }}>Edit</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody></table></div>
                    {invoices.length === 0 && <p className="text-center py-8 text-muted-foreground">No invoices found</p>}
                </div>
            </CardContent>

            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>{editItem ? 'Edit Invoice' : 'Create Invoice'}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Client</Label>
                                <select
                                    className="w-full border rounded-md px-3 py-2 bg-background"
                                    value={form.clientId}
                                    onChange={e => setForm({ ...form, clientId: e.target.value })}
                                >
                                    <option value="">Select Client</option>
                                    {clients.map(c => (
                                        <option key={c.id} value={c.id}>{c.name || `Client #${c.id.slice(-4)}`}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <Label>Due Date</Label>
                                <Input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
                            </div>
                        </div>

                        <div className="border p-4 rounded-lg space-y-4">
                            <h4 className="font-medium">Items</h4>
                            <div className="grid grid-cols-12 gap-2">
                                <div className="col-span-6"><Input placeholder="Description" value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} /></div>
                                <div className="col-span-2"><Input type="number" placeholder="Qty" value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: e.target.value })} /></div>
                                <div className="col-span-3"><Input type="number" step="0.01" className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="Price ($)" value={newItem.unitPrice} onChange={e => setNewItem({ ...newItem, unitPrice: e.target.value })} /></div>
                                <div className="col-span-1"><Button onClick={addItem} size="icon"><Plus className="w-4 h-4" /></Button></div>
                            </div>
                            <div className="space-y-2">
                                {form.items.map((item, i) => (
                                    <div key={i} className="flex justify-between items-center p-2 bg-muted rounded">
                                        <span>{item.description} (x{item.quantity})</span>
                                        <div className="flex items-center gap-4">
                                            <span>
                                                {new Intl.NumberFormat('en-US', {
                                                    style: 'currency',
                                                    currency: 'USD',
                                                    minimumFractionDigits: item.total % 100 === 0 ? 0 : 2
                                                }).format(item.total / 100)}
                                            </span>
                                            <Button variant="ghost" size="sm" onClick={() => setForm(prev => ({ ...prev, items: prev.items.filter((_, idx) => idx !== i) }))}><X className="w-4 h-4" /></Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between font-bold pt-2 border-t">
                                <span>Total</span>
                                <span>
                                    {new Intl.NumberFormat('en-US', {
                                        style: 'currency',
                                        currency: 'USD',
                                        minimumFractionDigits: calculateTotals().total % 100 === 0 ? 0 : 2
                                    }).format(calculateTotals().total / 100)}
                                </span>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                        <Button onClick={handleSave} className="bg-[#cbb26a] text-white">Save Invoice</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
