import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as PaystackSdk from 'paystack-sdk';

// Initialize Firebase Admin (Using application default credentials in AI Studio runtime)
initializeApp();
const db = getFirestore();

// Initialize Paystack client lazily
let paystack: PaystackSdk.Paystack | null = null;

function getPaystack(): PaystackSdk.Paystack {
  if (!paystack) {
    const key = process.env.PAYSTACK_SECRET_KEY;
    if (!key) {
      throw new Error('PAYSTACK_SECRET_KEY environment variable is required');
    }
    paystack = new PaystackSdk.Paystack(key);
  }
  return paystack;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  app.use((req, res, next) => {
    console.log("REQUEST RECEIVED:", req.method, req.url);
    next();
  });
  const PORT = 3000;

  app.use(express.json());

  // Request logger
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] [ENV: ${process.env.NODE_ENV}] ${req.method} ${req.url}`);
    next();
  });

   // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Initialize Payment
  app.post("/initialize-payment", async (req, res) => {
    try {
      const { email, amount, metadata } = req.body;
      const response = await getPaystack().transaction.initialize({
        email,
        amount: (amount * 100).toString(), // Paystack uses kobo
        metadata
      });
      res.json(response);
    } catch (error) {
      console.error("Payment initialization error:", error);
      res.status(500).json({ error: "Failed to initialize payment", details: error instanceof Error ? error.message : String(error) });
    }
  });
  
  // Verify Payment
  app.post("/verify-payment", (req, res, next) => {
    console.log("DEBUG: POST /verify-payment hit");
    next();
  }, async (req, res) => {
    try {
      const { reference } = req.body;
      console.log("DEBUG: reference", reference);
      const response = await getPaystack().transaction.verify(reference);
      
      if (response && response.data && response.data.status === 'success') {
        const orderId = response.data.metadata.orderId as string;
        await db.collection('orders').doc(orderId).update({
          status: 'paid',
          paymentDetails: response.data
        });
        res.json({ success: true, data: response.data });
      } else {
        res.status(400).json({ error: "Payment verification failed" });
      }
    } catch (error) {
      console.error("DEBUG: Verify payment error", error);
      res.status(500).json({ error: "Server error during verification" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Catch-all for unmatched requests to debug
  app.use((req, res, next) => {
    console.log('UNMATCHED REQUEST:', req.method, req.url);
    res.status(404).json({ error: "Route not found", url: req.url });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
