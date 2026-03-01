const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require('cors')({ origin: true });
const path = require("path");
const stripePath = path.resolve(__dirname, ".env");
require("dotenv").config({ path: stripePath });

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

const { onCall, HttpsError, onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");

const db = admin.firestore();

const SERVICE_ACCOUNT = "studio-booking-system-cc931@appspot.gserviceaccount.com";

let stripe;

/**
 * Helper to get or create a Stripe Customer for a Firebase User
 */
async function getOrCreateCustomer(uid, email) {
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();

    let customerId = userSnap.data()?.stripeCustomerId;

    if (!customerId) {
        // Create new customer in Stripe
        if (!stripe) {
            const secret = process.env.STRIPE_SECRET_KEY;
            if (!secret) throw new Error("Missing STRIPE_SECRET_KEY");
            stripe = require("stripe")(secret);
        }

        const customer = await stripe.customers.create({
            email: email,
            metadata: {
                firebaseUID: uid
            }
        });
        customerId = customer.id;

        // Save to Firestore
        await userRef.set({ stripeCustomerId: customerId }, { merge: true });
    }
    return customerId;
}

exports.createPaymentIntent = onCall({
    cors: true,
    serviceAccount: SERVICE_ACCOUNT,
    region: "us-central1",
    maxInstances: 10,
}, async (request) => {
    // 1. Data & Identification
    const { amount, currency = "usd", invoiceId, email: guestEmail } = request.data;

    let uid = null;
    let email = guestEmail;

    if (request.auth) {
        uid = request.auth.uid;
        email = request.auth.token.email || email;
    }

    // Fallback email if still missing
    if (!email) {
        email = "guest@example.com";
    }

    // 2. Initialize Stripe
    if (!stripe) {
        const secret = process.env.STRIPE_SECRET_KEY;
        if (!secret) {
            console.error("Stripe secret key missing.");
            throw new HttpsError('internal', 'Configuration error');
        }
        stripe = require("stripe")(secret);
    }

    try {
        // 3. Get or Create Stripe Customer (only for authenticated users)
        let customerId = null;
        if (uid) {
            customerId = await getOrCreateCustomer(uid, email);
        }

        // 4. Create PaymentIntent
        const intentOptions = {
            amount: Math.round(amount), // amount is already in cents
            currency,
            metadata: {
                userId: uid || 'guest',
                invoiceId: invoiceId || 'unknown',
                email: email
            },
            automatic_payment_methods: { enabled: true },
        };

        if (customerId) {
            intentOptions.customer = customerId;
            intentOptions.setup_future_usage = 'off_session'; // Optional: save card for future
        }

        const paymentIntent = await stripe.paymentIntents.create(intentOptions);

        return { clientSecret: paymentIntent.client_secret };
    } catch (error) {
        console.error("Payment Intent Error:", error);
        throw new HttpsError('internal', error.message);
    }
});

exports.handleStripeWebhook = onRequest({
    cors: true,
    serviceAccount: SERVICE_ACCOUNT,
    region: "us-central1",
}, async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripe) {
        const secret = process.env.STRIPE_SECRET_KEY;
        if (!secret) {
            console.error("Stripe secret key missing.");
            res.status(500).send("Configuration error");
            return;
        }
        stripe = require("stripe")(secret);
    }

    let event;

    try {
        if (endpointSecret) {
            event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
        } else {
            console.warn("No Webhook Secret found. Skipping signature verification (Test Mode only).");
            event = req.body;
        }
    } catch (err) {
        console.error(`Webhook Signature Verification Failed: ${err.message}`);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }

    const eventRef = db.collection('payments').doc(event.id);
    const eventSnap = await eventRef.get();
    if (eventSnap.exists) {
        console.log(`Event ${event.id} already processed.`);
        res.json({ received: true });
        return;
    }

    try {
        if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object;
            const { userId, invoiceId } = paymentIntent.metadata;

            console.log(`Payment succeeded for Invoice: ${invoiceId}, User: ${userId}`);

            await eventRef.set({
                eventId: event.id,
                type: event.type,
                paymentIntentId: paymentIntent.id,
                amount: paymentIntent.amount,
                currency: paymentIntent.currency,
                status: paymentIntent.status,
                created: admin.firestore.Timestamp.fromMillis(event.created * 1000),
                userId: userId || null,
                invoiceId: invoiceId || null,
                metadata: paymentIntent.metadata,
                processedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            if (invoiceId && invoiceId !== 'unknown') {
                const invoiceRef = db.collection('invoices').doc(invoiceId);
                const invoiceSnap = await invoiceRef.get();

                if (invoiceSnap.exists) {
                    const invoiceData = invoiceSnap.data();
                    const amountPaid = (invoiceData.amountPaid || 0) + paymentIntent.amount;
                    const balanceDue = Math.max(0, invoiceData.total - amountPaid);
                    const status = balanceDue <= 0 ? 'paid' : 'partial';

                    await invoiceRef.update({
                        status: status,
                        amountPaid: amountPaid,
                        balanceDue: balanceDue,
                        payment: {
                            status: status === 'paid' ? 'paid_in_full' : 'partial',
                            method: 'stripe',
                            paidAt: new Date(),
                            transactionId: paymentIntent.id
                        },
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                    console.log(`Updated Invoice ${invoiceId} to status: ${status}`);
                } else {
                    console.warn(`Invoice ${invoiceId} not found.`);
                }
            }
        }

        res.json({ received: true });
    } catch (err) {
        console.error("Error processing webhook:", err);
        res.status(500).send("Internal Server Error");
    }
});

// ─── UPDATE USER PROFILE ─────────────────────────────────────────────────────
// Allows a user to update their own name, email, and/or password.
// Uses the Admin SDK so email and password changes bypass client-side re-auth issues.
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
    const firestoreUpdates = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Update name fields in Firestore
    if (firstName !== undefined) firestoreUpdates['profile.firstName'] = firstName;
    if (lastName !== undefined) firestoreUpdates['profile.lastName'] = lastName;
    if (phone !== undefined) firestoreUpdates['profile.phone'] = phone;

    // Update email (Auth + Firestore)
    if (newEmail && newEmail.trim()) {
        authUpdates.email = newEmail.trim();
        firestoreUpdates['email'] = newEmail.trim();
    }

    // Update password (Auth only)
    if (newPassword && newPassword.length >= 6) {
        authUpdates.password = newPassword;
    }

    try {
        // Apply Auth updates if any
        if (Object.keys(authUpdates).length > 0) {
            await admin.auth().updateUser(uid, authUpdates);
        }

        // Apply Firestore updates
        await db.collection('users').doc(uid).set(firestoreUpdates, { merge: true });

        return { success: true, message: 'Profile updated successfully.' };
    } catch (error) {
        console.error('updateUserProfile error:', error);
        throw new HttpsError('internal', error.message || 'Failed to update profile.');
    }
});

