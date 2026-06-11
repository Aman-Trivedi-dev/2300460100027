const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

let notifications = [];

app.get("/notifications", (req, res) => {
    res.json(notifications);
});

app.post("/notifications", (req, res) => {
    const notification = {
        id: Date.now(),
        message: req.body.message
    };

    notifications.push(notification);

    res.status(201).json({
        success: true,
        data: notification
    });
});

app.listen(5000, () => {
    console.log("Server running on port 5000");
});