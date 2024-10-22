const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true }, // Имя пользователя
    email: { type: String, required: true, unique: true }, // Email пользователя, должен быть уникальным
    password: { type: String, required: true }, // Пароль для аутентификации
    createdOn: { type: Date, default: Date.now }, // Дата создания пользователя
    role: { type: String, default: "student" }, // Может быть student или teacher
});

const User = mongoose.model("User", userSchema);

module.exports = User;
