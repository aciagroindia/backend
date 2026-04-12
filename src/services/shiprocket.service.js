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

        // Customer ka first name aur last name alag karna
        const nameParts = (orderData.shippingInfo.name || "Customer").split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || '.';

        // 👇 PHONE NUMBER SANITIZER
        let rawPhone = orderData.shippingInfo.phoneNo || orderData.shippingInfo.phone || orderData.shippingInfo.phoneNumber || "";
        let cleanPhone = String(rawPhone).replace(/\D/g, ''); 

        if (cleanPhone.length > 10) {
            cleanPhone = cleanPhone.slice(-10); 
        }
        if (cleanPhone.length < 10) {
            cleanPhone = "9876543210"; 
        }

        const shiprocketPayload = {
            order_id: orderData._id.toString().slice(-10),
            order_date: new Date(orderData.createdAt).toISOString().split('T')[0],
            pickup_location: "warehouse", 
            
            billing_customer_name: firstName,
            billing_last_name: lastName,
            billing_address: orderData.shippingInfo.address,
            billing_city: orderData.shippingInfo.city,
            billing_pincode: orderData.shippingInfo.pinCode || orderData.shippingInfo.pincode,
            billing_state: orderData.shippingInfo.state,
            billing_country: orderData.shippingInfo.country || "India",
            billing_email: orderData.customer.email || "customer@example.com",
            
            billing_phone: cleanPhone, 
            shipping_is_billing: true, 
            
            order_items: orderData.orderItems.map(item => ({
                name: item.name,
                sku: item.product.toString().slice(-8), 
                units: item.quantity,
                selling_price: item.price,
            })),
            
            payment_method: orderData.paymentMethod === 'COD' ? 'COD' : 'Prepaid',
            sub_total: orderData.totalAmount,
            
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