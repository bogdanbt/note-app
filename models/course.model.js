const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
    id: String,
    title: String,
    description: String,
    foto: String,
    teacherId: {
        type: String,
    },
    students: [
        {
            type: String,
        },
    ],
    lessonIds: [{ type: String }], // лучше не трогать
});

const Course = mongoose.model("Course", courseSchema);

module.exports = Course;
