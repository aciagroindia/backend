const axios = require('axios');

const DELHIVERY_BASE_URL = process.env.DELHIVERY_BASE_URL || 'https://track.delhivery.com';

/**
 * Get Delhivery API Token from environment variables
 */
const getDelhiveryToken = () => {
    const token = process.env.DELHIVERY_API_TOKEN;
    if (!token) {
        console.warn("⚠️ Warning: DELHIVERY_API_TOKEN is not set in .env file.");
    }
    return token;
};

/**
 * Create Shipment / Order on Delhivery
 * @param {Object} orderData - Mongoose Order document
 * @returns {Promise<Object>} Response with waybill, package info, and status
 */
const createDelhiveryOrder = async (orderData) => {
    try {
        const token = getDelhiveryToken();
        if (!token) {
            throw new Error("Delhivery API Token is missing. Please add DELHIVERY_API_TOKEN to your .env file.");
        }

        // 1. Customer Name parsing
        const rawName = (
            orderData.shippingInfo?.name ||
            (orderData.customer && typeof orderData.customer === 'object' ? orderData.customer.name : null) ||
            "Customer"
        ).trim();

        // 2. Phone Number cleanup (10 digits)
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
        if (!cleanPhone || cleanPhone.length < 10) {
            cleanPhone = "9999999999";
        }

        // 3. Address Details
        const shippingAddress = (orderData.shippingInfo?.address || "Address").trim();
        const shippingCity = (orderData.shippingInfo?.city || "").trim();
        const shippingState = (orderData.shippingInfo?.state || "").trim();
        const shippingPinCode = (orderData.shippingInfo?.pinCode || orderData.shippingInfo?.postalCode || orderData.shippingInfo?.pincode || "").toString().trim();
        const shippingCountry = orderData.shippingInfo?.country || "India";

        // 4. Products description & quantity
        const items = orderData.orderItems || [];
        const productsDesc = items.map(item => `${item.name || 'Product'} (x${item.quantity || 1})`).join(', ') || "Ayurvedic Products";
        const totalQuantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0) || 1;

        // 5. Payment details
        const isCOD = orderData.paymentMethod === 'COD';
        const totalAmount = Number(orderData.totalAmount) || 0;
        const codAmount = isCOD ? totalAmount : 0;
        const paymentMode = isCOD ? 'COD' : 'Prepaid';

        // 6. Pickup Location
        const pickupLocation = process.env.DELHIVERY_PICKUP_LOCATION || "93 Narayan nagar vistar";

        // 7. Reference order ID
        const orderIdRef = orderData._id ? orderData._id.toString() : `ORD-${Date.now()}`;

        // 8. Construct Delhivery CMU Payload
        const shipmentData = {
            shipments: [
                {
                    name: rawName,
                    add: shippingAddress,
                    pin: shippingPinCode,
                    city: shippingCity,
                    state: shippingState,
                    country: shippingCountry,
                    phone: cleanPhone,
                    order: orderIdRef,
                    payment_mode: paymentMode,
                    return_pin: "",
                    return_city: "",
                    return_phone: "",
                    return_add: "",
                    return_state: "",
                    return_country: "",
                    products_desc: productsDesc,
                    hsn_code: "",
                    cod_amount: codAmount,
                    order_date: new Date(orderData.createdAt || Date.now()).toISOString().replace('T', ' ').substring(0, 19),
                    total_amount: totalAmount,
                    seller_add: "",
                    seller_name: "ACI Agro Solutions",
                    seller_inv: "",
                    quantity: totalQuantity,
                    waybill: "",
                    shipment_width: 10,
                    shipment_height: 10,
                    shipment_length: 10,
                    weight: 500, // In grams (0.5 kg)
                    seller_gst_tin: "",
                    shipping_mode: "Surface",
                    address_type: "home"
                }
            ],
            pickup_location: {
                name: pickupLocation
            }
        };

        // Delhivery CMU create API expects format=json&data=JSON_STRING as URL-encoded form data
        const postData = `format=json&data=${encodeURIComponent(JSON.stringify(shipmentData))}`;

        const config = {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Token ${token}`
            },
            timeout: 20000
        };

        const response = await axios.post(`${DELHIVERY_BASE_URL}/api/cmu/create.json`, postData, config);
        const resData = response.data;

        // Check if package was successfully generated
        if (resData && resData.packages && resData.packages.length > 0) {
            const pkg = resData.packages[0];
            if (pkg.status === 'Fail' || pkg.status === 'Failure') {
                const failReason = Array.isArray(pkg.remarks) ? pkg.remarks.join(', ') : (pkg.remarks || pkg.status);
                throw new Error(`Delhivery rejection: ${failReason}`);
            }
            return {
                success: true,
                waybill: pkg.waybill,
                order_id: pkg.refnum || orderIdRef,
                upload_wbn: resData.upload_wbn,
                raw: resData
            };
        } else if (resData && resData.success === false) {
            const errMsg = resData.error || resData.rmk || resData.message || "Failed to create order on Delhivery";
            throw new Error(`Delhivery Error: ${errMsg}`);
        }

        return {
            success: true,
            waybill: resData.upload_wbn || null,
            order_id: orderIdRef,
            raw: resData
        };

    } catch (error) {
        let exactError = "Failed to create order in Delhivery";

        if (error.response && error.response.data) {
            const data = error.response.data;
            if (data.packages && data.packages[0] && data.packages[0].remarks) {
                exactError = Array.isArray(data.packages[0].remarks)
                    ? data.packages[0].remarks.join(', ')
                    : String(data.packages[0].remarks);
            } else if (data.rmk) {
                exactError = data.rmk;
            } else if (data.error) {
                exactError = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
            } else if (data.message) {
                exactError = data.message;
            } else {
                exactError = JSON.stringify(data);
            }
        } else if (error.message) {
            exactError = error.message;
        }

        console.error("❌ Delhivery API Rejected:", exactError);
        throw new Error(`Delhivery Error: ${exactError}`);
    }
};

/**
 * Cancel an existing order / waybill on Delhivery
 * @param {string} waybill - Delhivery waybill number
 * @returns {Promise<Object>} Cancellation result
 */
const cancelDelhiveryOrder = async (waybill) => {
    try {
        const token = getDelhiveryToken();
        if (!token) {
            throw new Error("Delhivery API Token is missing in .env");
        }

        const config = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${token}`
            },
            timeout: 15000
        };

        const payload = {
            waybill: String(waybill),
            cancellation: "true"
        };

        const response = await axios.post(`${DELHIVERY_BASE_URL}/api/p/edit`, payload, config);
        const data = response.data;

        if (typeof data === 'string') {
            if (data.includes('<status>False</status>') || data.includes('Cannot be cancelled')) {
                const match = data.match(/<remark>(.*?)<\/remark>/);
                throw new Error(match ? match[1] : "Delhivery cancellation rejected");
            }
        } else if (data && data.status === false) {
            throw new Error(data.remark || data.message || "Delhivery cancellation rejected");
        }

        return { success: true, raw: data };

    } catch (error) {
        console.error("Delhivery Cancel Error:", error.response?.data || error.message);
        throw new Error(error.response?.data?.message || error.message || "Failed to cancel order on Delhivery.");
    }
};

