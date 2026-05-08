const path = require("path");
const crypto = require("crypto");

const cors = require("cors");
const dotenv = require("dotenv");
const express = require("express");
const mysql = require("mysql2/promise");

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3000;
const projectFrontendDir = path.join(__dirname, "..", "frontend");
const repoRootDir = path.join(__dirname, "..");
const frontendDir = require("fs").existsSync(projectFrontendDir) ? projectFrontendDir : repoRootDir;
const dbName = process.env.DB_NAME || "vibe_gaming";

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || ""
};

const pool = mysql.createPool({
  ...dbConfig,
  database: dbName,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(frontendDir));

const games = new Set(["memory", "rock-paper-scissors", "tic-tac-toe", "snake", "brick-breaker"]);

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha256").toString("hex");
  return { salt, hash };
}

function verifyPassword(password, salt, storedHash) {
  const { hash } = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(storedHash, "hex"));
}

function quoteIdentifier(identifier) {
  return `\`${String(identifier).replace(/`/g, "``")}\``;
}

async function ensureColumn(table, column, definition) {
  const [rows] = await pool.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?
     LIMIT 1`,
    [dbName, table, column]
  );

  if (!rows.length) {
    await pool.query(`ALTER TABLE ${quoteIdentifier(table)} ADD COLUMN ${quoteIdentifier(column)} ${definition}`);
  }
}

async function initDatabase() {
  const setupConnection = await mysql.createConnection(dbConfig);
  await setupConnection.query(`CREATE DATABASE IF NOT EXISTS ${quoteIdentifier(dbName)}`);
  await setupConnection.end();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS feedback (
      id INT AUTO_INCREMENT PRIMARY KEY,
      message TEXT NOT NULL,
      rating TINYINT UNSIGNED NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT chk_feedback_rating CHECK (rating BETWEEN 1 AND 5)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(30) NOT NULL UNIQUE,
      email VARCHAR(120),
      phone VARCHAR(20),
      password_hash VARCHAR(128) NOT NULL,
      password_salt VARCHAR(32) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await ensureColumn("users", "email", "VARCHAR(120)");
  await ensureColumn("users", "phone", "VARCHAR(20)");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      token VARCHAR(64) NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS scores (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      game VARCHAR(40) NOT NULL,
      score INT UNSIGNED NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_scores_game_score (game, score),
      INDEX idx_scores_user_game (user_id, game)
    )
  `);
}

function getToken(req) {
  const header = req.get("authorization") || "";
  if (!header.startsWith("Bearer ")) return "";
  return header.slice(7).trim();
}

