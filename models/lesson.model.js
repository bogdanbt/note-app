const mongoose = require("mongoose");
const LessonSchema = new mongoose.Schema(
    {
        id: {
            type: String, // Используем String для уникального ID урока
            required: true,
            unique: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
        },
        content: {
            type: String,
            required: true,
        },

        courseId: {
            type: String, // Используем String для связи с курсом
            required: true,
        },
        attendees: [{ type: String }],

        photo: {
            type: String, // Добавлено поле для фото (ссылка)
            required: false, // Фото не обязательно, чтобы избежать ошибок при добавлении старых уроков
        },
        lessonDate: {
            type: Date,
            required: true, // Сделаем обязательным
        },
    },
    { timestamps: true }
); // Добавляет временные метки createdAt и updatedAt

const Lesson = mongoose.model("Lesson", LessonSchema);
module.exports = Lesson;
