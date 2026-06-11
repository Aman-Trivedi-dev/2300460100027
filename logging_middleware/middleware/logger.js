require("dotenv").config();
const axios = require("axios");

const ACCESS_TOKEN = process.env.ACCESS_TOKEN; // ✅ reads from .env

async function sendLog(stack, level, packageName, message) {
    try {
        const response = await axios.post(
            "http://4.224.186.213/evaluation-service/logs",
            {
                stack,
                level,
                package: packageName,
                message
            },
            {
                headers: {
                    Authorization: `Bearer ${ACCESS_TOKEN}`,
                    "Content-Type": "application/json"
                }
            }
        );

        console.log("Log sent:", response.data);
    } catch (err) {
        console.log("Status:", err.response?.status);
        console.log("Data:", err.response?.data);
        console.log("Message:", err.message);
    }
}

function logger(req, res, next) {
    const start = Date.now();

    res.on("finish", async () => {
        const timeTaken = Date.now() - start;

        await sendLog(
            "backend",
            "info",
            "middleware",
            `${req.method} ${req.originalUrl} | Status: ${res.statusCode} | Time: ${timeTaken}ms`
        );
    });

    next();
}

module.exports = { logger, sendLog };