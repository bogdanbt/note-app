const mongoose = require("mongoose");

const voucherSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
    },
    courseId: {
        type: String,
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },

    createdDate: {
        type: Date,
        default: Date.now,
    },
});

const Voucher = mongoose.model("Voucher", voucherSchema);

module.exports = Voucher;
