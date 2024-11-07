const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "Неавторизован" }); // Сообщение об ошибке при отсутствии токена
    }

    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        req.user = decoded; // decoded.email будет доступен, если email добавлен в токен
        next();
    } catch (error) {
        console.error("Ошибка аутентификации:", error);
        return res.status(403).json({ message: "Недействительный токен" });
    }
}

module.exports = {
    authenticateToken,
};
