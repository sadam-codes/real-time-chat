// ==================== index.js (Express Backend) ====================
import express from "express";
import { WebSocketServer } from "ws";
import cors from "cors";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import axios from "axios";
import { PrismaClient } from "@prisma/client";

dotenv.config();
const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const messageCounters = new Map(); // Track message exchanges per pair

// ============== Role-Based Middleware ==============
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

// ============== Auth Routes ==============
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

    let role = user.role;
    if (email === "admin@gmail.com" && password === "admin@123") {
      role = "ADMIN";
    }

    const token = jwt.sign({ id: user.id, role }, JWT_SECRET);
    res.json({ token, user: { ...user, role } });
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

// ============== Room APIs ==============
app.post("/rooms", authenticateRole("ADMIN"), async (req, res) => {
  const { name, topic, botEnabled } = req.body;
  try {
    const room = await prisma.room.create({ data: { name, topic, botEnabled } });
    res.json(room);
  } catch (err) {
    console.error("❌ Room creation error:", err.message);
    res.status(500).json({ error: "Failed to create room" });
  }
});

app.put("/rooms/:id", authenticateRole("ADMIN"), async (req, res) => {
  const { name, topic, botEnabled } = req.body;
  const roomId = parseInt(req.params.id);
  try {
    const room = await prisma.room.update({
      where: { id: roomId },
      data: { name, topic, botEnabled },
    });
    res.json(room);
  } catch (err) {
    console.error("❌ Room update error:", err.message);
    res.status(500).json({ error: "Failed to update room" });
  }
});

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

app.get("/rooms", async (req, res) => {
  try {
    const rooms = await prisma.room.findMany();
    res.json(rooms);
  } catch (err) {
    console.error("❌ Fetch rooms error:", err.message);
    res.status(500).json({ error: "Failed to fetch rooms" });
  }
});

// ============== WebSocket & Bot Logic ==============
const server = app.listen(3000, () => {
  console.log("✅ Server running on http://localhost:3000");
});

const wss = new WebSocketServer({ server });

wss.on("connection", (socket) => {
  console.log("🟢 WebSocket connected");

  socket.on("close", () => console.log("🔴 WebSocket disconnected"));

  socket.on("message", async (msg) => {
    try {
      const { token, content, receiverId, roomId } = JSON.parse(msg);
      if (!token || !content || !roomId) return;

      const decoded = jwt.verify(token, JWT_SECRET);
      const senderId = decoded.id;

      const room = await prisma.room.findUnique({ where: { id: roomId } });
      if (!room) return;

      const message = await prisma.message.create({
        data: { content, senderId, receiverId, roomId },
        include: { sender: true, receiver: true },
      });

      const fullMessage = {
        id: message.id,
        content: message.content,
        createdAt: message.createdAt,
        roomId: message.roomId,
        sender: { id: message.sender.id, name: message.sender.name },
        receiver: message.receiver
          ? { id: message.receiver.id, name: message.receiver.name }
          : null,
      };

      socket.roomId = roomId;
      wss.clients.forEach((client) => {
        if (client.readyState === 1 && client.roomId === roomId) {
          client.send(JSON.stringify(fullMessage));
        }
      });

      // Bot logic: every 2 messages in the same room
      if (room.botEnabled) {
        const pairKey = `${roomId}-${senderId}-${receiverId}`;
        const count = messageCounters.get(pairKey) || 0;
        messageCounters.set(pairKey, count + 1);

        if ((count + 1) % 2 === 0) {
          const recentMessages = await prisma.message.findMany({
            where: { roomId },
            orderBy: { createdAt: "desc" },
            take: 6,
          });

          const context = recentMessages.reverse().map((m) => `${m.senderId === senderId ? "You" : "Them"}: ${m.content}`).join("\n");

          const groqResponse = await axios.post(
            "https://api.groq.com/openai/v1/chat/completions",
            {
              model: "llama3-8b-8192",
              messages: [
                {
                  role: "system",
                  content: "You're a helpful assistant who joins the conversation occasionally and responds naturally like a participant.",
                },
                { role: "user", content: context },
              ],
            },
            {
              headers: {
                Authorization: `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json",
              },
            }
          );

          const botContent = groqResponse.data.choices[0].message.content;

          const botMsg = await prisma.message.create({
            data: {
              content: botContent,
              senderId,
              receiverId,
              roomId,
            },
            include: { sender: true, receiver: true },
          });

          const fullBotMessage = {
            id: botMsg.id,
            content: botMsg.content,
            createdAt: botMsg.createdAt,
            roomId: botMsg.roomId,
            sender: { id: botMsg.sender.id, name: "🤖 Bot" },
            receiver: botMsg.receiver
              ? { id: botMsg.receiver.id, name: botMsg.receiver.name }
              : null,
          };

          wss.clients.forEach((client) => {
            if (client.readyState === 1 && client.roomId ===roomId) {
              client.send(JSON.stringify(fullBotMessage));
            }
          });
        }
      }
    } catch (err) {
      console.error("❌ WebSocket error:", err.message);
    }
  });
});
