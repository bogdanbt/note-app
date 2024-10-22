const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "Неавторизован" }); // Сообщение об ошибке при отсутствии токена
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: "Недействительный токен" }); // Сообщение об ошибке при недействительном токене
        }
        req.user = user;
        next(); // Передаём управление следующему middleware или функции маршрута
    });
}

module.exports = {
    authenticateToken,
};
