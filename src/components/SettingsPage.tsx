// @ts-nocheck
import { useState } from 'react';
import {
    User, Mail, Lock, Save, Eye, EyeOff, Shield, CheckCircle, AlertCircle, Loader2, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth, useStore } from '@/hooks/useStore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

function SectionCard({
    icon: Icon,
    title,
    description,
    children,
}: {
    icon: React.ElementType;
    title: string;
    description: string;
    children: React.ReactNode;
}) {
    return (
        <Card className="border border-border shadow-sm">
            <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#cbb26a]/15 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-[#8f5e25]" />
                    </div>
                    <div>
                        <CardTitle className="text-base">{title}</CardTitle>
                        <CardDescription className="text-xs">{description}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    );
}

function StatusBanner({
    status,
    message,
}: {
    status: 'success' | 'error' | null;
    message: string;
}) {
    if (!status) return null;
    const isSuccess = status === 'success';
    return (
        <div
            className={`flex items-center gap-2 p-3 rounded-lg text-sm font-medium ${isSuccess
                ? 'bg-green-500/10 text-green-700 border border-green-500/20'
                : 'bg-red-500/10 text-red-700 border border-red-500/20'
                }`}
        >
            {isSuccess ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            <span>{message}</span>
        </div>
    );
}

export function SettingsPage() {
    const { user, setUser } = useAuth();
    const { showToast } = useStore();

    // ── Name / Phone form ────────────────────────────────────────
    const [nameForm, setNameForm] = useState({
        firstName: user?.profile?.firstName || '',
        lastName: user?.profile?.lastName || '',
        phone: user?.profile?.phone || '',
    });
    const [nameStatus, setNameStatus] = useState<'success' | 'error' | null>(null);
    const [nameMsg, setNameMsg] = useState('');
    const [nameSaving, setNameSaving] = useState(false);

    // ── Email form ───────────────────────────────────────────────
    const [emailForm, setEmailForm] = useState({ newEmail: user?.email || '' });
    const [emailStatus, setEmailStatus] = useState<'success' | 'error' | null>(null);
    const [emailMsg, setEmailMsg] = useState('');
    const [emailSaving, setEmailSaving] = useState(false);

    // ── Password form ────────────────────────────────────────────
    const [passForm, setPassForm] = useState({ newPassword: '', confirmPassword: '' });
    const [showPass, setShowPass] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [passStatus, setPassStatus] = useState<'success' | 'error' | null>(null);
    const [passMsg, setPassMsg] = useState('');
    const [passSaving, setPassSaving] = useState(false);

    if (!user) return null;

    const initials = `${user.profile?.firstName?.[0] || ''}${user.profile?.lastName?.[0] || ''}`.toUpperCase() || 'U';
    const updateUserProfile = httpsCallable(functions, 'updateUserProfile');

    const handleSaveName = async () => {
        if (!nameForm.firstName.trim() || !nameForm.lastName.trim()) {
            setNameStatus('error');
            setNameMsg('First and last name are required.');
            return;
        }
        setNameSaving(true);
        setNameStatus(null);
        try {
            await updateDoc(doc(db, 'users', user.id), {
                'profile.firstName': nameForm.firstName.trim(),
                'profile.lastName': nameForm.lastName.trim(),
                'profile.phone': nameForm.phone.trim(),
            });
            // Optimistically update local state
            setUser({
                ...user,
                profile: {
                    ...user.profile,
                    firstName: nameForm.firstName.trim(),
                    lastName: nameForm.lastName.trim(),
                    phone: nameForm.phone.trim(),
                },
            });
            setNameStatus('success');
            setNameMsg('Name updated successfully!');
            showToast('Profile name updated!', 'success');
        } catch (err: any) {
            setNameStatus('error');
            setNameMsg(err.message || 'Failed to update name.');
        } finally {
            setNameSaving(false);
        }
    };

    const handleSaveEmail = async () => {
        if (!emailForm.newEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailForm.newEmail)) {
            setEmailStatus('error');
            setEmailMsg('Please enter a valid email address.');
            return;
        }
        if (emailForm.newEmail.trim() === user.email) {
            setEmailStatus('error');
            setEmailMsg('New email is the same as the current one.');
            return;
        }
        setEmailSaving(true);
        setEmailStatus(null);
        try {
            await updateUserProfile({ newEmail: emailForm.newEmail.trim() });
            setUser({ ...user, email: emailForm.newEmail.trim() });
            setEmailStatus('success');
            setEmailMsg('Email updated successfully! Please use your new email to sign in next time.');
            showToast('Email updated!', 'success');
        } catch (err: any) {
            setEmailStatus('error');
            setEmailMsg(err.message || 'Failed to update email.');
        } finally {
            setEmailSaving(false);
        }
    };

    const handleSavePassword = async () => {
        if (passForm.newPassword.length < 6) {
            setPassStatus('error');
            setPassMsg('Password must be at least 6 characters.');
            return;
        }
        if (passForm.newPassword !== passForm.confirmPassword) {
            setPassStatus('error');
            setPassMsg('Passwords do not match.');
            return;
        }
        setPassSaving(true);
        setPassStatus(null);
        try {
            await updateUserProfile({ newPassword: passForm.newPassword });
            setPassForm({ newPassword: '', confirmPassword: '' });
            setPassStatus('success');
            setPassMsg('Password changed successfully!');
            showToast('Password updated!', 'success');
        } catch (err: any) {
            setPassStatus('error');
            setPassMsg(err.message || 'Failed to update password.');
        } finally {
            setPassSaving(false);
        }
    };

    const pwStrength = (() => {
        const p = passForm.newPassword;
        if (!p) return null;
        if (p.length < 6) return { level: 'Weak', color: 'bg-red-500', pct: 25 };
        if (p.length < 8 || !/[0-9]/.test(p)) return { level: 'Fair', color: 'bg-yellow-500', pct: 50 };
        if (p.length < 10 || !/[!@#$%^&*]/.test(p)) return { level: 'Good', color: 'bg-blue-500', pct: 75 };
        return { level: 'Strong', color: 'bg-green-500', pct: 100 };
    })();

    return (
        <div className="min-h-screen pt-20 pb-20 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <Settings className="w-6 h-6 text-[#8f5e25]" />
                        <h1 className="text-3xl font-bold">Account Settings</h1>
                    </div>
                    <p className="text-muted-foreground">Manage your account details and security preferences.</p>
                </div>

                {/* Profile Summary Card */}
                <div className="flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-r from-[#8f5e25]/10 to-[#cbb26a]/10 border border-[#cbb26a]/20 mb-8">
                    <Avatar className="w-16 h-16 text-xl font-bold ring-2 ring-[#cbb26a]/40">
                        <AvatarFallback className="bg-[#cbb26a]/20 text-[#8f5e25]">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-lg truncate">
                            {user.profile?.firstName} {user.profile?.lastName}
                        </p>
                        <p className="text-muted-foreground text-sm truncate">{user.email}</p>
                        <div className="flex gap-2 mt-1">
                            <Badge
                                variant="outline"
                                className={`text-xs ${user.role === 'admin'
                                    ? 'border-[#cbb26a] text-[#8f5e25]'
                                    : 'border-blue-400 text-blue-600'
                                    }`}
                            >
                                {user.role === 'admin' ? (
                                    <>
                                        <Shield className="w-3 h-3 mr-1" />
                                        {(user as any).isSuperAdmin ? 'Super Admin' : 'Admin'}
                                    </>
                                ) : (
                                    <>
                                        <User className="w-3 h-3 mr-1" />
                                        Client
                                    </>
                                )}
                            </Badge>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* ── Name & Phone ────────────────────────────────────── */}
                    <SectionCard icon={User} title="Personal Information" description="Update your display name and contact number">
                        <div className="space-y-4">
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="firstName">First Name</Label>
                                    <Input
                                        id="firstName"
                                        value={nameForm.firstName}
                                        onChange={(e) => setNameForm({ ...nameForm, firstName: e.target.value })}
                                        placeholder="John"
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="lastName">Last Name</Label>
                                    <Input
                                        id="lastName"
                                        value={nameForm.lastName}
                                        onChange={(e) => setNameForm({ ...nameForm, lastName: e.target.value })}
                                        placeholder="Doe"
                                        className="mt-1"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="phone">Phone Number</Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    value={nameForm.phone}
                                    onChange={(e) => setNameForm({ ...nameForm, phone: e.target.value })}
                                    placeholder="(555) 000-0000"
                                    className="mt-1"
                                />
                            </div>
                            <StatusBanner status={nameStatus} message={nameMsg} />
                            <Button
                                onClick={handleSaveName}
                                disabled={nameSaving}
                                className="w-full btn-gold text-white font-medium"
                            >
                                {nameSaving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Saving…
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Save Name
                                    </>
                                )}
                            </Button>
                        </div>
                    </SectionCard>

                    {/* ── Email ───────────────────────────────────────────── */}
                    <SectionCard icon={Mail} title="Email Address" description="Change the email used to sign in to your account">
                        <div className="space-y-4">
                            <div>
                                <Label className="text-xs text-muted-foreground">Current Email</Label>
                                <p className="text-sm font-medium mt-0.5">{user.email}</p>
                            </div>
                            <Separator />
                            <div>
                                <Label htmlFor="newEmail">New Email Address</Label>
                                <Input
                                    id="newEmail"
                                    type="email"
                                    value={emailForm.newEmail}
                                    onChange={(e) => setEmailForm({ newEmail: e.target.value })}
                                    placeholder="newemail@example.com"
                                    className="mt-1"
                                />
                            </div>
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                                ⚠️ Changing your email will update your sign-in credentials immediately. Make sure you have access to the new email.
                            </div>
                            <StatusBanner status={emailStatus} message={emailMsg} />
                            <Button
                                onClick={handleSaveEmail}
                                disabled={emailSaving}
                                className="w-full btn-gold text-white font-medium"
                            >
                                {emailSaving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Updating…
                                    </>
                                ) : (
                                    <>
                                        <Mail className="w-4 h-4 mr-2" />
                                        Update Email
                                    </>
                                )}
                            </Button>
                        </div>
                    </SectionCard>

                    {/* ── Password ────────────────────────────────────────── */}
                    <SectionCard icon={Lock} title="Password" description="Set a new password for your account">
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="newPassword">New Password</Label>
                                <div className="relative mt-1">
                                    <Input
                                        id="newPassword"
                                        type={showPass ? 'text' : 'password'}
                                        value={passForm.newPassword}
                                        onChange={(e) => setPassForm({ ...passForm, newPassword: e.target.value })}
                                        placeholder="Enter new password"
                                        className="pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPass(!showPass)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>

                                {/* Strength bar */}
                                {pwStrength && (
                                    <div className="mt-2 space-y-1">
                                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-300 ${pwStrength.color}`}
                                                style={{ width: `${pwStrength.pct}%` }}
                                            />
                                        </div>
                                        <p className={`text-xs font-medium ${pwStrength.level === 'Strong' ? 'text-green-600'
                                            : pwStrength.level === 'Good' ? 'text-blue-600'
                                                : pwStrength.level === 'Fair' ? 'text-yellow-600'
                                                    : 'text-red-600'
                                            }`}>
                                            Password strength: {pwStrength.level}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                                <div className="relative mt-1">
                                    <Input
                                        id="confirmPassword"
                                        type={showConfirm ? 'text' : 'password'}
                                        value={passForm.confirmPassword}
                                        onChange={(e) => setPassForm({ ...passForm, confirmPassword: e.target.value })}
                                        placeholder="Repeat new password"
                                        className="pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirm(!showConfirm)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {passForm.confirmPassword && passForm.newPassword !== passForm.confirmPassword && (
                                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                                )}
                                {passForm.confirmPassword && passForm.newPassword === passForm.confirmPassword && passForm.newPassword.length >= 6 && (
                                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3" /> Passwords match
                                    </p>
                                )}
                            </div>

                            <StatusBanner status={passStatus} message={passMsg} />

                            <Button
                                onClick={handleSavePassword}
                                disabled={passSaving}
                                className="w-full btn-gold text-white font-medium"
                            >
                                {passSaving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Changing…
                                    </>
                                ) : (
                                    <>
                                        <Lock className="w-4 h-4 mr-2" />
                                        Change Password
                                    </>
                                )}
                            </Button>
                        </div>
                    </SectionCard>
                </div>
            </div>
        </div>
    );
}
