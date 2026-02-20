const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, 'functions/.env') });

const stripeKey = process.env.STRIPE_SECRET_KEY;
console.log("Stripe Key Present:", !!stripeKey);

if (!stripeKey) {
    console.error("Missing STRIPE_SECRET_KEY");
    process.exit(1);
}

const stripe = require('stripe')(stripeKey);

(async () => {
    try {
        console.log("Checking Stripe API...");
        const customers = await stripe.customers.list({ limit: 1 });
        console.log("Stripe Connection OK. Found " + customers.data.length + " customers.");
    } catch (e) {
        console.error("Stripe Error:", e.message);
    }
})();
