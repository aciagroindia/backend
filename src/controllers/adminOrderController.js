const Order = require('../models/Order');
const { createShiprocketOrder } = require('../services/shiprocket.service');

// GET ALL ORDERS (Strictly Filtered for Admin)
const getOrders = async (req, res, next) => {
    try {
        const orders = await Order.find({
            $or: [
                { paymentMethod: 'COD' },
                { paymentStatus: 'paid' }
            ]
        })
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

// UPDATE STATUS (Ab Dropdown se hi Shiprocket chalega!)
const updateOrderStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        // Shiprocket ke liye items ki detail chahiye hoti hai, isliye populate kiya
        const order = await Order.findById(req.params.id)
            .populate('customer', 'name email')
            .populate('orderItems.product', 'name');

        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

        // Security check
        if ((status === 'shipped' || status === 'delivered') && order.paymentMethod !== 'COD' && order.paymentStatus !== 'paid') {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot update status to Shipped/Delivered. Payment is still pending!' 
            });
        }

        // --- SHIPROCKET MAGIC START ---
        // Agar admin ne dropdown se 'shipped' select kiya hai
        if (status === 'shipped' && order.orderStatus !== 'shipped') {
            try {
                // Shiprocket API hit karo
                const srResponse = await createShiprocketOrder(order);
                console.log("📦 SHIPROCKET FULL RESPONSE:", JSON.stringify(srResponse, null, 2));
                // Tracking ID save karo
                order.trackingId = srResponse.shipment_id ? String(srResponse.shipment_id) : "Pending AWB";
                order.courierName = "Shiprocket";
                console.log("🚀 Shiprocket Order Created! Shipment ID:", srResponse.shipment_id);

            } catch (shiprocketError) {
                console.error("❌ Shiprocket Failed:", shiprocketError.message);
                return res.status(500).json({ 
                    success: false, 
                    message: "Order update failed! " + (shiprocketError.message || "Shiprocket integration issue.") 
                });
            }
        }
        // --- SHIPROCKET MAGIC END ---

        order.orderStatus = status;
        if (status === 'delivered') order.deliveredAt = new Date();
        await order.save();

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

// SHIP ORDER (Aapke purane frontend buttons ke liye safety ke taur par chhod diya)
const shipOrder = async (req, res, next) => {
    return res.status(400).json({ 
        success: false, 
        message: 'Please use the status dropdown to ship orders now.' 
    });
};

// ==========================================
// NEW: SHIPROCKET WEBHOOK (System to System)
// ==========================================
const shiprocketWebhook = async (req, res) => {
    try {
        const webhookData = req.body;
        console.log("🔔 Webhook Received from Shiprocket. Status:", webhookData.current_status);

        // Shiprocket bhejta hai shipment_id, jo humne trackingId me save ki thi
        const shipmentId = webhookData.shipment_id;
        const newStatus = webhookData.current_status; 

        if (!shipmentId) {
            return res.status(400).send("No shipment_id received in webhook");
        }

        // Database me wo order dhoondho jiski trackingId match ho
        const order = await Order.findOne({ trackingId: String(shipmentId) });

        if (order) {
            // Shiprocket ke real-time status ke hisaab se DB update karein
            if (newStatus === 'DELIVERED') {
                order.orderStatus = 'delivered';
                order.deliveredAt = new Date();
            } else if (newStatus === 'RTO DELIVERED' || newStatus === 'RTO INITIATED') {
                order.orderStatus = 'returned'; 
            } else if (newStatus === 'CANCELED') {
                order.orderStatus = 'cancelled';
            }
            
            await order.save();
            console.log(`✅ Order ${order._id} successfully auto-updated to '${order.orderStatus}' via Webhook!`);
        } else {
            console.log(`⚠️ Order with Tracking ID ${shipmentId} not found in DB.`);
        }

        // Shiprocket ko turant 200 OK bhejna zaroori hai
        res.status(200).send("Webhook received successfully");
    } catch (error) {
        console.error("❌ Webhook Error:", error);
        res.status(500).send("Server Error");
    }
};

module.exports = { getOrders, getOrderById, updateOrderStatus, shipOrder, shiprocketWebhook };