/**
 * Track shipment by waybill
 * @param {string} waybill - Delhivery waybill number
 * @returns {Promise<Object>} Tracking details
 */
const trackDelhiveryShipment = async (waybill) => {
    try {
        const token = getDelhiveryToken();
        if (!token) {
            throw new Error("Delhivery API Token is missing in .env");
        }

        const config = {
            headers: {
                'Authorization': `Token ${token}`
            },
            timeout: 15000
        };

        const response = await axios.get(`${DELHIVERY_BASE_URL}/api/v1/packages/json/?waybill=${encodeURIComponent(waybill)}`, config);
        return response.data;

    } catch (error) {
        console.error("Delhivery Track Error:", error.response?.data || error.message);
        throw new Error(error.response?.data?.message || "Failed to fetch tracking details from Delhivery.");
    }
};

/**
 * Parse live status from Delhivery Tracking / Webhook payload
 * @param {Object} liveData - Response from Delhivery tracking API or webhook payload
 * @returns {string|null} - 'cancelled' | 'delivered' | 'returned' | 'shipped' | null
 */
const parseDelhiveryStatus = (liveData) => {
    if (!liveData) return null;

    // 1. If payload is standard tracking API response
    const shipment = liveData.ShipmentData ? liveData.ShipmentData[0]?.Shipment : liveData;
    if (!shipment) return null;

    const statusObj = shipment.Status || {};
    const statusText = String(statusObj.Status || liveData.status || liveData.Status || liveData.current_status || "").toUpperCase();
    const instructions = String(statusObj.Instructions || liveData.instructions || liveData.remark || "").toUpperCase();
    const statusCode = String(statusObj.StatusCode || liveData.status_code || liveData.statusCode || "").toUpperCase();

    // Check Scans array if present
    const scans = shipment.Scans || [];
    const hasCancelScan = scans.some(s => {
        const instr = String(s.ScanDetail?.Instructions || "").toUpperCase();
        const code = String(s.ScanDetail?.StatusCode || "").toUpperCase();
        return instr.includes('CANCEL') || code === 'DTUP-210' || code.startsWith('X-CAN') || code.startsWith('CAN');
    });

    if (
        statusText.includes('CANCEL') || 
        instructions.includes('CANCEL') || 
        instructions.includes('NOT RECEIVED FROM CLIENT') ||
        instructions.includes('SELLER CANCELLED') ||
        statusCode === 'DTUP-210' || 
        statusCode === 'X-PNP' ||
        statusCode.startsWith('X-CAN') ||
        statusCode.startsWith('CAN') ||
        hasCancelScan
    ) {
        return 'cancelled';
    }

    if (statusText === 'DELIVERED' || statusText === 'DL' || instructions.includes('DELIVERED') || statusCode === 'DL') {
        return 'delivered';
    }

    if (statusText.includes('RTO') || instructions.includes('RTO') || statusText === 'RETURNED' || statusCode.startsWith('RTO')) {
        return 'returned';
    }

    if (statusText.includes('DISPATCH') || statusText.includes('IN TRANSIT') || statusText === 'SHIPPED' || statusText === 'OUT FOR DELIVERY') {
        return 'shipped';
    }

    return null;
};

