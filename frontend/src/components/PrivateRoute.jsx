// components/PrivateRoute.jsx
import React from 'react'
import { Navigate } from "react-router-dom";
import { toast } from "react-hot-toast";

const PrivateRoute = ({ children, allowedRoles }) => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user"));

    if (!token || !user) {
        toast.error("Please login first!");
        return <Navigate to="/" />;
    }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        toast.error("Access denied!");
        return <Navigate to="/chat" />;
    }

    return children;
};

export default PrivateRoute;
