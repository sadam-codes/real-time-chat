import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const Admin = () => {
  const [rooms, setRooms] = useState([]);
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [editingRoom, setEditingRoom] = useState(null);

  const token = localStorage.getItem("token");

  const fetchRooms = async () => {
    try {
      const res = await axios.get("http://localhost:3000/rooms");
      setRooms(res.data);
    } catch (err) {
      toast.error("Failed to fetch rooms");
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !topic.trim()) {
      toast.error("Room name and topic required.");
      return;
    }

    try {
      if (editingRoom) {
        await axios.put(
          `http://localhost:3000/rooms/${editingRoom.id}`,
          { name, topic },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success("Room updated!");
      } else {
        await axios.post(
          "http://localhost:3000/rooms",
          { name, topic },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success("Room created!");
      }
      setName("");
      setTopic("");
      setEditingRoom(null);
      fetchRooms();
    } catch (err) {
      toast.error("Failed to save room");
    }
  };

  const handleEdit = (room) => {
    setEditingRoom(room);
    setName(room.name);
    setTopic(room.topic);
  };

  const handleDelete = async (roomId) => {
    if (!window.confirm("Are you sure you want to delete this room?")) return;
    try {
      await axios.delete(`http://localhost:3000/rooms/${roomId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Room deleted!");
      fetchRooms();
    } catch (err) {
      toast.error("Failed to delete room");
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  return (
    <div className="max-w-4xl mx-auto py-10 px-6">
      <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">
        Admin Dashboard
      </h1>

      <div className="mb-10 bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">
          {editingRoom ? "Edit Room" : "Create Room"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input
            className="w-full px-4 py-2 border rounded-lg"
            placeholder="Room Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="w-full px-4 py-2 border rounded-lg"
            placeholder="Discussion Topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        </div>
        <button
          className="mt-4 w-full bg-black text-white py-2 rounded-lg"
          onClick={handleSave}
        >
          {editingRoom ? "Update Room" : "Create Room"}
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">All Rooms</h2>
        {rooms.length === 0 ? (
          <p className="text-gray-600">No rooms found.</p>
        ) : (
          <ul className="space-y-4">
            {rooms.map((room) => (
              <li
                key={room.id}
                className="flex justify-between items-center p-4 border rounded-lg"
              >
                <div>
                  <p className="font-semibold">{room.name}</p>
                  <p className="text-gray-600 text-sm">{room.topic}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(room)}
                    className="px-3 py-1 bg-black text-white rounded"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(room.id)}
                    className="px-3 py-1 bg-black text-white rounded"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Admin;
