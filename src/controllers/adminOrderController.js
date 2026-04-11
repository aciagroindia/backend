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
        if (status === 'shipped' && order.orderStatus !== 'shipped') {
            try {
                const srResponse = await createShiprocketOrder(order);
                console.log("📦 SHIPROCKET FULL RESPONSE:", JSON.stringify(srResponse, null, 2));
                
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

// SHIP ORDER
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
        // 👇 --- SECURITY CHECK ADDED HERE --- 👇
        const incomingToken = req.headers['x-api-key'];
        // Render .env se token uthayega, agar wahan nahi mila toh fallback AciAgroSecret123 use karega
        const mySecretToken = process.env.SHIPROCKET_WEBHOOK_TOKEN || 'l7cMT9AEPIW#Fyi)RQ[^Ak';

        if (incomingToken !== mySecretToken) {
            console.error("🚨 Unauthorized Webhook Attempt! Wrong Token:", incomingToken);
            return res.status(401).send("Unauthorized Access: Invalid Token");
        }
        // 👆 --------------------------------- 👆

        const webhookData = req.body;
        console.log("🔔 Webhook Received from Shiprocket. Status:", webhookData.current_status);

        const shipmentId = webhookData.shipment_id;
        const newStatus = webhookData.current_status; 

        if (!shipmentId) {
            return res.status(400).send("No shipment_id received in webhook");
        }

        const order = await Order.findOne({ trackingId: String(shipmentId) });

        if (order) {
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

        res.status(200).send("Webhook received successfully");
    } catch (error) {
        console.error("❌ Webhook Error:", error);
        res.status(500).send("Server Error");
    }
};

module.exports = { getOrders, getOrderById, updateOrderStatus, shipOrder, shiprocketWebhook };