const functions = require("firebase-functions");
const admin = require("firebase-admin");
const path = require("path");
const stripePath = path.resolve(__dirname, ".env");
require("dotenv").config({ path: stripePath });

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp();
}

const { onCall, HttpsError, onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { setGlobalOptions } = require("firebase-functions/v2");

const db = admin.firestore();

const SERVICE_ACCOUNT = "studio-booking-system-cc931@appspot.gserviceaccount.com";

// ─── Lazy Stripe Init ────────────────────────────────────────────────────────
let stripe;
function getStripe() {
    if (!stripe) {
        const secret = process.env.STRIPE_SECRET_KEY;
        if (!secret) throw new Error("Missing STRIPE_SECRET_KEY");
        stripe = require("stripe")(secret);
    }
    return stripe;
}

// ─── Helper: Get or Create Stripe Customer ───────────────────────────────────
async function getOrCreateCustomer(uid, email) {
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    let customerId = userSnap.data()?.stripeCustomerId;

    if (!customerId) {
        const customer = await getStripe().customers.create({
            email,
            metadata: { firebaseUID: uid }
        });
        customerId = customer.id;
        await userRef.set({ stripeCustomerId: customerId }, { merge: true });
    }
    return customerId;
}

// ─── Helper: Log Activity ────────────────────────────────────────────────────
async function logActivity(entityType, entityId, action, metadata = {}) {
    try {
        await db.collection('activityLogs').add({
            entityType,
            entityId,
            action,
            actorId: 'stripe-webhook',
            actorName: 'Stripe Webhook',
            metadata,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
    } catch (err) {
        console.warn('Failed to write activity log:', err.message);
    }
}

// ─── SECTION 1: createPaymentIntent ─────────────────────────────────────────
// Enhanced with full metadata: bookingId, invoiceId, clientId, paymentOption
exports.createPaymentIntent = onCall({
    cors: true,
    serviceAccount: SERVICE_ACCOUNT,
    region: "us-central1",
    maxInstances: 10,
}, async (request) => {
    const {
        amount,
        currency = "usd",
        invoiceId,
        bookingId,
        clientId,
        paymentOption,
        email: guestEmail
    } = request.data;

    let uid = null;
    let email = guestEmail;

    if (request.auth) {
        uid = request.auth.uid;
        email = request.auth.token.email || email;
    }

    if (!email) email = "guest@example.com";

    // Validate amount
    if (!amount || amount <= 0) {
        throw new HttpsError('invalid-argument', 'Invalid payment amount.');
    }

    try {
        // Get or create Stripe Customer for authenticated users
        let customerId = null;
        if (uid) {
            customerId = await getOrCreateCustomer(uid, email);
        }

        // Resolve clientId — try to look up client doc if not provided
        let resolvedClientId = clientId || null;
        if (!resolvedClientId && uid) {
            const clientSnap = await db.collection('clients')
                .where('userId', '==', uid)
                .limit(1)
                .get();
            if (!clientSnap.empty) {
                resolvedClientId = clientSnap.docs[0].id;
            }
        }

        // Build payment intent options
        const intentOptions = {
            amount: Math.round(amount), // Amount is already in cents
            currency,
            metadata: {
                userId: uid || 'guest',
                email: email,
                invoiceId: invoiceId || '',
                bookingId: bookingId || '',
                clientId: resolvedClientId || '',
                paymentOption: paymentOption || 'full',
            },
            automatic_payment_methods: { enabled: true },
        };

        if (customerId) {
            intentOptions.customer = customerId;
            intentOptions.setup_future_usage = 'off_session';
        }

        const paymentIntent = await getStripe().paymentIntents.create(intentOptions);

        console.log(`Created PaymentIntent ${paymentIntent.id} | invoiceId=${invoiceId} | bookingId=${bookingId}`);
        return { clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id };

    } catch (error) {
        console.error("Payment Intent Error:", error);
        throw new HttpsError('internal', error.message);
    }
});

// ─── SECTION 2: handleStripeWebhook ─────────────────────────────────────────
// Centralized switch-based webhook router
exports.handleStripeWebhook = onRequest({
    cors: true,
    serviceAccount: SERVICE_ACCOUNT,
    region: "us-central1",
}, async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
        if (endpointSecret && sig) {
            event = getStripe().webhooks.constructEvent(req.rawBody, sig, endpointSecret);
        } else {
            // ⚠️ TEST MODE ONLY – remove in production once webhook secret is set
            console.warn("⚠️  No STRIPE_WEBHOOK_SECRET — skipping signature check (TEST MODE).");
            event = req.body;
        }
    } catch (err) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // ─── Idempotency Check ───────────────────────────────────────────────────
    const eventRef = db.collection('webhookEvents').doc(event.id);
    const eventSnap = await eventRef.get();
    if (eventSnap.exists) {
        console.log(`Event ${event.id} already processed — skipping.`);
        return res.json({ received: true, duplicate: true });
    }

    // Mark event as processing immediately to prevent race conditions
    await eventRef.set({
        eventId: event.id,
        type: event.type,
        receivedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'processing'
    });

    try {
        // ─── Central Webhook Router ──────────────────────────────────────────
        switch (event.type) {

            // ─── 1. Payment Succeeded ────────────────────────────────────────
            case 'payment_intent.succeeded':
                await handlePaymentSucceeded(event);
                break;

            // ─── 2. Payment Failed ────────────────────────────────────────────
            case 'payment_intent.payment_failed':
                await handlePaymentFailed(event);
                break;

            // ─── 3. Charge Refunded ───────────────────────────────────────────
            case 'charge.refunded':
                await handleChargeRefunded(event);
                break;

            // ─── 4. Payment Method Attached ───────────────────────────────────
            case 'payment_method.attached':
                await handlePaymentMethodAttached(event);
                break;

            // ─── 5. Invoice Paid (Stripe Billing) ─────────────────────────────
            case 'invoice.paid':
                await handleStripInvoicePaid(event);
                break;

            // ─── 6. Invoice Payment Failed (Stripe Billing) ───────────────────
            case 'invoice.payment_failed':
                await handleStripeInvoicePaymentFailed(event);
                break;

            // ─── 7. Checkout Session Completed (Future) ───────────────────────
            case 'checkout.session.completed':
                await handleCheckoutSessionCompleted(event);
                break;

            default:
                console.log(`Unhandled Stripe event type: ${event.type}`);
        }

        // Mark event as successfully processed
        await eventRef.update({ status: 'processed', processedAt: admin.firestore.FieldValue.serverTimestamp() });
        res.json({ received: true });

    } catch (err) {
        console.error(`Error processing webhook event ${event.id}:`, err);
        await eventRef.update({ status: 'error', error: err.message });
        res.status(500).send("Internal Server Error");
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// ██  WEBHOOK HANDLER IMPLEMENTATIONS
// ═══════════════════════════════════════════════════════════════════════════

// ─── 1. payment_intent.succeeded ─────────────────────────────────────────────
async function handlePaymentSucceeded(event) {
    const paymentIntent = event.data.object;
    const {
        userId,
        email,
        invoiceId,
        bookingId,
        clientId,
        paymentOption
    } = paymentIntent.metadata;

    console.log(`💳 Payment succeeded: ${paymentIntent.id} | invoice=${invoiceId} | booking=${bookingId}`);

    const batch = db.batch();

    // ── 1a. Write to payments collection ──────────────────────────────────────
    const paymentDocRef = db.collection('payments').doc(paymentIntent.id);
    batch.set(paymentDocRef, {
        eventId: event.id,
        paymentIntentId: paymentIntent.id,
        type: event.type,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        created: admin.firestore.Timestamp.fromMillis(event.created * 1000),
        userId: userId || null,
        invoiceId: invoiceId || null,
        bookingId: bookingId || null,
        clientId: clientId || null,
        paymentOption: paymentOption || null,
        metadata: paymentIntent.metadata,
        processedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await batch.commit();

    // ── 1b. Update Invoice ────────────────────────────────────────────────────
    if (invoiceId && invoiceId !== '') {
        await updateInvoiceOnPayment(invoiceId, paymentIntent);
    }

    // ── 1c. Update Booking status → confirmed ─────────────────────────────────
    if (bookingId && bookingId !== '') {
        await updateBookingOnPayment(bookingId, paymentIntent, paymentOption);
    }

    // ── 1d. Update Client revenue & booking count ─────────────────────────────
    if (clientId && clientId !== '') {
        await updateClientStats(clientId, paymentIntent.amount);
    }

    await logActivity('payment', paymentIntent.id, 'payment_succeeded', {
        invoiceId, bookingId, clientId, amount: paymentIntent.amount
    });
}

// ─── 2. payment_intent.payment_failed ────────────────────────────────────────
async function handlePaymentFailed(event) {
    const paymentIntent = event.data.object;
    const { invoiceId, bookingId, clientId } = paymentIntent.metadata;
    const failureReason = paymentIntent.last_payment_error?.message || 'Unknown reason';

    console.log(`❌ Payment failed: ${paymentIntent.id} | reason: ${failureReason}`);

    // Store failed payment record
    await db.collection('payments').doc(paymentIntent.id).set({
        eventId: event.id,
        paymentIntentId: paymentIntent.id,
        type: event.type,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: 'failed',
        failureReason: failureReason,
        created: admin.firestore.Timestamp.fromMillis(event.created * 1000),
        userId: paymentIntent.metadata.userId || null,
        invoiceId: invoiceId || null,
        bookingId: bookingId || null,
        clientId: clientId || null,
        metadata: paymentIntent.metadata,
        processedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update Booking payment status to failed
    if (bookingId && bookingId !== '') {
        try {
            await db.collection('bookings').doc(bookingId).update({
                'payment.status': 'failed',
                'payment.failureReason': failureReason,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`Updated booking ${bookingId} payment status → failed`);
        } catch (err) {
            console.warn(`Could not update booking ${bookingId}:`, err.message);
        }
    }

    // Update Invoice back to 'sent' (unpaid) if it was partially updated
    if (invoiceId && invoiceId !== '') {
        try {
            const invoiceSnap = await db.collection('invoices').doc(invoiceId).get();
            if (invoiceSnap.exists) {
                await db.collection('invoices').doc(invoiceId).update({
                    'payment.status': 'failed',
                    'payment.failureReason': failureReason,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                console.log(`Updated invoice ${invoiceId} payment status → failed`);
            }
        } catch (err) {
            console.warn(`Could not update invoice ${invoiceId}:`, err.message);
        }
    }

    await logActivity('payment', paymentIntent.id, 'payment_failed', {
        invoiceId, bookingId, reason: failureReason, amount: paymentIntent.amount
    });
}

// ─── 3. charge.refunded ──────────────────────────────────────────────────────
async function handleChargeRefunded(event) {
    const charge = event.data.object;

    // Fetch the payment intent to get our metadata
    let invoiceId = null;
    let bookingId = null;
    let clientId = null;

    if (charge.payment_intent) {
        try {
            const pi = await getStripe().paymentIntents.retrieve(charge.payment_intent);
            invoiceId = pi.metadata?.invoiceId || null;
            bookingId = pi.metadata?.bookingId || null;
            clientId = pi.metadata?.clientId || null;
        } catch (err) {
            console.warn('Could not retrieve PaymentIntent for charge:', err.message);
        }
    }

    const refundedAmount = charge.amount_refunded; // total cumulative refunded in cents
    const refundedFull = charge.refunded;        // boolean: fully refunded
    const refundAmountDollars = refundedAmount; // stored in cents

    console.log(`🔄 Charge refunded: ${charge.id} | amount=${refundedAmount} | full=${refundedFull}`);

    // Store refund record in payments collection
    const refundRef = db.collection('payments').doc(`refund_${charge.id}`);
    await refundRef.set({
        eventId: event.id,
        chargeId: charge.id,
        paymentIntentId: charge.payment_intent || null,
        type: event.type,
        amount: -refundedAmount, // negative to indicate refund
        currency: charge.currency,
        status: 'refunded',
        refundedAmount: refundedAmount,
        isFullRefund: refundedFull,
        invoiceId: invoiceId || null,
        bookingId: bookingId || null,
        clientId: clientId || null,
        created: admin.firestore.Timestamp.fromMillis(event.created * 1000),
        processedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update Invoice financials
    if (invoiceId && invoiceId !== '') {
        try {
            const invoiceSnap = await db.collection('invoices').doc(invoiceId).get();
            if (invoiceSnap.exists) {
                const invoiceData = invoiceSnap.data();
                const currentAmountPaid = invoiceData.amountPaid || 0;
                const invoiceTotal = invoiceData.total || 0;

                // New amountPaid = previously paid − the refunded amount
                const newAmountPaid = Math.max(0, currentAmountPaid - refundedAmount);
                const newBalanceDue = Math.max(0, invoiceTotal - newAmountPaid);

                let newStatus;
                if (refundedFull) {
                    newStatus = 'cancelled';
                } else if (newAmountPaid > 0) {
                    newStatus = 'partial';
                } else {
                    newStatus = 'sent';
                }

                await db.collection('invoices').doc(invoiceId).update({
                    amountPaid: newAmountPaid,
                    balanceDue: newBalanceDue,
                    status: newStatus,
                    'payment.status': refundedFull ? 'refunded' : 'partial',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                console.log(`Updated invoice ${invoiceId}: amountPaid=${newAmountPaid}, balanceDue=${newBalanceDue}, status=${newStatus}`);
            }
        } catch (err) {
            console.error(`Error updating invoice ${invoiceId} for refund:`, err);
        }
    }

    // Update Booking payment status
    if (bookingId && bookingId !== '') {
        try {
            await db.collection('bookings').doc(bookingId).update({
                'payment.status': refundedFull ? 'refunded' : 'deposit_paid',
                status: refundedFull ? 'cancelled' : undefined,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // If client exists, reverse the revenue
            if (clientId && clientId !== '' && refundedAmount > 0) {
                await db.collection('clients').doc(clientId).update({
                    totalRevenue: admin.firestore.FieldValue.increment(-refundedAmount),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                console.log(`Reversed ${refundedAmount} revenue for client ${clientId}`);
            }
        } catch (err) {
            console.warn(`Could not update booking ${bookingId} for refund:`, err.message);
        }
    }

    await logActivity('payment', charge.id, 'charge_refunded', {
        invoiceId, bookingId, clientId, refundedAmount, isFullRefund: refundedFull
    });
}

// ─── 4. payment_method.attached ──────────────────────────────────────────────
async function handlePaymentMethodAttached(event) {
    const paymentMethod = event.data.object;
    const customerId = paymentMethod.customer;

    if (!customerId) {
        console.log('payment_method.attached: no customer — skipping.');
        return;
    }

    console.log(`💳 Payment method attached: ${paymentMethod.id} to customer ${customerId}`);

    // Find user by stripeCustomerId and save the payment method
    try {
        const usersSnap = await db.collection('users')
            .where('stripeCustomerId', '==', customerId)
            .limit(1)
            .get();

        if (!usersSnap.empty) {
            const userDoc = usersSnap.docs[0];
            const uid = userDoc.id;

            await userDoc.ref.update({
                defaultPaymentMethodId: paymentMethod.id,
                paymentMethodType: paymentMethod.type,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Also update client record
            const clientSnap = await db.collection('clients')
                .where('userId', '==', uid)
                .limit(1)
                .get();

            if (!clientSnap.empty) {
                await clientSnap.docs[0].ref.update({
                    defaultPaymentMethodId: paymentMethod.id,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }

            console.log(`Saved payment method ${paymentMethod.id} for user ${uid}`);
        } else {
            console.warn(`No user found for Stripe customer ${customerId}`);
        }
    } catch (err) {
        console.error('Error handling payment_method.attached:', err);
    }
}

// ─── 5. invoice.paid (Stripe Billing - subscription invoices) ─────────────────
async function handleStripInvoicePaid(event) {
    const stripeInvoice = event.data.object;
    console.log(`📄 Stripe invoice paid: ${stripeInvoice.id}`);

    // Store a record
    await db.collection('payments').doc(`stripe_invoice_${stripeInvoice.id}`).set({
        eventId: event.id,
        type: event.type,
        stripeInvoiceId: stripeInvoice.id,
        amount: stripeInvoice.amount_paid,
        currency: stripeInvoice.currency,
        status: 'paid',
        customerId: stripeInvoice.customer,
        created: admin.firestore.Timestamp.fromMillis(event.created * 1000),
        processedAt: admin.firestore.FieldValue.serverTimestamp()
    });
}

// ─── 6. invoice.payment_failed (Stripe Billing) ──────────────────────────────
async function handleStripeInvoicePaymentFailed(event) {
    const stripeInvoice = event.data.object;
    console.log(`📄 Stripe invoice payment failed: ${stripeInvoice.id}`);

    await db.collection('payments').doc(`stripe_invoice_failed_${stripeInvoice.id}`).set({
        eventId: event.id,
        type: event.type,
        stripeInvoiceId: stripeInvoice.id,
        amount: stripeInvoice.amount_due,
        currency: stripeInvoice.currency,
        status: 'failed',
        customerId: stripeInvoice.customer,
        created: admin.firestore.Timestamp.fromMillis(event.created * 1000),
        processedAt: admin.firestore.FieldValue.serverTimestamp()
    });
}

// ─── 7. checkout.session.completed (future Stripe Checkout support) ───────────
async function handleCheckoutSessionCompleted(event) {
    const session = event.data.object;
    const { invoiceId, bookingId, clientId } = session.metadata || {};

    console.log(`🛒 Checkout session completed: ${session.id}`);

    await db.collection('payments').doc(`checkout_${session.id}`).set({
        eventId: event.id,
        type: event.type,
        sessionId: session.id,
        amount: session.amount_total,
        currency: session.currency,
        status: session.payment_status,
        invoiceId: invoiceId || null,
        bookingId: bookingId || null,
        clientId: clientId || null,
        created: admin.firestore.Timestamp.fromMillis(event.created * 1000),
        processedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // If payment succeeded through checkout, mirror the succeeded logic
    if (session.payment_status === 'paid' && session.payment_intent) {
        try {
            const pi = await getStripe().paymentIntents.retrieve(session.payment_intent);
            if (invoiceId) await updateInvoiceOnPayment(invoiceId, pi);
            if (bookingId) await updateBookingOnPayment(bookingId, pi, 'full');
            if (clientId) await updateClientStats(clientId, session.amount_total);
        } catch (err) {
            console.error('Error mirroring checkout session payment:', err);
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ██  SHARED HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

// ── Update Invoice after successful payment ───────────────────────────────────
async function updateInvoiceOnPayment(invoiceId, paymentIntent) {
    try {
        const invoiceRef = db.collection('invoices').doc(invoiceId);
        const invoiceSnap = await invoiceRef.get();

        if (!invoiceSnap.exists) {
            console.warn(`Invoice ${invoiceId} not found.`);
            return;
        }

        const invoiceData = invoiceSnap.data();
        const amountPaid = (invoiceData.amountPaid || 0) + paymentIntent.amount;
        const total = invoiceData.total || 0;
        const balanceDue = Math.max(0, total - amountPaid);
        const status = balanceDue <= 0 ? 'paid' : 'partial';

        await invoiceRef.update({
            status,
            amountPaid,
            balanceDue,
            payment: {
                status: status === 'paid' ? 'paid_in_full' : 'partial',
                method: 'stripe',
                paidAt: admin.firestore.FieldValue.serverTimestamp(),
                transactionId: paymentIntent.id
            },
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`Updated invoice ${invoiceId}: amountPaid=${amountPaid}, status=${status}`);
    } catch (err) {
        console.error(`Error updating invoice ${invoiceId}:`, err);
    }
}

// ── Update Booking after successful payment ───────────────────────────────────
async function updateBookingOnPayment(bookingId, paymentIntent, paymentOption) {
    try {
        const bookingRef = db.collection('bookings').doc(bookingId);
        const bookingSnap = await bookingRef.get();

        if (!bookingSnap.exists) {
            console.warn(`Booking ${bookingId} not found.`);
            return;
        }

        const paymentStatus = paymentOption === 'deposit' ? 'deposit_paid' : 'paid_in_full';

        await bookingRef.update({
            status: 'confirmed',
            'payment.status': paymentStatus,
            'payment.method': 'stripe',
            'payment.paidAt': admin.firestore.FieldValue.serverTimestamp(),
            'payment.transactionId': paymentIntent.id,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`Booking ${bookingId} confirmed, payment status=${paymentStatus}`);
    } catch (err) {
        console.error(`Error updating booking ${bookingId}:`, err);
    }
}

// ── Update Client stats after successful payment ──────────────────────────────
async function updateClientStats(clientId, amountInCents) {
    try {
        const clientRef = db.collection('clients').doc(clientId);
        const clientSnap = await clientRef.get();

        if (!clientSnap.exists) {
            console.warn(`Client ${clientId} not found.`);
            return;
        }

        await clientRef.update({
            totalRevenue: admin.firestore.FieldValue.increment(amountInCents),
            totalBookings: admin.firestore.FieldValue.increment(1),
            lastBookingDate: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`Updated client ${clientId}: +${amountInCents} revenue, +1 booking`);
    } catch (err) {
        console.error(`Error updating client ${clientId} stats:`, err);
    }
}

// ─── SECTION 3: Scheduled Function — Mark Overdue Invoices ──────────────────
// Runs every day at 9 AM UTC and marks past-due invoices as 'overdue'
exports.markOverdueInvoices = onSchedule({
    schedule: "0 9 * * *",
    timeZone: "America/Phoenix",
    serviceAccount: SERVICE_ACCOUNT,
    region: "us-central1",
}, async (event) => {
    console.log("Running markOverdueInvoices scheduled job...");

    const now = admin.firestore.Timestamp.now();

    try {
        // Find all sent/partial invoices whose dueDate is in the past
        const overdueSnap = await db.collection('invoices')
            .where('status', 'in', ['sent', 'partial'])
            .where('dueDate', '<', now)
            .get();

        if (overdueSnap.empty) {
            console.log("No overdue invoices found.");
            return;
        }

        const batchSize = 500;
        let batch = db.batch();
        let ops = 0;

        for (const doc of overdueSnap.docs) {
            batch.update(doc.ref, {
                status: 'overdue',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            ops++;

            if (ops >= batchSize) {
                await batch.commit();
                batch = db.batch();
                ops = 0;
            }
        }

        if (ops > 0) await batch.commit();

        console.log(`Marked ${overdueSnap.size} invoice(s) as overdue.`);
    } catch (err) {
        console.error("Error in markOverdueInvoices:", err);
    }
});

// ─── UPDATE USER PROFILE ─────────────────────────────────────────────────────
exports.updateUserProfile = onCall({
    cors: true,
    serviceAccount: SERVICE_ACCOUNT,
    region: "us-central1",
    maxInstances: 10,
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'You must be logged in.');
    }

    const uid = request.auth.uid;
    const { firstName, lastName, phone, newEmail, newPassword } = request.data;

    const authUpdates = {};
    const firestoreUpdates = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };

    if (firstName !== undefined) firestoreUpdates['profile.firstName'] = firstName;
    if (lastName !== undefined) firestoreUpdates['profile.lastName'] = lastName;
    if (phone !== undefined) firestoreUpdates['profile.phone'] = phone;

    if (newEmail && newEmail.trim()) {
        authUpdates.email = newEmail.trim();
        firestoreUpdates['email'] = newEmail.trim();
    }

    if (newPassword && newPassword.length >= 6) {
        authUpdates.password = newPassword;
    }

    try {
        if (Object.keys(authUpdates).length > 0) {
            await admin.auth().updateUser(uid, authUpdates);
        }
        await db.collection('users').doc(uid).set(firestoreUpdates, { merge: true });
        return { success: true, message: 'Profile updated successfully.' };
    } catch (error) {
        console.error('updateUserProfile error:', error);
        throw new HttpsError('internal', error.message || 'Failed to update profile.');
    }
});

// ─── MANAGE ADMIN USERS ───────────────────────────────────────────────────────
exports.manageAdmin = onCall({
    cors: true,
    serviceAccount: SERVICE_ACCOUNT,
    region: "us-central1",
    maxInstances: 10,
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'You must be logged in.');
    }

    const callerUid = request.auth.uid;
    const callerSnap = await db.collection('users').doc(callerUid).get();
    if (!callerSnap.exists || !callerSnap.data().isSuperAdmin) {
        throw new HttpsError('permission-denied', 'Only super admins can manage admin users.');
    }

    const { action, targetEmail, targetUid } = request.data;

    try {
        if (action === 'list') {
            const snap = await db.collection('users').where('role', '==', 'admin').get();
            const admins = snap.docs.map(d => ({
                id: d.id,
                email: d.data().email,
                firstName: d.data().profile?.firstName || '',
                lastName: d.data().profile?.lastName || '',
                isSuperAdmin: d.data().isSuperAdmin || false,
                createdAt: d.data().createdAt?.toDate?.() || null,
            }));
            return { success: true, admins };
        }

        if (action === 'grant') {
            if (!targetEmail) throw new HttpsError('invalid-argument', 'targetEmail is required.');
            let authUser;
            try {
                authUser = await admin.auth().getUserByEmail(targetEmail);
            } catch (e) {
                throw new HttpsError('not-found', `No user found with email: ${targetEmail}`);
            }
            await db.collection('users').doc(authUser.uid).set({
                role: 'admin',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
            return { success: true, message: `${targetEmail} is now an admin.` };
        }

        if (action === 'revoke') {
            if (!targetUid) throw new HttpsError('invalid-argument', 'targetUid is required.');
            const targetSnap = await db.collection('users').doc(targetUid).get();
            if (targetSnap.exists && targetSnap.data().isSuperAdmin) {
                throw new HttpsError('permission-denied', 'Cannot revoke a super admin.');
            }
            if (targetUid === callerUid) {
                throw new HttpsError('permission-denied', 'You cannot revoke your own admin access.');
            }
            await db.collection('users').doc(targetUid).set({
                role: 'client',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
            return { success: true, message: 'Admin access revoked.' };
        }

        throw new HttpsError('invalid-argument', `Unknown action: ${action}`);
    } catch (error) {
        if (error instanceof HttpsError) throw error;
        console.error('manageAdmin error:', error);
        throw new HttpsError('internal', error.message || 'Operation failed.');
    }
});
