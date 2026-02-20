import { useState, useEffect, useRef } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { functions } from "@/lib/firebase"; // Ensure firebase.ts exports functions
import { httpsCallable } from "firebase/functions";
import { AlertCircle, Loader2 } from "lucide-react";
import { formatPrice } from "@/data/mockData";

// Initialize Stripe outside of component to avoid recreating stripe object
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface PaymentFormProps {
    amount: number;
    email?: string;
    invoiceId?: string;
    onSuccess: () => void;
}

function CheckoutForm({ amount, onSuccess }: PaymentFormProps) {
    const stripe = useStripe();
    const elements = useElements();
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    // Track component mount status
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setProcessing(true);
        setError(null);

        const { error: submitError } = await elements.submit();

        if (!mounted.current) return;

        if (submitError) {
            setError(submitError.message || "An error occurred");
            setProcessing(false);
            return;
        }

        try {
            // Confirm payment using the client secret from Elements provider
            // Note: We don't need to pass clientSecret to confirmPayment if we used Elements with clientSecret
            const { error: confirmError } = await stripe.confirmPayment({
                elements,
                confirmParams: {
                    return_url: window.location.origin, // You might want a specific success page or handle it inline
                },
                redirect: "if_required", // Handle success without redirect if possible
            });

            if (!mounted.current) return;

            if (confirmError) {
                setError(confirmError.message || "Payment failed");
            } else {
                // Success
                onSuccess();
            }
        } catch (err: any) {
            if (mounted.current) {
                setError(err.message || "An unexpected error occurred");
            }
        } finally {
            if (mounted.current) {
                setProcessing(false);
            }
        }
    };

    return (
        <form onSubmit={handleSubmit} className="w-full space-y-6">
            <PaymentElement />
            {error && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-md text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}
            <Button
                type="submit"
                disabled={!stripe || processing}
                className="w-full btn-gold text-white font-medium"
                size="lg"
            >
                {processing ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                    </>
                ) : (
                    `Pay ${formatPrice(amount)}`
                )}
            </Button>
        </form>
    );
}

export function PaymentForm({ amount, email, invoiceId, onSuccess }: PaymentFormProps) {
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        // Create PaymentIntent as soon as the component loads
        const createIntent = async () => {
            try {
                const createPaymentIntentFunc = httpsCallable(functions, 'createPaymentIntent');
                const result = await createPaymentIntentFunc({ amount, currency: 'usd', invoiceId, email });

                if (!isMounted) return;

                const data = result.data as { clientSecret: string };
                if (data?.clientSecret) {
                    setClientSecret(data.clientSecret);
                } else {
                    console.error("No clientSecret returned from createPaymentIntent");
                    setError("Payment initialization failed: No client secret returned.");
                }
            } catch (err: any) {
                if (!isMounted) return;
                console.error("Error creating payment intent:", err);
                setError(err.message || "Failed to initialize payment. Please try again.");
            }
        };

        createIntent();

        return () => {
            isMounted = false;
        };
    }, [amount, email]);

    if (error) {
        return (
            <div className="text-red-500 bg-red-50 p-4 rounded-lg border border-red-200">
                {error}
            </div>
        );
    }

    if (!clientSecret) {
        return (
            <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 text-[#cbb26a] animate-spin" />
            </div>
        );
    }

    return (
        <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
            <CheckoutForm amount={amount} onSuccess={onSuccess} />
        </Elements>
    );
}
