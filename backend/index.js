// ==================== Express Backend ====================
import express from "express";
import { WebSocketServer } from "ws";
import cors from "cors";
import jwt from "jsonwebtoken";
dotenv.config();
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import axios from "axios";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const messageCounters = new Map(); // Track message exchange per pair

function authenticateRole(role) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Missing token" });

    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.role !== role) return res.status(403).json({ error: "Forbidden" });
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ error: "Invalid token" });
    }
  };
}

app.post("/register", async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hash, role },
    });
    res.json(user);
  } catch (err) {
    console.error("❌ Registration error:", err.message);
    res.status(400).json({ error: "Email already exists or invalid input." });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
    res.json({ token, user });
  } catch (err) {
    console.error("❌ Login error:", err.message);
    res.status(500).json({ error: "Server error during login" });
  }
});

app.get("/users", async (req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
  });
  res.json(users);
});

// ADMIN: Create Room
app.post("/rooms", authenticateRole("ADMIN"), async (req, res) => {
  const { name, topic } = req.body;
  try {
    const room = await prisma.room.create({ data: { name, topic } });
    res.json(room);
  } catch (err) {
    console.error("❌ Room creation error:", err.message);
    res.status(500).json({ error: "Failed to create room" });
  }
});

// ADMIN: Update Room
app.put("/rooms/:id", authenticateRole("ADMIN"), async (req, res) => {
  const { name, topic } = req.body;
  const roomId = parseInt(req.params.id);
  try {
    const room = await prisma.room.update({
      where: { id: roomId },
      data: { name, topic },
    });
    res.json(room);
  } catch (err) {
    console.error("❌ Room update error:", err.message);
    res.status(500).json({ error: "Failed to update room" });
  }
});

// ADMIN: Delete Room
app.delete("/rooms/:id", authenticateRole("ADMIN"), async (req, res) => {
  const roomId = parseInt(req.params.id);
  try {
    await prisma.room.delete({ where: { id: roomId } });
    res.json({ message: "Room deleted" });
  } catch (err) {
    console.error("❌ Room deletion error:", err.message);
    res.status(500).json({ error: "Failed to delete room" });
  }
});

// USER: Get All Rooms
app.get("/rooms", async (req, res) => {
  try {
    const rooms = await prisma.room.findMany();
    res.json(rooms);
  } catch (err) {
    console.error("❌ Fetch rooms error:", err.message);
    res.status(500).json({ error: "Failed to fetch rooms" });
  }
});

const server = app.listen(3000, () => {
  console.log("✅ Server running on http://localhost:3000");
});

const wss = new WebSocketServer({ server });

wss.on("connection", (socket) => {
  console.log("🟢 WebSocket connected");

  socket.on("close", () => {
    console.log("🔴 WebSocket disconnected");
  });

  socket.on("message", async (msg) => {
    try {
      const { token, content, receiverId } = JSON.parse(msg);
      if (!token || !content || !receiverId) return;

      const decoded = jwt.verify(token, JWT_SECRET);
      const senderId = decoded.id;

      const message = await prisma.message.create({
        data: { content, senderId, receiverId },
        include: { sender: true, receiver: true },
      });

      const fullMessage = {
        id: message.id,
        content: message.content,
        createdAt: message.createdAt,
        sender: { id: message.sender.id, name: message.sender.name },
        receiver: { id: message.receiver?.id, name: message.receiver?.name },
      };

      wss.clients.forEach((client) => {
        if (client.readyState === 1) {
          client.send(JSON.stringify(fullMessage));
        }
      });
    } catch (err) {
      console.error("❌ WebSocket error:", err.message);
    }
  });
});
