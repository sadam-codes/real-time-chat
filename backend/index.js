// ==================== Express Backend ====================
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

const messageCounters = new Map(); // Track message exchange per pair

app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hash },
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
    const token = jwt.sign({ id: user.id }, JWT_SECRET);
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

      const pairKey = [senderId, receiverId].sort().join("-");
      const count = messageCounters.get(pairKey) || 0;
      messageCounters.set(pairKey, count + 1);

      setTimeout(() => tryAIResponse(senderId, receiverId, content), 20000);

      if ((count + 1) % 6 === 0) {
        setTimeout(() => observerReply(senderId, receiverId), 6000);
      }
    } catch (err) {
      console.error("❌ WebSocket error:", err.message);
    }
  });
});

async function tryAIResponse(senderId, receiverId, lastMessage) {
  const recentReply = await prisma.message.findFirst({
    where: {
      senderId: receiverId,
      receiverId: senderId,
      createdAt: { gte: new Date(Date.now() - 20000) },
    },
  });

  if (recentReply) return;
  const sender = await prisma.user.findUnique({ where: { id: receiverId } });
  const reply = await getGroqReply(lastMessage, sender.name);

  const aiMessage = await prisma.message.create({
    data: {
      content: reply,
      senderId: receiverId,
      receiverId: senderId,
    },
    include: { sender: true, receiver: true },
  });

  const responseMessage = {
    id: aiMessage.id,
    content: aiMessage.content,
    createdAt: aiMessage.createdAt,
    sender: { id: aiMessage.sender.id, name: aiMessage.sender.name },
    receiver: { id: aiMessage.receiver?.id, name: aiMessage.receiver?.name },
  };

  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(responseMessage));
    }
  });
}

async function observerReply(userAId, userBId) {
  const observer = await prisma.user.findUnique({ where: { email: "observer@chat.com" } });
  if (!observer) return console.log("❌ Observer user not found");

  const recentMessages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: userAId, receiverId: userBId },
        { senderId: userBId, receiverId: userAId },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  const convo = recentMessages
    .reverse()
    .map((m) => `${m.senderId === userAId ? "UserA" : "UserB"}: ${m.content}`)
    .join("\n");

  const comment = await getGroqObserverReply(convo);

  const observerMessage = await prisma.message.create({
    data: {
      content: comment,
      senderId: observer.id,
      receiverId: userAId,
    },
    include: { sender: true, receiver: true },
  });

  const response = {
    id: observerMessage.id,
    content: observerMessage.content,
    createdAt: observerMessage.createdAt,
    sender: { id: observerMessage.sender.id, name: observerMessage.sender.name },
    receiver: { id: observerMessage.receiver?.id, name: observerMessage.receiver?.name },
  };

  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(response));
    }
  });
}

async function getGroqReply(userMessage, userName) {
  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama3-70b-8192",
        messages: [
          {
            role: "system",
            content: `
You are acting as a real human named "${userName}". Stay in character and respond naturally in first-person.

✅ Say "I'm ${userName}" if someone asks your name.
✅ Keep answers under 25 words.
✅ Do not say you're an AI.
✅ Use a friendly human tone and emojis sometimes.
✅ Never repeat the question.
✅ Only answer what is asked.
            `,
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data.choices[0].message.content;
  } catch (err) {
    console.error("🔴 Groq API error:", err.message);
    return "I'm not sure what to say right now.";
  }
}

async function getGroqObserverReply(context) {
  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama3-70b-8192",
        messages: [
          {
            role: "system",
            content: `
You are an intelligent silent observer named "ObserverBot".
You occasionally join conversations between UserA and UserB with thoughtful or funny comments.

✅ Read the last 4 messages.
✅ Reply like a friendly third person who's been silently watching.
✅ Comment on their conversation naturally.
✅ Use humor or insight when appropriate.
✅ Never mention you're an AI.
✅ Keep reply under 25 words
i just want this in my website
create colun names as "role" from where admin and user can seperate .
only from database i will change user from admin . 
            `,
          },
          {
            role: "user",
            content: context,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data.choices[0].message.content;
  } catch (err) {
    console.error("Observer Groq error:", err.message);
    return "Interesting conversation, carry on! 😄";
  }
}