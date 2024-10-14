const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const noteSchema = new Schema({
    title: { type: String, required: true }, // Название заметки
    content: { type: String, required: true }, // Содержание заметки
    tags: { type: [String], default: [] }, // Теги для заметки (опционально)
    isPinned: { type: Boolean, default: false }, // Флаг, закреплена ли заметка
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    }, // Ссылка на пользователя, создавшего заметку
    createdOn: { type: Date, default: Date.now }, // Дата создания заметки
});

module.exports = mongoose.model("Note", noteSchema);
