const axios = require('axios');

const SHIPROCKET_BASE_URL = 'https://apiv2.shiprocket.in/v1/external';

const getShiprocketToken = async () => {
    try {
        const response = await axios.post(`${SHIPROCKET_BASE_URL}/auth/login`, {
            email: process.env.SHIPROCKET_EMAIL,
            password: process.env.SHIPROCKET_PASSWORD
        });
        return response.data.token;
    } catch (error) {
        console.error("Shiprocket Auth Error:", error.response?.data || error.message);
        throw new Error("Shiprocket Login Failed. Please check Email and Password in .env file.");
    }
};

const createShiprocketOrder = async (orderData) => {
    try {
        const token = await getShiprocketToken();

        // 1. Real Customer Name
        const rawName = (
            orderData.shippingInfo?.name || 
            (orderData.customer && typeof orderData.customer === 'object' ? orderData.customer.name : null) || 
            "Customer"
        ).trim();

        const nameParts = rawName.split(' ').filter(Boolean);
        const firstName = nameParts[0] || "Customer";
        const lastName = nameParts.slice(1).join(' ') || (nameParts.length === 1 ? firstName : ".");

        // 2. Real Phone Number
        let rawPhone = (
            orderData.shippingInfo?.phone || 
            orderData.shippingInfo?.phoneNo || 
            orderData.shippingInfo?.phoneNumber || 
            (orderData.customer && typeof orderData.customer === 'object' ? orderData.customer.phone : null) || 
            ""
        );
        let cleanPhone = String(rawPhone).replace(/\D/g, ''); 

        if (cleanPhone.length > 10) {
            cleanPhone = cleanPhone.slice(-10); 
        }

        // 3. Real Customer Email
        const customerEmail = (
            orderData.shippingInfo?.email || 
            (orderData.customer && typeof orderData.customer === 'object' ? orderData.customer.email : null) || 
            "orders@aciagro.com"
        ).trim();

        // 4. Address Details
        const shippingAddress = orderData.shippingInfo?.address || "Address";
        const shippingCity = orderData.shippingInfo?.city || "";
        const shippingState = orderData.shippingInfo?.state || "";
        const shippingPinCode = (orderData.shippingInfo?.pinCode || orderData.shippingInfo?.postalCode || orderData.shippingInfo?.pincode || "").toString();
        const shippingCountry = orderData.shippingInfo?.country || "India";

        const shiprocketPayload = {
            order_id: orderData._id.toString().slice(-10),
            order_date: new Date(orderData.createdAt || Date.now()).toISOString().split('T')[0],
            pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || "warehouse", 
            
            billing_customer_name: firstName,
            billing_last_name: lastName,
            billing_address: shippingAddress,
            billing_city: shippingCity,
            billing_pincode: shippingPinCode,
            billing_state: shippingState,
            billing_country: shippingCountry,
            billing_email: customerEmail,
            
            billing_phone: cleanPhone || "9999999999", 
            shipping_is_billing: true, 
            
            order_items: (orderData.orderItems || []).map(item => ({
                name: item.name || "Product",
                sku: item.product?._id ? item.product._id.toString().slice(-8) : item.product.toString().slice(-8), 
                units: item.quantity || 1,
                selling_price: item.price || 0,
            })),
            
            payment_method: orderData.paymentMethod === 'COD' ? 'COD' : 'Prepaid',
            sub_total: orderData.totalAmount || 0,
            
            length: 10,
            breadth: 10,
            height: 10,
            weight: 0.5 
        };

        const config = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };

        const response = await axios.post(`${SHIPROCKET_BASE_URL}/orders/create/adhoc`, shiprocketPayload, config);
        
        if (response.data.message && !response.data.shipment_id) {
            throw new Error(`Shiprocket rejected: ${response.data.message}`);
        }

        return response.data;

    } catch (error) {
        let exactError = "Failed to create order in Shiprocket";
        
        if (error.response && error.response.data) {
            const data = error.response.data;
            if (data.errors) {
                exactError = Object.values(data.errors).flat().join(', ');
            } else if (data.message) {
                exactError = data.message;
            }
        } else if (error.message) {
            exactError = error.message; 
        }
        
        console.error("Shiprocket API Rejected:", exactError);
        throw new Error(`Shiprocket Error: ${exactError}`);
    }
};

// 👇 NAYA FUNCTION: CANCEL ORDER KE LIYE 👇
const cancelShiprocketOrder = async (shiprocketOrderId) => {
    try {
        const token = await getShiprocketToken();
        const config = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };
        
        // Shiprocket cancel API ko hamesha ek Array chahiye hota hai
        const payload = {
            ids: [shiprocketOrderId] 
        };

        const response = await axios.post(`${SHIPROCKET_BASE_URL}/orders/cancel`, payload, config);
        return response.data;

    } catch (error) {
        console.error("Shiprocket Cancel Error:", error.response?.data || error.message);
        throw new Error("Failed to cancel order on Shiprocket.");
    }
};

module.exports = {
    getShiprocketToken,
    createShiprocketOrder,
    cancelShiprocketOrder // 👈 Isko export karna mat bhoolna
};