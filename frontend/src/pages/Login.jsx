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
            let payload = isRegister
                ? {
                    name,
                    email,
                    password,
                    role:
                        email === "admin@gmail.com" && password === "admin@123"
                            ? "ADMIN"
                            : "USER",
                }
                : { email, password };

            const res = await axios.post(url, payload);
            const { token, user } = res.data;

            localStorage.setItem("token", token);
            localStorage.setItem("user", JSON.stringify(user));
            window.dispatchEvent(new Event("user-logged-in"));

            toast.success(isRegister ? "Registered successfully!" : "Logged in successfully!");
            if (user.role === "ADMIN") {
                navigate("/admin");
            } else {
                navigate("/rooms");
            }
        } catch (err) {
            toast.error("Login/Register failed!");
        }
    };

    return (
        <div className="flex flex-col sm:flex-row container mx-auto">
            <div className="hidden sm:flex w-1/2 items-center justify-center overflow-hidden">
                <img
                    src="https://img.freepik.com/premium-vector/secure-login-sign-up-concept-illustration-user-use-secure-login-password-protection-website-social-media-account-vector-flat-style_7737-2270.jpg?semt=ais_items_boosted&w=740"
                    alt="Login Illustration"
                    className="object-contain"
                />
            </div>
            <div className="flex w-full sm:w-1/2 items-center justify-center px-6">
                <div className="bg-white  rounded-2xl p-8 w-full max-w-md space-y-6">
                    <h2 className="text-2xl font-bold text-center text-gray-800">
                        {isRegister ? "Create an Account" : "Welcome Back"}
                    </h2>
                    {isRegister && (
                        <input
                            className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-200"
                            placeholder="Name"
                            onChange={(e) => setName(e.target.value)}
                        />
                    )}
                    <input
                        className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-200"
                        placeholder="Email"
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <input
                        type="password"
                        className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-200"
                        placeholder="Password"
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                        onClick={handleSubmit}
                        className="w-full py-2 bg-gray-800 text-white rounded-xl hover:bg-gray-900 transition duration-200"
                    >
                        {isRegister ? "Register" : "Login"}
                    </button>
                    <button
                        className="text-sm text-center text-gray-800 hover:underline cursor-pointer"
                        onClick={() => setIsRegister(!isRegister)}
                    >
                        {isRegister
                            ? "Already have an account? Login"
                            : "Don't have an account? Register"}
                    </button>
                </div>
            </div>
        </div>
    );
};
export default Login;
