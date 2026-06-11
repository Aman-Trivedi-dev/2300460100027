const express = require("express");
const { logger, sendLog } = require("./middleware/logger");

const app = express();

app.use(express.json());
app.use(logger);

app.get("/test", (req, res) => {
    res.json({ success: true });
});

app.get("/logtest", async (req, res) => {  // ← only ONE, not nested
    try {
        await sendLog("backend", "info", "middleware", "Test log from Aman");
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});