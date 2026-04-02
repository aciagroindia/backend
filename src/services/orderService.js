const razorpay = require("../config/razorpayConfig");

exports.createRazorpayOrder = async (amount) => {
  const options = {
    amount: amount * 100,
    currency: "INR",
    receipt: "receipt_" + Date.now(),
  };

  return await razorpay.orders.create(options);
};