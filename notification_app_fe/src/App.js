import React, { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [message, setMessage] = useState("");
  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = async () => {
    const res = await fetch("http://localhost:5000/notifications");
    const data = await res.json();
    setNotifications(data);
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const addNotification = async () => {
    if (!message.trim()) return;

    await fetch("http://localhost:5000/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });

    setMessage("");
    fetchNotifications();
  };

  return (
      <div className="container">
        <h1>Notification App</h1>

      <input
        type="text"
        placeholder="Enter notification"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      <button onClick={addNotification}>
        Add Notification
      </button>

      <h2>Notifications</h2>

      <ul>
        {notifications.map((n) => (
          <li key={n.id}>{n.message}</li>
        ))}
      </ul>
    </div>
  );
}

export default App;