const express = require("express");
const logger = require("./middleware/logger");

const app = express();

app.use(express.json());
app.use(logger);

app.get("/", (req, res) => {
    res.json({
        message: "Logging Middleware Working"
    });
});

app.get("/test", (req, res) => {
    res.json({
        success: true
    });
});

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});