// ==================== React Frontend (Chat.jsx) ====================
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { LuMessageCircleMore } from "react-icons/lu";
import { toast } from "react-hot-toast";

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [chatWith, setChatWith] = useState(null);
  const [users, setUsers] = useState([]);
  const socket = useRef(null);
  const navigate = useNavigate();

  let user = null;
  let token = null;

  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
    token = localStorage.getItem("token");
  } catch (e) {
    console.warn("Invalid user/token in localStorage");
  }

  useEffect(() => {
    if (!user || !token) navigate("/");
  }, [navigate]);

  useEffect(() => {
    fetch("http://localhost:3000/users")
      .then((res) => res.json())
      .then((data) => {
        const otherUsers = data.filter((u) => u.id !== user?.id);
        setUsers(otherUsers);
        setChatWith(otherUsers[0]);
      });
  }, []);

  useEffect(() => {
    socket.current = new WebSocket("ws://localhost:3000");
    socket.current.onopen = () => console.log("WebSocket connected");
    socket.current.onerror = (err) => console.error("WebSocket error", err);
    socket.current.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        setMessages((prev) => [...prev, msg]);
      } catch (e) {
        console.error("Failed to parse incoming message", e);
      }
    };
    return () => socket.current?.close();
  }, []);

  const send = () => {
    if (!text.trim()) return;

    if (!chatWith?.id) {
      toast.error("No recipient selected");
      return;
    }

    try {
      socket.current.send(
        JSON.stringify({ token, content: text, receiverId: chatWith.id })
      );
      setText("");
    } catch (e) {
      console.error("Send failed", e);
      toast.error("Failed to send message!");
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto min-h-screen bg-gradient-to-b from-gray-100 via-white to-gray-200">
      <h1 className="text-2xl font-semibold mb-6 text-center text-gray-800">
        👋 Welcome, <span className="text-gray-800">{user?.name || "Guest"}</span>
      </h1>
      <div className="h-[420px] overflow-y-auto border border-gray-300 bg-white rounded-xl shadow-inner p-4 mb-6 space-y-2">
        {messages.map((m, i) => {
          const isSender = m.sender?.id === user?.id;
          return (
            <div
              key={i}
              className={`flex items-start gap-3 ${isSender ? "justify-start" : "justify-end"
                }`}
            >
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                  m.sender?.name || "U"
                )}&background=${isSender ? "random" : "0D8ABC"}&size=32`}
                alt="avatar"
                className="w-9 h-9 rounded-full border shadow"
              />
              <div className="flex flex-col max-w-[70%] text-left">
                <strong
                  className={`text-xs mb-1 font-medium ${isSender ? "text-blue-600" : "text-green-600"
                    }`}
                >
                  {m.sender?.name || "Unknown"}
                </strong>
                <div
                  className={`whitespace-pre-wrap break-words px-4 py-2 rounded-2xl text-sm shadow-sm ${isSender
                    ? "bg-blue-50 text-blue-900 border border-blue-200"
                    : "bg-green-50 text-green-900 border border-green-200"
                    }`}
                >
                  {m.content}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 items-center">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          className="flex-1 px-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 shadow-sm bg-white"
          placeholder="Type something nice..."
        />
        <button
          onClick={send}
          className="bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white px-5 py-2 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center"
        >
          <LuMessageCircleMore className="text-xl" />
        </button>
      </div>
    </div>
  );

};
export default Chat;
