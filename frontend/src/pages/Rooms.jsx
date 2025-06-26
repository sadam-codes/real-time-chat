import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const Rooms = () => {
  const [rooms, setRooms] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const res = await axios.get("http://localhost:3000/rooms");
      setRooms(res.data);
    } catch (err) {
      toast.error("Failed to load rooms");
    }
  };

  const handleJoin = (room) => {
    localStorage.setItem("selectedRoom", JSON.stringify(room));
    navigate("/chat");
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-6">
      <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">🏠 Available Rooms</h1>

      <div className="bg-white shadow rounded-lg p-4">
        {rooms.length === 0 ? (
          <p className="text-gray-600">No rooms available.</p>
        ) : (
          <ul className="space-y-3">
            {rooms.map((room) => (
              <li
                key={room.id}
                className="flex justify-between items-center p-3 border rounded-lg hover:shadow-sm"
              >
                <div>
                  <p className="font-semibold text-gray-800">{room.name}</p>
                  <p className="text-sm text-gray-500">{room.topic}</p>
                </div>
                <button
                  onClick={() => handleJoin(room)}
                  className="bg-black text-white px-4 py-1 rounded"
                >
                  Join
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Rooms;
