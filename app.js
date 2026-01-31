import express from "express";
import pgPromise from "pg-promise";

const app = express();
app.use(express.json());
app.use(express.static('.'));

const pgp = pgPromise();
const db = pgp("postgresql://postgres.bofsstdpnajtahetkxtq:coccast101!@aws-1-us-east-1.pooler.supabase.com:5432/postgres");
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email and password required" });
  }

  try {
    const user = await db.oneOrNone(
      "SELECT id, email, password_hash FROM users WHERE email = $1",
      [email]
    );

    if (!user || password !== user.password_hash) {
      return res.status(401).json({ error: "invalid credentials" });
    }

    return res.json({ ok: true, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

app.get("/users", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, email FROM users ORDER BY id"
    );

    // Most libraries (pg, mysql2/promise, ...) return object with .rows
    const users = result.rows ?? result ?? [];

    res.json({
      ok: true,
      users: users   // ← array of users
    });
  } catch (err) {
    console.error("Failed to get users:", err);
    res.status(500).json({
      ok: false,
      error: "Could not fetch users"
    });
  }
});
app.use((req, _res, next) => {
  const userId = req.header("x-user-id");
  if (userId) req.userId = userId;
  next();
});

app.post("/topup", async (req, res) => {
  const { email, amount } = req.body;

  try {
    const user = await db.oneOrNone(
      "UPDATE users SET credits = credits + $1 WHERE email = $2 RETURNING email, credits",
      [Number(amount), email]
    );
    if (!user) return res.status(404).json({ ok: false, error: "user not found" });

    return res.json({ ok: true, user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});
app.get("/credits",  async (_req, res) => {
  const q = await db.query(
    "SELECT credits FROM users"
  );
  return res.json({ ok: true, credits: q});
});
app.get("/table",  async (_req, res) => {
  const q = await db.query(
    "SELECT * FROM poop"
  );
  return res.json({ ok: true, table: q});
});
app.listen(3000, () => {
  console.log("Listening on http://localhost:3000");
});
