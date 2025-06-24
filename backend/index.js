import express from "express";
import { WebSocketServer } from "ws";
import cors from "cors";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET;

// 👇 Optional: API test route
app.get("/", (req, res) => {
    res.send("✅ API is working");
});

// 👉 Register
app.post("/register", async (req, res) => {
    const { name, email, password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    try {
        const user = await prisma.user.create({
            data: { name, email, password: hash },
        });
        res.json(user);
    } catch {
        res.status(400).json({ error: "Email already exists" });
    }
});

// 👉 Login
app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user.id }, JWT_SECRET);
    res.json({ token, user });
});

// ✅ Start HTTP server first
const server = app.listen(3000, () => {
    console.log("✅ Server running on http://localhost:3000");
});


const wss = new WebSocketServer({ server });

wss.on("connection", (socket) => {
    console.log("🟢 WebSocket connected");

    socket.on("message", async (msg) => {
        try {
            const { token, content, receiverId } = JSON.parse(msg);
            const decoded = jwt.verify(token, JWT_SECRET);
            const senderId = decoded.id;

            const message = await prisma.message.create({
                data: {
                    content,
                    senderId,
                    receiverId,
                },
                include: {
                    sender: true,
                    receiver: true,
                },

            });
            console.log("✅ Saving message:", { senderId, receiverId, content });



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
