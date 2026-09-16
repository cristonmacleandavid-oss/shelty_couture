require("dotenv").config();
const express = require("express");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
const { newDb } = require("pg-mem");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-me";
const PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${PORT}`;

const LOCAL_MODE = !process.env.DATABASE_URL;

let pool;
if (LOCAL_MODE) {
  // Local development mode: use an in-memory PostgreSQL-compatible database.
  // No PostgreSQL installation or DATABASE_URL is required on your computer.
  const localDb = newDb({ autoCreateForeignKeyIndices: true });
  const pg = localDb.adapters.createPg();
  pool = new pg.Pool();
  console.log("LOCAL DEVELOPMENT MODE: using an in-memory database.");
  console.log("Data will reset when the server restarts. Configure DATABASE_URL for production.");
} else {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: !process.env.DATABASE_URL.includes("localhost")
      ? { rejectUnauthorized: false }
      : false
  });
}

app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
  if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) return cb(null, true);
  cb(new Error("Only JPG, PNG, WEBP or GIF images are allowed."));
} });
app.use(express.static(path.join(__dirname, "public")));

async function query(text, params = []) {
  return pool.query(text, params);
}

async function initDb() {

  await query(`
    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      gender TEXT NOT NULL DEFAULT 'Unisex',
      product_type TEXT NOT NULL DEFAULT 'Ready-to-Wear',
      clothing_type TEXT NOT NULL DEFAULT 'Other',
      price INTEGER NOT NULL DEFAULT 0,
      description TEXT DEFAULT '',
      sizes TEXT DEFAULT '',
      colors TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      featured BOOLEAN DEFAULT FALSE,
      stock INTEGER DEFAULT 0,
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      reference TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT DEFAULT '',
      city TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      items JSONB NOT NULL,
      amount INTEGER NOT NULL,
      currency TEXT DEFAULT 'GHS',
      payment_status TEXT DEFAULT 'pending',
      order_status TEXT DEFAULT 'pending',
      paystack_transaction_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      service TEXT NOT NULL,
      appointment_date DATE NOT NULL,
      appointment_time TEXT NOT NULL,
      message TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tailoring_requests (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      garment_type TEXT NOT NULL,
      occasion TEXT DEFAULT '',
      preferred_date TEXT DEFAULT '',
      budget TEXT DEFAULT '',
      measurements TEXT DEFAULT '',
      fabric TEXT DEFAULT '',
      message TEXT DEFAULT '',
      status TEXT DEFAULT 'new',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS student_applications (
      id SERIAL PRIMARY KEY,
      full_name TEXT NOT NULL,
      gender TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      city TEXT DEFAULT '',
      duration TEXT NOT NULL,
      program TEXT NOT NULL,
      experience TEXT DEFAULT '',
      start_date TEXT DEFAULT '',
      message TEXT DEFAULT '',
      status TEXT DEFAULT 'new',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  const adminEmail = (process.env.ADMIN_EMAIL || "sheltycouture@gmail.com").trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "Shelty1234!";
  if (!LOCAL_MODE && (!process.env.JWT_SECRET || !process.env.ADMIN_PASSWORD)) {
    throw new Error("Production requires JWT_SECRET and ADMIN_PASSWORD environment variables.");
  }
  const existing = await query("SELECT id FROM admins WHERE LOWER(email) = $1", [adminEmail]);
  const hash = await bcrypt.hash(adminPassword, 12);
  if (!existing.rowCount) {
    await query("INSERT INTO admins (email, password_hash) VALUES ($1, $2)", [adminEmail, hash]);
    console.log(`Created admin account: ${adminEmail}`);
  } else {
    await query("UPDATE admins SET email=$1, password_hash=$2 WHERE id=$3", [adminEmail, hash, existing.rows[0].id]);
    console.log(`Admin account ready: ${adminEmail}`);
  }

  const count = await query("SELECT COUNT(*)::int AS count FROM products");
  if (count.rows[0].count === 0) {
    const samples = [
      ["Emerald Signature Gown", "Women", 0, "A made-to-measure statement gown with elegant structure and a refined silhouette.", "XS,S,M,L,XL", "Emerald, Ivory", "https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=900&q=85", true, 0],
      ["Modern Classic Suit", "Men", 0, "Sharp tailoring for weddings, corporate events and formal occasions.", "S,M,L,XL,XXL", "Black, Navy, Charcoal", "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=900&q=85", true, 0],
      ["Heritage African Set", "African Wear", 0, "Contemporary African tailoring designed around your measurements and personal style.", "XS,S,M,L,XL", "Custom", "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=900&q=85", true, 0],
      ["Atelier Evening Dress", "Women", 0, "An elegant occasion piece available through custom order.", "XS,S,M,L,XL", "Custom", "https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=900&q=85", false, 0],
      ["Executive Bespoke Shirt", "Men", 0, "Clean lines and a personalized fit for the modern gentleman.", "S,M,L,XL,XXL", "White, Black, Blue", "https://images.unsplash.com/photo-1598808503746-f34c53b9323e?auto=format&fit=crop&w=900&q=85", false, 0],
      ["Bridal Couture Consultation", "Custom", 0, "Begin your bridal journey with a one-on-one design consultation.", "Custom", "Custom", "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=85", true, 0]
    ];
    for (const p of samples) {
      await query(
        `INSERT INTO products (name,category,price,description,sizes,colors,image_url,featured,stock)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        p
      );
    }
  }
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Authentication required" });
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
}

function makeReference() {
  return `SHELTY-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

async function paystack(pathname, options = {}) {
  if (!process.env.PAYSTACK_SECRET_KEY) throw new Error("PAYSTACK_SECRET_KEY is not configured");
  const response = await fetch(`https://api.paystack.co${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const data = await response.json();
  if (!response.ok || !data.status) {
    throw new Error(data.message || "Paystack request failed");
  }
  return data;
}

app.get("/api/health", async (req, res) => {
  try {
    await query("SELECT 1");
    res.json({ ok: true, service: "Shelty Couture", database: "connected" });
  } catch (e) {
    res.status(503).json({ ok: false, error: e.message });
  }
});

app.get("/api/products", async (req, res) => {
  const { category, gender, product_type, clothing_type, search, featured } = req.query;
  const params = [];
  const where = ["active = TRUE"];

  if (category && category !== "All") {
    params.push(category);
    where.push(`category = $${params.length}`);
  }
  if (gender && gender !== "All") {
    params.push(gender);
    where.push(`gender = $${params.length}`);
  }
  if (product_type && product_type !== "All") {
    params.push(product_type);
    where.push(`product_type = $${params.length}`);
  }
  if (clothing_type && clothing_type !== "All") {
    params.push(clothing_type);
    where.push(`clothing_type = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    where.push(`(name ILIKE $${params.length} OR description ILIKE $${params.length})`);
  }
  if (featured === "true") where.push("featured = TRUE");

  const result = await query(
    `SELECT * FROM products WHERE ${where.join(" AND ")} ORDER BY featured DESC, created_at DESC`,
    params
  );
  res.json(result.rows);
});

app.get("/api/products/:id", async (req, res) => {
  const result = await query("SELECT * FROM products WHERE id = $1 AND active = TRUE", [req.params.id]);
  if (!result.rowCount) return res.status(404).json({ error: "Product not found" });
  res.json(result.rows[0]);
});

app.post("/api/appointments", async (req, res) => {
  const { name, email, phone, service, appointment_date, appointment_time, message } = req.body;
  if (!name || !email || !phone || !service || !appointment_date || !appointment_time) {
    return res.status(400).json({ error: "Please complete all required appointment fields." });
  }
  const result = await query(
    `INSERT INTO appointments (name,email,phone,service,appointment_date,appointment_time,message)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [name, email, phone, service, appointment_date, appointment_time, message || ""]
  );
  res.status(201).json({ success: true, id: result.rows[0].id });
});


app.post("/api/student-applications", async (req, res) => {
  const { full_name, gender, email, phone, city, duration, program, experience, start_date, message } = req.body;
  const allowedDurations = ["6 Months", "1 Year", "18 Months", "2 Years"];
  const allowedGenders = ["Female", "Male"];
  if (!full_name || !gender || !email || !phone || !duration || !program) {
    return res.status(400).json({ error: "Please complete all required application fields." });
  }
  if (!allowedDurations.includes(duration) || !allowedGenders.includes(gender)) {
    return res.status(400).json({ error: "Please select a valid gender and training duration." });
  }
  const result = await query(
    `INSERT INTO student_applications
      (full_name,gender,email,phone,city,duration,program,experience,start_date,message)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
    [full_name, gender, email, phone, city || "", duration, program, experience || "", start_date || "", message || ""]
  );
  res.status(201).json({ success: true, id: result.rows[0].id });
});

app.post("/api/tailoring-requests", async (req, res) => {
  const { name, email, phone, garment_type, occasion, preferred_date, budget, measurements, fabric, message } = req.body;
  if (!name || !email || !phone || !garment_type) {
    return res.status(400).json({ error: "Please complete the required fields." });
  }
  const result = await query(
    `INSERT INTO tailoring_requests
    (name,email,phone,garment_type,occasion,preferred_date,budget,measurements,fabric,message)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
    [name,email,phone,garment_type,occasion||"",preferred_date||"",budget||"",measurements||"",fabric||"",message||""]
  );
  res.status(201).json({ success: true, id: result.rows[0].id });
});

app.post("/api/orders", async (req, res) => {
  const { customer, items, amount, notes } = req.body;
  if (!customer?.name || !customer?.email || !customer?.phone || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: "Customer and cart details are required." });
  }

  const requestedIds = [...new Set(items.map(item => Number(item.id)).filter(Number.isInteger))];
  if (!requestedIds.length || requestedIds.length !== items.length) {
    return res.status(400).json({ error: "Invalid cart items." });
  }

  const productsResult = await query(
    "SELECT id, name, price, stock, active FROM products WHERE id = ANY($1::int[])",
    [requestedIds]
  );
  const productsById = new Map(productsResult.rows.map(p => [Number(p.id), p]));

  let expected = 0;
  const validatedItems = [];
  for (const item of items) {
    const product = productsById.get(Number(item.id));
    const quantity = Number(item.quantity);
    if (!product || !product.active || !Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ error: "One or more cart items are no longer available." });
    }
    if (Number(product.price) <= 0) {
      return res.status(400).json({ error: `${product.name} is not available for online checkout.` });
    }
    if (Number(product.stock) < quantity) {
      return res.status(400).json({ error: `${product.name} does not have enough stock.` });
    }
    expected += Number(product.price) * quantity;
    validatedItems.push({
      id: Number(product.id),
      name: product.name,
      price: Number(product.price),
      image_url: item.image_url || "",
      quantity
    });
  }

  if (Number(amount) !== expected || expected <= 0) {
    return res.status(400).json({ error: "Order amount validation failed." });
  }

  const reference = makeReference();
  await query(
    `INSERT INTO orders
    (reference,customer_name,email,phone,address,city,notes,items,amount)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      reference, customer.name, customer.email, customer.phone,
      customer.address || "", customer.city || "", notes || "",
      JSON.stringify(validatedItems), expected
    ]
  );

  if (LOCAL_MODE) {
    // Keep local testing independent of Paystack credentials.
    res.status(201).json({
      success: true,
      local_mode: true,
      reference,
      authorization_url: `/payment-success.html?status=success&reference=${encodeURIComponent(reference)}&local=1`
    });
    return;
  }

  try {
    const payment = await paystack("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        email: customer.email,
        amount: String(expected * 100),
        currency: "GHS",
        reference,
        callback_url: `${PUBLIC_URL}/api/paystack/callback`,
        metadata: {
          custom_fields: [
            { display_name: "Customer", variable_name: "customer", value: customer.name },
            { display_name: "Phone", variable_name: "phone", value: customer.phone }
          ]
        }
      })
    });

    res.status(201).json({
      success: true,
      reference,
      authorization_url: payment.data.authorization_url,
      access_code: payment.data.access_code
    });
  } catch (e) {
    await query("UPDATE orders SET payment_status='failed', updated_at=NOW() WHERE reference=$1", [reference]);
    res.status(502).json({ error: e.message });
  }
});

