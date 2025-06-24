import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";


const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const socket = useRef(null);
  const navigate = useNavigate();

  let user = null;
  let token = null;

  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
    token = localStorage.getItem("token");
  } catch (e) {
    console.warn("❌ Invalid user/token in localStorage");
  }

  useEffect(() => {
    if (!user || !token) {
      navigate("/");
    }
  }, [navigate]);

  useEffect(() => {
    socket.current = new WebSocket("ws://localhost:3000");

    socket.current.onopen = () => {
      console.log("✅ WebSocket connected");
    };

    socket.current.onerror = (err) => {
      console.error("❌ WebSocket error", err);
    };

    socket.current.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        setMessages((prev) => [...prev, msg]);
      } catch (e) {
        console.error("❌ Failed to parse incoming message", e);
      }
    };

    return () => socket.current?.close();
  }, []);

const send = () => {
  if (!text.trim()) return;

  try {
    socket.current.send(
      JSON.stringify({ token, content: text, receiverId: null })
    );
    setText("");
    toast.success("Message sent!");
  } catch (e) {
    console.error("Send failed", e);
    toast.error("Failed to send message!");
  }
};


  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Welcome, {user?.name || "Guest"}</h1>
      <div className="h-[400px] overflow-y-scroll border p-4 mb-4">
        {messages.map((m, i) => (
          <div key={i} className="mb-2">
            <strong>{m.sender?.name || "Unknown"}:</strong> {m.content}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send(); 
          }}
          className="border p-2 flex-1"
          placeholder="Type a message..."
        />

        <button className="bg-black rounded-xl text-white px-4" onClick={send}>
          Send
        </button>
      </div>
    </div>
  );
};

export default Chat;
