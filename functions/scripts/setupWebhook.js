const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
    console.error("Error: STRIPE_SECRET_KEY is missing from functions/.env");
    process.exit(1);
}

const stripe = require('stripe')(stripeSecretKey);

const webhookUrl = process.argv[2];

if (!webhookUrl) {
    console.error("Usage: node functions/scripts/setupWebhook.js <WEBHOOK_URL>");
    console.error("Example: node functions/scripts/setupWebhook.js https://us-central1-project-id.cloudfunctions.net/handleStripeWebhook");
    process.exit(1);
}

async function createWebhook() {
    console.log(`Creating webhook endpoint: ${webhookUrl}`);
    try {
        const webhookEndpoint = await stripe.webhookEndpoints.create({
            url: webhookUrl,
            enabled_events: [
                'payment_intent.succeeded',
                // Add other events as needed, e.g., 'checkout.session.completed'
            ],
            description: "Production Webhook for Stripe Integration",
        });

        console.log("\n✅ Webhook created successfully!");
        console.log(`ID: ${webhookEndpoint.id}`);
        console.log(`Signing Secret: ${webhookEndpoint.secret}`);
        console.log("\n⚠️  IMPORTANT: Add this to your functions/.env file:");
        console.log(`STRIPE_WEBHOOK_SECRET=${webhookEndpoint.secret}`);
        console.log("\nThen redeploy your functions to apply the environment variable change.");

    } catch (error) {
        if (error.type === 'StripeInvalidRequestError' && error.message.includes('already exists')) {
            console.log("Webhook endpoint already seems to exist locally or with same URL. Check dashboard.");
        }
        console.error("Error creating webhook:", error.message);
    }
}

createWebhook();