async function markOrderPaid(reference, transactionId) {
  const order = await query("SELECT * FROM orders WHERE reference=$1", [reference]);
  if (!order.rowCount) return;
  if (order.rows[0].payment_status === "paid") return;
  await query(
    `UPDATE orders SET payment_status='paid', order_status='processing',
      paystack_transaction_id=$2, updated_at=NOW() WHERE reference=$1`,
    [reference, String(transactionId || "")]
  );
}

app.get("/api/paystack/callback", async (req, res) => {
  const reference = req.query.reference;
  if (!reference) return res.redirect("/payment-success.html?status=missing");
  try {
    const verification = await paystack(`/transaction/verify/${encodeURIComponent(reference)}`, { method: "GET" });
    if (verification.data.status === "success") {
      await markOrderPaid(reference, verification.data.id);
      return res.redirect(`/payment-success.html?status=success&reference=${encodeURIComponent(reference)}`);
    }
    res.redirect(`/payment-success.html?status=${encodeURIComponent(verification.data.status || "pending")}&reference=${encodeURIComponent(reference)}`);
  } catch {
    res.redirect(`/payment-success.html?status=error&reference=${encodeURIComponent(reference)}`);
  }
});

app.post("/api/paystack/webhook", async (req, res) => {
  try {
    const signature = req.headers["x-paystack-signature"];
    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY || "")
      .update(req.rawBody || Buffer.from(""))
      .digest("hex");

    if (!signature) return res.status(401).send("Invalid signature");
    const signatureBuffer = Buffer.from(String(signature), "utf8");
    const hashBuffer = Buffer.from(hash, "utf8");
    if (signatureBuffer.length !== hashBuffer.length ||
        !crypto.timingSafeEqual(signatureBuffer, hashBuffer)) {
      return res.status(401).send("Invalid signature");
    }

    res.sendStatus(200);

    if (req.body?.event === "charge.success") {
      const reference = req.body.data?.reference;
      if (reference) await markOrderPaid(reference, req.body.data?.id);
    }
  } catch (e) {
    console.error("Webhook error:", e.message);
    if (!res.headersSent) res.sendStatus(200);
  }
});

