const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
    },
    courseId: {
        type: String,
        required: true,
    },

    numberOfVouchers: {
        type: Number,
        required: true, // Количество ваучеров, приобретенных за оплату
    },
    amount: {
        type: Number,
        required: true,
    },
    paymentDate: {
        type: Date,
        default: Date.now, // Дата платежа
    },
    paymentMethod: {
        type: String,
        enum: ["cash", "card", "bank transfer"],
        required: true,
    },
    description: {
        type: String,
    },
});

const Payment = mongoose.model("Payment", paymentSchema);

module.exports = Payment;
