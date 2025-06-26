import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const Navbar = () => {
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    // Load user on mount and when storage changes (e.g., after login/logout)
    const loadUser = () => {
        const savedUser = localStorage.getItem("user");
        setUser(savedUser ? JSON.parse(savedUser) : null);
    };

    useEffect(() => {
        const loadUser = () => {
            const savedUser = localStorage.getItem("user");
            setUser(savedUser ? JSON.parse(savedUser) : null);
        };
        loadUser();
        const handleUserChange = () => loadUser();
        window.addEventListener("user-logged-in", handleUserChange);
        window.addEventListener("storage", handleUserChange);
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") loadUser();
        });

        return () => {
            window.removeEventListener("user-logged-in", handleUserChange);
            window.removeEventListener("storage", handleUserChange);
            document.removeEventListener("visibilitychange", loadUser);
        };
    }, []);


    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
        navigate("/");
    };

    return (
        <div className="container mx-auto">
            <nav className="bg-white px-6 py-4 flex justify-between items-center">
                <Link to="/" className="text-xl font-bold text-gray-800">
                    💬 ChatApp
                </Link>

                <div className="flex items-center gap-4">
                    {user ? (
                        <>
                            <span className="text-gray-700 hidden sm:block">👋 {user.name}</span>
                            <button
                                onClick={handleLogout}
                                className="bg-black text-white px-4 py-2 rounded-lg"
                            >
                                Logout
                            </button>
                        </>
                    ) : (
                        <span className="font-bold text-gray-800">Login / Signup</span>
                    )}
                </div>
            </nav>
        </div>
    );
};

export default Navbar;