app.post("/api/admin/login", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (!email || !password) return res.status(400).json({ error: "Email and password are required." });
    const result = await query("SELECT id, email, password_hash FROM admins WHERE LOWER(email) = $1 LIMIT 1", [email]);
    if (!result.rowCount) return res.status(401).json({ error: "Invalid email or password" });
    const valid = await bcrypt.compare(password, result.rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid email or password" });
    const token = jwt.sign({ id: result.rows[0].id, email: result.rows[0].email }, JWT_SECRET, { expiresIn: "8h" });
    return res.json({ token, email: result.rows[0].email });
  } catch (e) {
    console.error("Admin login error:", e);
    return res.status(500).json({ error: "Unable to sign in right now." });
  }
});

app.post("/api/admin/upload-image", authRequired, (req, res) => {
  upload.single("image")(req, res, err => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "Please select an image." });
    const imageUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    res.json({ image_url: imageUrl, filename: req.file.originalname });
  });
});

app.get("/api/admin/summary", authRequired, async (req, res) => {
  const [products, orders, appointments, tailoring, students, revenue] = await Promise.all([
    query("SELECT COUNT(*)::int AS count FROM products WHERE active=TRUE"),
    query("SELECT COUNT(*)::int AS count FROM orders"),
    query("SELECT COUNT(*)::int AS count FROM appointments WHERE status='pending'"),
    query("SELECT COUNT(*)::int AS count FROM tailoring_requests WHERE status='new'"),
    query("SELECT COUNT(*)::int AS count FROM student_applications WHERE status IN ('new','reviewing')"),
    query("SELECT COALESCE(SUM(amount),0)::int AS total FROM orders WHERE payment_status='paid'")
  ]);
  res.json({
    products: products.rows[0].count,
    orders: orders.rows[0].count,
    pendingAppointments: appointments.rows[0].count,
    tailoringRequests: tailoring.rows[0].count,
    studentApplications: students.rows[0].count,
    revenue: revenue.rows[0].total
  });
});

