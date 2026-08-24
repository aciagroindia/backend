const Order = require('../models/Order');
const { createShiprocketOrder, cancelShiprocketOrder } = require('../services/shiprocket.service'); // 👈 Import kiya

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

// UPDATE STATUS FUNCTION
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

        // --- SHIPROCKET CREATE MAGIC START ---
        if (status === 'shipped' && order.orderStatus !== 'shipped') {
            try {
                const srResponse = await createShiprocketOrder(order);
                console.log("📦 SHIPROCKET FULL RESPONSE:", JSON.stringify(srResponse, null, 2));
                
                order.trackingId = srResponse.shipment_id ? String(srResponse.shipment_id) : "Pending AWB";
                order.shiprocketOrderId = srResponse.order_id ? String(srResponse.order_id) : null; // 👈 NAYI LINE: Order ID bhi save karni hogi
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
        // --- SHIPROCKET CREATE MAGIC END ---

        // 👇 --- NAYA: SHIPROCKET CANCEL MAGIC START --- 👇
        if (status === 'cancelled' && order.orderStatus !== 'cancelled') {
            // Agar Shiprocket me order ban chuka tha, tabhi cancel bhejo
            if (order.shiprocketOrderId) {
                try {
                    await cancelShiprocketOrder(order.shiprocketOrderId);
                    console.log(`🚀 Shiprocket Order Cancelled Successfully! SR Order ID: ${order.shiprocketOrderId}`);
                } catch (srCancelError) {
                    console.error("❌ Shiprocket Cancel Failed:", srCancelError.message);
                    return res.status(500).json({ 
                        success: false, 
                        message: "Order cancel failed on Shiprocket! " + srCancelError.message 
                    });
                }
            } else if (order.trackingId && order.trackingId !== "Pending AWB") {
                console.log("⚠️ Note: Purane test order me Shiprocket Order ID nahi mili, isliye manually cancel karna padega.");
            }
        }
        // 👆 --- SHIPROCKET CANCEL MAGIC END --- 👆

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
        const incomingToken = req.headers['x-api-key'];
        const mySecretToken = process.env.SHIPROCKET_WEBHOOK_TOKEN || 'l7cMT9AEPIW#Fyi)RQ[^Ak';

        if (incomingToken !== mySecretToken) {
            console.error("🚨 Unauthorized Webhook Attempt! Wrong Token:", incomingToken);
            return res.status(401).send("Unauthorized Access: Invalid Token");
        }

        const webhookData = req.body;
        console.log("🔔 Webhook Received. Status:", webhookData.current_status);
        
        // 👇 Pura data print karenge taaki pata chale Shiprocket kya bhej raha hai
        console.log("📦 FULL WEBHOOK DATA:", JSON.stringify(webhookData, null, 2));

        const newStatus = webhookData.current_status; 
        const shipmentId = webhookData.shipment_id;

        // 👇 SMART CHECK FIX: Ab hum 'status' check karenge dummy ke liye, 'shipmentId' nahi
        if (!newStatus) {
            console.log("⚠️ Dummy request received (No Status). Sending 200 OK.");
            return res.status(200).send("Webhook test successful");
        }

        // Agar webhook me shipment_id hi nahi aaya
        if (!shipmentId) {
            console.log("🚨 Webhook me shipment_id nahi hai! Data update skip kar rahe hain.");
            return res.status(200).send("Received, but no shipment_id");
        }

        const order = await Order.findOne({ trackingId: String(shipmentId) });

        if (order) {
            if (newStatus === 'DELIVERED') {
                order.orderStatus = 'delivered';
                order.deliveredAt = new Date();
            } else if (newStatus === 'RTO DELIVERED' || newStatus === 'RTO INITIATED') {
                order.orderStatus = 'returned'; 
            } else if (newStatus === 'CANCELED' || newStatus === 'CANCELLED') {
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

// ==========================================
// NEW: TRACK ORDER FUNCTION (Frontend ke liye)
// ==========================================
const trackOrder = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Agar order ship hi nahi hua hai
        if (!order.trackingId || order.trackingId === "Pending AWB") {
            return res.status(400).json({ 
                success: false, 
                message: 'Tracking details not generated yet. Please wait for the order to be shipped.' 
            });
        }

        // Tracking data bhej rahe hain (Ab frontend crash nahi hoga)
        res.status(200).json({
            success: true,
            data: {
                trackingId: order.trackingId,
                courier: order.courierName || 'Shiprocket',
                trackingUrl: `https://shiprocket.co/tracking/${order.trackingId}` // Shiprocket ka direct tracking link
            }
        });
    } catch (error) {
        next(error);
    }
};

// ==========================================
// DELETE A SINGLE ORDER
// ==========================================
const deleteOrder = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        await order.deleteOne();
        res.status(200).json({
            success: true,
            message: 'Order deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

// ==========================================
// CLEANUP ALL CANCELLED ORDERS
// ==========================================
const cleanupCancelledOrders = async (req, res, next) => {
    try {
        const result = await Order.deleteMany({ orderStatus: 'cancelled' });
        res.status(200).json({
            success: true,
            message: `Cleaned up ${result.deletedCount} cancelled orders`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        next(error);
    }
};

// ==========================================
// BULK DELETE ORDERS BY IDS
// ==========================================
const bulkDeleteOrders = async (req, res, next) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, message: 'Please provide an array of order IDs' });
        }

        const result = await Order.deleteMany({ _id: { $in: ids } });
        res.status(200).json({
            success: true,
            message: `Deleted ${result.deletedCount} orders successfully`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getOrders,
    getOrderById,
    updateOrderStatus,
    shipOrder,
    shiprocketWebhook,
    trackOrder,
    deleteOrder,
    cleanupCancelledOrders,
    bulkDeleteOrders
};