/**
 * Check Pincode Serviceability via Delhivery API
 * @param {string|number} pincode - 6 digit destination pincode
 * @returns {Promise<Object>} Serviceability details
 */
const checkPincodeServiceability = async (pincode) => {
    try {
        const token = getDelhiveryToken();
        if (!token) {
            throw new Error("Delhivery API Token is missing in .env");
        }

        const cleanPin = String(pincode || "").replace(/\D/g, '').trim();
        if (!cleanPin || cleanPin.length !== 6) {
            return {
                serviceable: false,
                message: "Please enter a valid 6-digit PIN code."
            };
        }

        const config = {
            headers: {
                'Authorization': `Token ${token}`
            },
            timeout: 10000
        };

        const response = await axios.get(`${DELHIVERY_BASE_URL}/c/api/pin-codes/json/?filter_codes=${encodeURIComponent(cleanPin)}`, config);
        const data = response.data;

        if (data && Array.isArray(data.delivery_codes) && data.delivery_codes.length > 0) {
            const postalData = data.delivery_codes[0]?.postal_code;
            if (postalData) {
                const isPrepaid = postalData.pre_paid === 'Y';
                const isCod = postalData.cod === 'Y' || postalData.cash === 'Y';

                return {
                    serviceable: isPrepaid || isCod,
                    pincode: cleanPin,
                    district: postalData.district || "",
                    city: postalData.district || postalData.city || "",
                    state: postalData.state_code || "",
                    codAvailable: isCod,
                    prepaidAvailable: isPrepaid,
                    raw: postalData
                };
            }
        }

        return {
            serviceable: false,
            pincode: cleanPin,
            message: `Delivery is currently not available to pincode ${cleanPin}.`
        };

    } catch (error) {
        console.error("Delhivery Pincode Serviceability Error:", error.response?.data || error.message);
        throw new Error(error.response?.data?.message || error.message || "Failed to check pincode serviceability.");
    }
};

/**
 * Calculate Delhivery Shipping Rate
 * @param {Object} params - { originPin, destinationPin, weightGrams, paymentMode }
 * @returns {Promise<Object>} Calculated shipping charge
 */
const calculateDelhiveryShippingRate = async ({ originPin, destinationPin, weightGrams = 500, paymentMode = 'Prepaid' }) => {
    try {
        const token = getDelhiveryToken();
        if (!token) {
            throw new Error("Delhivery API Token is missing in .env");
        }

        const origin = String(originPin || process.env.DELHIVERY_ORIGIN_PIN || '302020').replace(/\D/g, '').trim();
        const destination = String(destinationPin || "").replace(/\D/g, '').trim();
        const weight = Math.max(Number(weightGrams) || 500, 100);

        if (!destination || destination.length !== 6) {
            throw new Error("Valid 6-digit destination pincode is required to calculate rate.");
        }

        const config = {
            headers: {
                'Authorization': `Token ${token}`
            },
            params: {
                md: 'S', // Surface mode
                ss: 'Delivered',
                d_pin: destination,
                o_pin: origin,
                cgm: weight,
                pt: 'Pre-paid' // Base courier shipping rate
            },
            timeout: 10000
        };

        const response = await axios.get(`${DELHIVERY_BASE_URL}/api/kinko/v1/invoice/charges/.json`, config);
        const data = response.data;

        if (Array.isArray(data) && data.length > 0) {
            const chargeObj = data[0];
            const totalAmount = Number(chargeObj.total_amount) || 0;
            const grossAmount = Number(chargeObj.gross_amount) || 0;

            // Round shipping charge to nearest rupee or keep exact 2 decimals
            const roundedCharge = Math.round(totalAmount);

            return {
                success: true,
                shippingCharge: roundedCharge,
                exactTotal: totalAmount,
                grossAmount: grossAmount,
                zone: chargeObj.zone || "",
                chargedWeight: chargeObj.charged_weight || weight,
                raw: chargeObj
            };
        }

        throw new Error("Could not calculate rate from Delhivery.");

    } catch (error) {
        console.error("Delhivery Rate Calculation Error:", error.response?.data || error.message);
        throw new Error(error.response?.data?.message || error.message || "Failed to calculate shipping rate.");
    }
};

module.exports = {
    getDelhiveryToken,
    createDelhiveryOrder,
    cancelDelhiveryOrder,
    trackDelhiveryShipment,
    parseDelhiveryStatus,
    checkPincodeServiceability,
    calculateDelhiveryShippingRate
};

