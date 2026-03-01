// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import {
    Shield, UserPlus, UserMinus, Loader2, AlertCircle, CheckCircle,
    Mail, Crown, RefreshCw, User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAuth, useStore } from '@/hooks/useStore';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

interface AdminUser {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isSuperAdmin: boolean;
    createdAt: string | null;
}

function StatusBanner({ status, message }: { status: 'success' | 'error' | null; message: string }) {
    if (!status) return null;
    const isSuccess = status === 'success';
    return (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm font-medium ${isSuccess
                ? 'bg-green-500/10 text-green-700 border border-green-500/20'
                : 'bg-red-500/10 text-red-700 border border-red-500/20'
            }`}>
            {isSuccess
                ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
                : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            <span>{message}</span>
        </div>
    );
}

export function AdminManagementTab() {
    const { user } = useAuth();
    const { showToast } = useStore();
    const isSuperAdmin = (user as any)?.isSuperAdmin === true;

    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [grantEmail, setGrantEmail] = useState('');
    const [grantStatus, setGrantStatus] = useState<'success' | 'error' | null>(null);
    const [grantMsg, setGrantMsg] = useState('');
    const [granting, setGranting] = useState(false);
    const [revokingId, setRevokingId] = useState<string | null>(null);

    const manageAdmin = httpsCallable(functions, 'manageAdmin');

    const fetchAdmins = useCallback(async () => {
        setLoading(true);
        try {
            const result = await manageAdmin({ action: 'list' }) as any;
            setAdmins(result.data.admins || []);
        } catch (err: any) {
            showToast('Failed to load admin list: ' + (err.message || 'Unknown error'), 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isSuperAdmin) {
            fetchAdmins();
        }
    }, [isSuperAdmin]);

    const handleGrant = async () => {
        if (!grantEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(grantEmail)) {
            setGrantStatus('error');
            setGrantMsg('Please enter a valid email address.');
            return;
        }
        setGranting(true);
        setGrantStatus(null);
        try {
            const result = await manageAdmin({ action: 'grant', targetEmail: grantEmail.trim() }) as any;
            setGrantStatus('success');
            setGrantMsg(result.data.message || 'Admin access granted!');
            setGrantEmail('');
            showToast('Admin access granted!', 'success');
            await fetchAdmins();
        } catch (err: any) {
            setGrantStatus('error');
            setGrantMsg(err.message || 'Failed to grant admin access.');
        } finally {
            setGranting(false);
        }
    };

    const handleRevoke = async (targetUid: string, targetEmail: string) => {
        const confirmed = window.confirm(
            `Remove admin access from ${targetEmail}?\n\nThey will become a regular client.`
        );
        if (!confirmed) return;

        setRevokingId(targetUid);
        try {
            const result = await manageAdmin({ action: 'revoke', targetUid }) as any;
            showToast(result.data.message || 'Admin access revoked.', 'success');
            await fetchAdmins();
        } catch (err: any) {
            showToast(err.message || 'Failed to revoke admin access.', 'error');
        } finally {
            setRevokingId(null);
        }
    };

    // Non-super admin: show read-only view
    if (!isSuperAdmin) {
        return (
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#cbb26a]/15 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-[#8f5e25]" />
                        </div>
                        <div>
                            <CardTitle>Admin Management</CardTitle>
                            <CardDescription>View and manage admin users</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                        <div className="w-16 h-16 rounded-full bg-[#cbb26a]/10 flex items-center justify-center">
                            <Crown className="w-8 h-8 text-[#cbb26a]" />
                        </div>
                        <div>
                            <p className="font-semibold text-lg">Super Admin Access Required</p>
                            <p className="text-muted-foreground text-sm mt-1 max-w-sm">
                                Only the super admin can grant or revoke admin privileges. Contact your super admin to make changes.
                            </p>
                        </div>
                        <Badge variant="outline" className="border-[#cbb26a]/40 text-[#8f5e25]">
                            <Shield className="w-3 h-3 mr-1" />
                            Your Role: Admin
                        </Badge>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Add New Admin */}
            <Card className="border border-[#cbb26a]/20">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#cbb26a]/15 flex items-center justify-center">
                            <UserPlus className="w-5 h-5 text-[#8f5e25]" />
                        </div>
                        <div>
                            <CardTitle className="text-base">Grant Admin Access</CardTitle>
                            <CardDescription className="text-xs">
                                Search for an existing user by email and promote them to admin
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="grantEmail">User Email Address</Label>
                            <div className="flex gap-2 mt-1">
                                <Input
                                    id="grantEmail"
                                    type="email"
                                    value={grantEmail}
                                    onChange={(e) => setGrantEmail(e.target.value)}
                                    placeholder="user@example.com"
                                    onKeyDown={(e) => e.key === 'Enter' && handleGrant()}
                                    className="flex-1"
                                />
                                <Button
                                    onClick={handleGrant}
                                    disabled={granting || !grantEmail.trim()}
                                    className="btn-gold text-white font-medium whitespace-nowrap"
                                >
                                    {granting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <UserPlus className="w-4 h-4 mr-2" />
                                            Grant Access
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>

                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                            <strong>Note:</strong> The user must already have an account. Granting admin access gives them full access to the Admin Dashboard including all client data, bookings, and settings.
                        </div>

                        <StatusBanner status={grantStatus} message={grantMsg} />
                    </div>
                </CardContent>
            </Card>

            {/* Current Admins List */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#cbb26a]/15 flex items-center justify-center">
                                <Shield className="w-5 h-5 text-[#8f5e25]" />
                            </div>
                            <div>
                                <CardTitle className="text-base">Current Admins ({admins.length})</CardTitle>
                                <CardDescription className="text-xs">Manage existing admin accounts</CardDescription>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchAdmins}
                            disabled={loading}
                            className="border-[#cbb26a]/30 hover:border-[#cbb26a]"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <RefreshCw className="w-4 h-4" />
                            )}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-[#cbb26a]" />
                        </div>
                    ) : admins.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p>No admins found.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {admins.map((admin) => {
                                const initials = `${admin.firstName?.[0] || ''}${admin.lastName?.[0] || ''}`.toUpperCase() || 'A';
                                const isCurrentUser = admin.id === user?.id;
                                const isRevoking = revokingId === admin.id;

                                return (
                                    <div
                                        key={admin.id}
                                        className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${admin.isSuperAdmin
                                                ? 'bg-[#cbb26a]/5 border-[#cbb26a]/30'
                                                : 'bg-card border-border hover:border-[#cbb26a]/20'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <Avatar className="w-10 h-10 flex-shrink-0">
                                                <AvatarFallback
                                                    className={admin.isSuperAdmin ? 'bg-[#cbb26a]/20 text-[#8f5e25]' : 'bg-muted'}
                                                >
                                                    {initials}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="font-medium text-sm truncate">
                                                        {admin.firstName} {admin.lastName}
                                                        {isCurrentUser && (
                                                            <span className="text-muted-foreground font-normal"> (you)</span>
                                                        )}
                                                    </p>
                                                    {admin.isSuperAdmin && (
                                                        <Badge className="bg-[#cbb26a] text-white text-xs py-0 h-4">
                                                            <Crown className="w-2.5 h-2.5 mr-1" />
                                                            Super Admin
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                                    <Mail className="w-3 h-3" />
                                                    <span className="truncate">{admin.email}</span>
                                                </div>
                                                {admin.createdAt && (
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        Since {new Date(admin.createdAt).toLocaleDateString()}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex-shrink-0 ml-4">
                                            {admin.isSuperAdmin || isCurrentUser ? (
                                                <Badge variant="outline" className="text-xs text-muted-foreground">
                                                    Protected
                                                </Badge>
                                            ) : (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRevoke(admin.id, admin.email)}
                                                    disabled={isRevoking}
                                                    className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs"
                                                >
                                                    {isRevoking ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <UserMinus className="w-3 h-3 mr-1" />
                                                            Revoke
                                                        </>
                                                    )}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {admins.length > 0 && (
                        <>
                            <Separator className="my-4" />
                            <p className="text-xs text-muted-foreground text-center">
                                <Crown className="w-3 h-3 inline mr-1 text-[#cbb26a]" />
                                Super admins are protected and cannot be demoted through this panel.
                                Edit Firestore directly to change super admin status.
                            </p>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
