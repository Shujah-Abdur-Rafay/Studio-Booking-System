
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatPrice, formatDate } from '@/data/mockData';
import type { Payment, Client } from '@/types';
import { CreditCard, ExternalLink } from 'lucide-react';

export function TransactionsTab({ payments, clients }: {
    payments: Payment[];
    clients: Client[];
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Transactions ({payments.length})</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b">
                                <th className="text-left py-3 px-4">Date</th>
                                <th className="text-left py-3 px-4">Amount</th>
                                <th className="text-left py-3 px-4">Status</th>
                                <th className="text-left py-3 px-4">Client</th>
                                <th className="text-left py-3 px-4">Method</th>
                                <th className="text-left py-3 px-4">Reference</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.map(p => {
                                // Try to find client name
                                let clientName = 'Unknown';
                                if (p.userId) {
                                    const client = clients.find(c => c.userId === p.userId || c.id === p.userId);
                                    if (client) clientName = client.name || client.email || 'Client';
                                } else if (p.metadata?.customer_email) {
                                    clientName = p.metadata.customer_email;
                                }

                                return (
                                    <tr key={p.id} className="border-b hover:bg-muted/50 transition-colors">
                                        <td className="py-3 px-4">
                                            {p.created instanceof Date ? formatDate(p.created) : new Date(p.created).toLocaleDateString()}
                                            <div className="text-xs text-muted-foreground">
                                                {p.created instanceof Date ? p.created.toLocaleTimeString() : ''}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 font-medium">
                                            {formatPrice(p.amount)}
                                            <div className="text-xs text-muted-foreground uppercase">{p.currency}</div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <Badge variant={p.status === 'succeeded' ? 'default' : p.status === 'pending' ? 'outline' : 'destructive'}>
                                                {p.status}
                                            </Badge>
                                        </td>
                                        <td className="py-3 px-4">
                                            {clientName}
                                            {p.metadata?.invoiceId && <div className="text-xs text-muted-foreground">Inv: {p.metadata.invoiceId}</div>}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                <CreditCard className="w-4 h-4 text-muted-foreground" />
                                                <span className="capitalize">Stripe</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <span className="truncate max-w-[120px]" title={p.paymentIntentId}>{p.paymentIntentId.slice(-8)}...</span>
                                                <a href={`https://dashboard.stripe.com/test/payments/${p.paymentIntentId}`} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                                                    <ExternalLink className="w-3 h-3" />
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {payments.length === 0 && <p className="text-center py-8 text-muted-foreground">No transactions found</p>}
            </CardContent>
        </Card>
    );
}
