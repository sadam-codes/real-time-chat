import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login"; 
import Chat from "./pages/Chat";


const App = () => (
  <Router>
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/chat" element={<Chat />} />
    </Routes>
  </Router>
);

export default App;
