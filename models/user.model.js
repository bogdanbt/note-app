const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
    fullName: { type: String, required: true }, // Имя пользователя
    email: { type: String, required: true, unique: true }, // Email пользователя, должен быть уникальным
    password: { type: String, required: true }, // Пароль для аутентификации
    createdOn: { type: Date, default: Date.now }, // Дата создания пользователя
});

module.exports = mongoose.model("User", userSchema);
