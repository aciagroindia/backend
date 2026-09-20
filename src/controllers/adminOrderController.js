const Order = require('../models/Order');
const { createDelhiveryOrder, cancelDelhiveryOrder, trackDelhiveryShipment, parseDelhiveryStatus } = require('../services/delhivery.service');

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

        // Auto-sync in-flight orders with Delhivery (capped at 15 most recent for performance & rate-limit safety)
        const activeOrders = orders.filter(o => {
            const waybill = o.delhiveryWaybill || o.trackingId;
            return waybill && waybill !== "Pending AWB" && o.orderStatus !== 'delivered' && o.orderStatus !== 'cancelled';
        }).slice(0, 15);

        if (activeOrders.length > 0) {
            await Promise.allSettled(
                activeOrders.map(async (order) => {
                    try {
                        const waybill = order.delhiveryWaybill || order.trackingId;
                        const liveData = await trackDelhiveryShipment(waybill);
                        const liveStatus = parseDelhiveryStatus(liveData);
                        if (liveStatus && liveStatus !== order.orderStatus) {
                            order.orderStatus = liveStatus;
                            if (liveStatus === 'delivered') order.deliveredAt = new Date();
                            await order.save();
                            console.log(`🔄 Auto-synced order list ${order._id} live status to '${liveStatus}' from Delhivery`);
                        }
                    } catch (syncErr) {
                        // ignore background tracking errors for individual orders so list always succeeds
                    }
                })
            );
        }

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

        // Auto-sync live status from Delhivery if order has an active Waybill
        const waybill = order.delhiveryWaybill || order.trackingId;
        if (waybill && waybill !== "Pending AWB" && order.orderStatus !== 'delivered') {
            try {
                const liveData = await trackDelhiveryShipment(waybill);
                const liveStatus = parseDelhiveryStatus(liveData);
                if (liveStatus && liveStatus !== order.orderStatus) {
                    order.orderStatus = liveStatus;
                    if (liveStatus === 'delivered') order.deliveredAt = new Date();
                    await order.save();
                    console.log(`🔄 Auto-synced order ${order._id} live status to '${liveStatus}' from Delhivery`);
                }
            } catch (syncErr) {
                console.warn("Live status check on getOrderById notice:", syncErr.message);
            }
        }

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
            .populate('customer', 'name email phone')
            .populate('orderItems.product', 'name');

        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

        // Security check
        if ((status === 'shipped' || status === 'delivered') && order.paymentMethod !== 'COD' && order.paymentStatus !== 'paid') {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot update status to Shipped/Delivered. Payment is still pending!' 
            });
        }

        // --- DELHIVERY CREATE SHIPMENT START ---
        if (status === 'shipped' && order.orderStatus !== 'shipped') {
            try {
                const dlResponse = await createDelhiveryOrder(order);
                
                const waybill = dlResponse.waybill ? String(dlResponse.waybill) : (dlResponse.upload_wbn ? String(dlResponse.upload_wbn) : "Pending AWB");
                order.trackingId = waybill;
                order.delhiveryWaybill = dlResponse.waybill ? String(dlResponse.waybill) : null;
                order.delhiveryOrderId = dlResponse.order_id ? String(dlResponse.order_id) : String(order._id);
                order.courierName = "Delhivery";
            } catch (delhiveryError) {
                console.error("❌ Delhivery Failed:", delhiveryError.message);
                return res.status(500).json({ 
                    success: false, 
                    message: "Order update failed! " + (delhiveryError.message || "Delhivery integration issue.") 
                });
            }
        }
        // --- DELHIVERY CREATE SHIPMENT END ---

        // --- DELHIVERY CANCEL SHIPMENT START ---
        if (status === 'cancelled' && order.orderStatus !== 'cancelled') {
            const waybillToCancel = order.delhiveryWaybill || order.trackingId;
            if (waybillToCancel && waybillToCancel !== "Pending AWB") {
                try {
                    await cancelDelhiveryOrder(waybillToCancel);
                    console.log(`🚀 Delhivery Order Cancelled Successfully! Waybill: ${waybillToCancel}`);
                } catch (dlCancelError) {
                    console.error("❌ Delhivery Cancel Failed:", dlCancelError.message);
                    return res.status(500).json({ 
                        success: false, 
                        message: "Order cancel failed on Delhivery! " + dlCancelError.message 
                    });
                }
            }
        }
        // --- DELHIVERY CANCEL SHIPMENT END ---

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
// DELHIVERY WEBHOOK (System to System)
// ==========================================
const delhiveryWebhook = async (req, res) => {
    try {
        const incomingToken = req.headers['x-api-key'] || req.headers['authorization'];
        const mySecretToken = process.env.DELHIVERY_WEBHOOK_TOKEN;

        if (mySecretToken && incomingToken && !incomingToken.includes(mySecretToken)) {
            console.error("🚨 Unauthorized Webhook Attempt!");
            return res.status(401).send("Unauthorized Access: Invalid Token");
        }

        const webhookData = req.body || {};
        const waybill = webhookData.waybill || webhookData.Waybill || webhookData.shipment_id;

        if (!waybill) {
            return res.status(200).send("Webhook ping received successfully");
        }

        const order = await Order.findOne({ 
            $or: [
                { delhiveryWaybill: String(waybill) },
                { trackingId: String(waybill) }
            ]
        });

        if (order) {
            const detectedStatus = parseDelhiveryStatus(webhookData);
            if (detectedStatus && detectedStatus !== order.orderStatus) {
                order.orderStatus = detectedStatus;
                if (detectedStatus === 'delivered') order.deliveredAt = new Date();
                await order.save();
                console.log(`✅ Order ${order._id} successfully auto-updated to '${detectedStatus}' via Delhivery Webhook!`);
            }
        } else {
            console.log(`⚠️ Order with Waybill ${waybill} not found in DB.`);
        }

        res.status(200).send("Webhook received successfully");
    } catch (error) {
        console.error("❌ Delhivery Webhook Error:", error);
        res.status(500).send("Server Error");
    }
};

// Backward compatibility alias for webhook
const shiprocketWebhook = delhiveryWebhook;

// ==========================================
// TRACK ORDER FUNCTION (Frontend ke liye)
// ==========================================
const trackOrder = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (!order.trackingId || order.trackingId === "Pending AWB") {
            return res.status(400).json({ 
                success: false, 
                message: 'Tracking details not generated yet. Please wait for the order to be shipped.' 
            });
        }

        const waybill = order.delhiveryWaybill || order.trackingId;

        // Auto-sync live status from Delhivery (helpful during local testing & webhook backup)
        try {
            const liveData = await trackDelhiveryShipment(waybill);
            const liveStatus = parseDelhiveryStatus(liveData);

            if (liveStatus && liveStatus !== order.orderStatus) {
                order.orderStatus = liveStatus;
                if (liveStatus === 'delivered') order.deliveredAt = new Date();
                await order.save();
                console.log(`🔄 Auto-synced order ${order._id} live status to '${liveStatus}' from Delhivery`);
            }
        } catch (syncErr) {
            console.warn("Live tracking sync check notice:", syncErr.message);
        }

        res.status(200).json({
            success: true,
            data: {
                trackingId: waybill,
                orderStatus: order.orderStatus,
                courier: order.courierName || 'Delhivery',
                trackingUrl: `https://www.delhivery.com/track/package/${waybill}`
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
    delhiveryWebhook,
    shiprocketWebhook,
    trackOrder,
    deleteOrder,
    cleanupCancelledOrders,
    bulkDeleteOrders
};