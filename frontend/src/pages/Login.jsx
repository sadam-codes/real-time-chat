import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [isRegister, setIsRegister] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async () => {
        // Basic input validation
        if (isRegister && (!name.trim() || !email.trim() || !password.trim())) {
            toast.error("Please fill in all fields for registration.");
            return;
        }

        if (!isRegister && (!email.trim() || !password.trim())) {
            toast.error("Please enter both email and password.");
            return;
        }

        try {
            const url = `http://localhost:3000/${isRegister ? "register" : "login"}`;
            const payload = isRegister ? { name, email, password } : { email, password };
            const res = await axios.post(url, payload);
            localStorage.setItem("token", res.data.token);
            localStorage.setItem("user", JSON.stringify(res.data.user));

            toast.success(isRegister ? "Registered successfully!" : "Logged in successfully!");
            navigate("/chat");
        } catch (err) {
            toast.error("Login/Register failed!");
        }
    };


    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
            <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-sm space-y-6">
                <h2 className="text-2xl font-bold text-center text-gray-800">
                    {isRegister ? "Create an Account" : "Welcome Back"}
                </h2>

                {isRegister && (
                    <input
                        className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-grabg-gray-200"
                        placeholder="Name"
                        onChange={(e) => setName(e.target.value)}
                    />
                )}
                <input
                    className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-grabg-gray-200"
                    placeholder="Email"
                    onChange={(e) => setEmail(e.target.value)}
                />
                <input
                    type="password"
                    className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-grabg-gray-200"
                    placeholder="Password"
                    onChange={(e) => setPassword(e.target.value)}
                />

                <button
                    onClick={handleSubmit}
                    className="w-full py-2 bg-gray-800 text-white rounded-xl hover:bg-gray-800 transition duration-200"
                >
                    {isRegister ? "Register" : "Login"}
                </button>

                <p
                    className="text-sm text-center text-grabg-gray-800 hover:underline cursor-pointer"
                    onClick={() => setIsRegister(!isRegister)}
                >
                    {isRegister
                        ? "Already have an account? Login"
                        : "Don't have an account? Register"}
                </p>
            </div>
        </div>
    );
};

export default Login;