app.get("/api/admin/products", authRequired, async (req, res) => {
  const result = await query("SELECT * FROM products ORDER BY created_at DESC");
  res.json(result.rows);
});

app.post("/api/admin/products", authRequired, async (req, res) => {
  const {
    name, category, gender, product_type, clothing_type, price, description,
    sizes, colors, image_url, featured, stock, active
  } = req.body;

  if (!name || !category) {
    return res.status(400).json({ error: "Name and category are required." });
  }

  const result = await query(
    `INSERT INTO products
    (name,category,gender,product_type,clothing_type,price,description,sizes,colors,image_url,featured,stock,active)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [
      name, category, gender || "Unisex", product_type || "Ready-to-Wear",
      clothing_type || "Other", Number(price) || 0, description || "", sizes || "",
      colors || "", image_url || "", !!featured, Number(stock) || 0, active !== false
    ]
  );
  res.status(201).json(result.rows[0]);
});

app.put("/api/admin/products/:id", authRequired, async (req, res) => {
  const {
    name, category, gender, product_type, clothing_type, price, description,
    sizes, colors, image_url, featured, stock, active
  } = req.body;

  if (!name || !category) {
    return res.status(400).json({ error: "Name and category are required." });
  }

  const result = await query(
    `UPDATE products SET
      name=$1, category=$2, gender=$3, product_type=$4, clothing_type=$5,
      price=$6, description=$7, sizes=$8, colors=$9, image_url=$10,
      featured=$11, stock=$12, active=$13
     WHERE id=$14 RETURNING *`,
    [
      name, category, gender || "Unisex", product_type || "Ready-to-Wear",
      clothing_type || "Other", Number(price) || 0, description || "", sizes || "",
      colors || "", image_url || "", !!featured, Number(stock) || 0, active !== false,
      req.params.id
    ]
  );

  if (!result.rowCount) return res.status(404).json({ error: "Product not found" });
  res.json(result.rows[0]);
});

app.delete("/api/admin/products/:id", authRequired, async (req, res) => {
  const result = await query("DELETE FROM products WHERE id=$1 RETURNING id", [req.params.id]);
  if (!result.rowCount) return res.status(404).json({ error: "Product not found" });
  res.json({ success: true, deletedId: result.rows[0].id });
});

app.get("/api/admin/orders", authRequired, async (req, res) => {
  const result = await query("SELECT * FROM orders ORDER BY created_at DESC");
  res.json(result.rows);
});

app.put("/api/admin/orders/:id/status", authRequired, async (req, res) => {
  const allowed = ["pending","processing","ready","completed","cancelled"];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ error: "Invalid order status" });
  await query("UPDATE orders SET order_status=$1, updated_at=NOW() WHERE id=$2", [req.body.status, req.params.id]);
  res.json({ success: true });
});

app.get("/api/admin/appointments", authRequired, async (req, res) => {
  const result = await query("SELECT * FROM appointments ORDER BY appointment_date ASC, appointment_time ASC");
  res.json(result.rows);
});

app.put("/api/admin/appointments/:id/status", authRequired, async (req, res) => {
  const allowed = ["pending","confirmed","completed","cancelled"];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ error: "Invalid appointment status" });
  await query("UPDATE appointments SET status=$1 WHERE id=$2", [req.body.status, req.params.id]);
  res.json({ success: true });
});

app.get("/api/admin/tailoring-requests", authRequired, async (req, res) => {
  const result = await query("SELECT * FROM tailoring_requests ORDER BY created_at DESC");
  res.json(result.rows);
});

app.get("/api/admin/student-applications", authRequired, async (req, res) => {
  const result = await query("SELECT * FROM student_applications ORDER BY created_at DESC");
  res.json(result.rows);
});

app.put("/api/admin/student-applications/:id/status", authRequired, async (req, res) => {
  const allowed = ["new","reviewing","accepted","enrolled","completed","declined"];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ error: "Invalid status" });
  await query("UPDATE student_applications SET status=$1 WHERE id=$2", [req.body.status, req.params.id]);
  res.json({ success: true });
});

app.put("/api/admin/tailoring-requests/:id/status", authRequired, async (req, res) => {
  const allowed = ["new","reviewing","accepted","completed","declined"];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ error: "Invalid status" });
  await query("UPDATE tailoring_requests SET status=$1 WHERE id=$2", [req.body.status, req.params.id]);
  res.json({ success: true });
});

app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

initDb()
  .then(() => app.listen(PORT, () => console.log(`Shelty Couture running on port ${PORT}`)))
  .catch((err) => {
    console.error("Database initialization failed:", err);
    process.exit(1);
  });