// ─── MANAGE ADMIN USERS ───────────────────────────────────────────────────────
// Only callable by users with isSuperAdmin: true in Firestore.
// Actions: 'grant' (make user an admin), 'revoke' (demote admin to client),
//          'list' (list all admin users).
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

    // Verify caller is a super admin
    const callerSnap = await db.collection('users').doc(callerUid).get();
    if (!callerSnap.exists || !callerSnap.data().isSuperAdmin) {
        throw new HttpsError('permission-denied', 'Only super admins can manage admin users.');
    }

    const { action, targetEmail, targetUid } = request.data;

    try {
        if (action === 'list') {
            // Return all users with role === 'admin'
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

            // Find user by email
            let authUser;
            try {
                authUser = await admin.auth().getUserByEmail(targetEmail);
            } catch (e) {
                throw new HttpsError('not-found', `No user found with email: ${targetEmail}`);
            }

            // Update Firestore role
            await db.collection('users').doc(authUser.uid).set({
                role: 'admin',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });

            return { success: true, message: `${targetEmail} is now an admin.` };
        }

        if (action === 'revoke') {
            if (!targetUid) throw new HttpsError('invalid-argument', 'targetUid is required.');

            // Prevent revoking another super admin
            const targetSnap = await db.collection('users').doc(targetUid).get();
            if (targetSnap.exists && targetSnap.data().isSuperAdmin) {
                throw new HttpsError('permission-denied', 'Cannot revoke a super admin.');
            }

            // Prevent self-revocation
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