async function requireUser(req, res, next) {
  const token = getToken(req);

  if (!token) {
    return res.status(401).json({ message: "Please login to continue playing." });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT users.id, users.username
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.token = ? AND sessions.expires_at > NOW()
       LIMIT 1`,
      [token]
    );

    if (!rows.length) {
      return res.status(401).json({ message: "Your login expired. Please login again." });
    }

    req.user = rows[0];
    next();
  } catch (error) {
    res.status(500).json({ message: "Could not verify login right now." });
  }
}

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    res.status(500).json({
      status: "error",
      database: "disconnected",
      message: "Could not connect to MySQL"
    });
  }
});

app.post("/api/register", async (req, res) => {
  const username = String(req.body.username || "").trim();
  const email = String(req.body.email || "").trim();
  const phone = String(req.body.phone || "").trim();
  const password = String(req.body.password || "");

  if (username.length < 3 || username.length > 30) {
    return res.status(400).json({ message: "Username must be 3 to 30 characters." });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: "Enter a valid email address." });
  }

  if (!/^[0-9+\-\s]{7,20}$/.test(phone)) {
    return res.status(400).json({ message: "Enter a valid phone number." });
  }

  if (password.length < 4) {
    return res.status(400).json({ message: "Password must be at least 4 characters." });
  }

  const { salt, hash } = hashPassword(password);

  try {
    const [result] = await pool.execute(
      "INSERT INTO users (username, email, phone, password_hash, password_salt) VALUES (?, ?, ?, ?, ?)",
      [username, email, phone, hash, salt]
    );

    const token = crypto.randomBytes(32).toString("hex");
    await pool.execute(
      "INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))",
      [result.insertId, token]
    );

    res.status(201).json({
      message: "Account created. You are logged in.",
      token,
      user: {
        id: result.insertId,
        username
      }
    });
  } catch (error) {
    console.error("Registration error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "That username is already taken." });
    }

    if (error.code === "ER_NO_SUCH_TABLE" || error.code === "ER_BAD_FIELD_ERROR") {
      return res.status(500).json({
        message: "Database is not ready. Restart the backend server so it can create or update the tables."
      });
    }

    res.status(500).json({ message: "Account could not be created right now." });
  }
});

app.post("/api/login", async (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");

  if (!username || !password) {
    return res.status(400).json({ message: "Enter username and password." });
  }

  try {
    const [rows] = await pool.execute(
      "SELECT id, username, password_hash, password_salt FROM users WHERE username = ? LIMIT 1",
      [username]
    );

    if (!rows.length || !verifyPassword(password, rows[0].password_salt, rows[0].password_hash)) {
      return res.status(401).json({ message: "Invalid username or password." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    await pool.execute(
      "INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))",
      [rows[0].id, token]
    );

    res.json({
      message: "Login successful.",
      token,
      user: {
        id: rows[0].id,
        username: rows[0].username
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed right now." });
  }
});

app.get("/api/me", requireUser, (req, res) => {
  res.json({ user: req.user });
});

app.post("/api/logout", requireUser, async (req, res) => {
  try {
    await pool.execute("DELETE FROM sessions WHERE token = ?", [getToken(req)]);
    res.json({ message: "Logged out." });
  } catch (error) {
    res.status(500).json({ message: "Logout failed right now." });
  }
});

app.post("/api/scores", requireUser, async (req, res) => {
  const game = String(req.body.game || "").trim();
  const score = Number(req.body.score);

  if (!games.has(game)) {
    return res.status(400).json({ message: "Unknown game." });
  }

  if (!Number.isFinite(score) || score < 0) {
    return res.status(400).json({ message: "Score must be a positive number." });
  }

  try {
    const [result] = await pool.execute(
      "INSERT INTO scores (user_id, game, score) VALUES (?, ?, ?)",
      [req.user.id, game, Math.floor(score)]
    );

    res.status(201).json({
      message: "Score saved.",
      id: result.insertId
    });
  } catch (error) {
    res.status(500).json({ message: "Score could not be saved right now." });
  }
});

app.get("/api/scores", async (req, res) => {
  const game = String(req.query.game || "").trim();

  if (game && !games.has(game)) {
    return res.status(400).json({ message: "Unknown game." });
  }

  try {
    const params = [];
    let where = "";

    if (game) {
      where = "WHERE scores.game = ?";
      params.push(game);
    }

    const [rows] = await pool.execute(
      `SELECT scores.id, users.username, scores.game, scores.score, scores.created_at
       FROM scores
       JOIN users ON users.id = scores.user_id
       ${where}
       ORDER BY scores.score DESC, scores.created_at ASC
       LIMIT 50`,
      params
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Could not load scores." });
  }
});

app.post("/api/feedback", async (req, res) => {
  const feedback = String(req.body.feedback || "").trim();
  const rating = Number(req.body.rating);

  if (!feedback) {
    return res.status(400).json({ message: "Please write a suggestion before submitting." });
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ message: "Please select a rating from 1 to 5 stars." });
  }

  try {
    const [result] = await pool.execute(
      "INSERT INTO feedback (message, rating) VALUES (?, ?)",
      [feedback, rating]
    );

    res.status(201).json({
      message: "Thanks for your feedback!",
      id: result.insertId
    });
  } catch (error) {
    res.status(500).json({ message: "Feedback could not be saved right now." });
  }
});

app.get("/api/feedback", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, message, rating, created_at FROM feedback ORDER BY created_at DESC LIMIT 50"
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Could not load feedback." });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(frontendDir, "index.html"));
});

initDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`Vibe Gaming server running at http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Could not initialize database:", error);
    process.exit(1);
  });
