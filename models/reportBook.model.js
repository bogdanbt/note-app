const mongoose = require("mongoose");

const ReportBookSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            required: true,
            unique: true,
        },
        date: {
            type: Date,
            required: true,
        },
        userId: {
            type: String,
            required: true,
        },
        courseId: {
            type: String,
            required: true,
        },
        lessonId: {
            type: String,
            required: true,
        },
        userRole: {
            type: String,
            enum: ["student", "teacher", "admin"], // Можно ограничить роли
            required: true,
        },
        paymentStatus: {
            type: String,
            enum: ["paid", "debt"], // Значения: "оплачено" или "задолженность"
            required: true,
        },
        amount: {
            type: Number,
            required: true,
        },
    },
    { timestamps: true }
);

const ReportBook = mongoose.model("ReportBook", ReportBookSchema);
module.exports = ReportBook;
