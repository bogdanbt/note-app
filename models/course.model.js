const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
    id: String,
    title: String,
    description: String,
    date: String,
    foto: String,
    students: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", // Ссылка на модель пользователя
        },
    ],
});

const Course = mongoose.model("Course", courseSchema);

module.exports = Course;
