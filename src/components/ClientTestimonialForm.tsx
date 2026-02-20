import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Star, Loader2 } from 'lucide-react';
import { useStore } from '@/hooks/useStore';
import type { User } from '@/types';

// Client Testimonial Form Component
export function ClientTestimonialForm({ user }: { user: User }) {
    const { userSubmitTestimonial } = useStore();
    const [rating, setRating] = useState(5);
    const [content, setContent] = useState('');
    const [company, setCompany] = useState(user.profile.company || '');
    const [role, setRole] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content) return;

        setSubmitting(true);
        try {
            await userSubmitTestimonial({
                name: `${user.profile.firstName} ${user.profile.lastName}`,
                role: role || 'Client',
                company: company || 'Private Client',
                content,
                rating,
                avatar: user.profile.avatar || '',
                category: 'Real Estate', // Default category, maybe add selector later
            });
            setSubmitted(true);
        } catch (error) {
            // Error handled in store
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <Card>
                <CardContent className="pt-6 text-center py-12">
                    <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <Star className="w-6 h-6 text-green-600 fill-green-600" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Thank You!</h3>
                    <p className="text-muted-foreground mb-6">
                        Your testimonial has been submitted for review. It will appear on our site once approved.
                    </p>
                    <Button variant="outline" onClick={() => { setSubmitted(false); setContent(''); }}>
                        Submit Another
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Share Your Experience</CardTitle>
                <CardDescription>
                    We value your feedback! Rate your experience with us.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Rating */}
                    <div>
                        <Label className="mb-2 block">Rating</Label>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    className="focus:outline-none transition-transform hover:scale-110"
                                >
                                    <Star
                                        className={`w-8 h-8 ${star <= rating ? 'fill-[#cbb26a] text-[#cbb26a]' : 'text-gray-300'
                                            }`}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="company">Company (Optional)</Label>
                            <Input
                                id="company"
                                value={company}
                                onChange={(e) => setCompany(e.target.value)}
                                placeholder="e.g. Compass Realty"
                            />
                        </div>
                        <div>
                            <Label htmlFor="role">Role (Optional)</Label>
                            <Input
                                id="role"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                placeholder="e.g. Real Estate Agent"
                            />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="content">Your Review</Label>
                        <Textarea
                            id="content"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Tell us about your experience working with us..."
                            rows={4}
                            required
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={submitting || !content}
                        className="w-full btn-gold text-white font-medium"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            'Submit Testimonial'
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
