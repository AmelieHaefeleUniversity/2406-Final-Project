const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const orderSchema = new Schema({
    restaurantID: Number,
    restaurantName: String,
    subtotal:Number,
    total: Number,
    fee: Number,
    tax:Number,
    orderItems: [],
    userWhoOrdered: String,
    userIdWhoOrdered: String
});
const Order = mongoose.model('Order',orderSchema);
module.exports = Order;