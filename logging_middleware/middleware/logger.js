function logger(req, res, next) {
    const start = Date.now();

    res.on("finish", () => {
        const timeTaken = Date.now() - start;

        console.log({
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            responseTime: `${timeTaken}ms`
        });
    });

    next();
}

module.exports = logger;