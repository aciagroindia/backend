const Order = require('../models/Order');

// GET ALL ORDERS
const getOrders = async (req, res, next) => {
    try {
        const orders = await Order.find({})
            .populate('customer', 'name email') 
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: orders });
    } catch (error) {
        next(error);
    }
};

// GET ORDER BY ID
const getOrderById = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('customer', 'name email') 
            .populate('orderItems.product', 'name image price');

        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

        res.status(200).json({ success: true, data: order });
    } catch (error) {
        next(error);
    }
};

// UPDATE STATUS
const updateOrderStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

        order.orderStatus = status;
        if (status === 'delivered') order.deliveredAt = new Date();
        await order.save();

        // RE-POPULATE before sending to frontend
        const updatedOrder = await Order.findById(order._id)
            .populate('customer', 'name email')
            .populate('orderItems.product', 'name image price');

        res.status(200).json({
            success: true,
            message: `Order status updated to ${status}`,
            data: updatedOrder, 
        });
    } catch (error) {
        next(error);
    }
};

// SHIP ORDER
const shipOrder = async (req, res, next) => {
    try {
        const { trackingId, courierName } = req.body;
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

        order.orderStatus = 'shipped';
        // Check if tracking details are sent, if not use defaults for now
        order.trackingId = trackingId || "N/A";
        order.courierName = courierName || "Local Courier";

        await order.save();
        
        const updatedOrder = await Order.findById(order._id)
            .populate('customer', 'name email')
            .populate('orderItems.product', 'name image price');

        res.status(200).json({ success: true, data: updatedOrder });
    } catch (error) {
        next(error);
    }
};

module.exports = { getOrders, getOrderById, updateOrderStatus, shipOrder };