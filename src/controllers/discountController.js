const discountService = require('../services/discount.service');

exports.getDiscounts = async (req, res, next) => {
    try {
        const discounts = await discountService.getAllDiscounts();
        res.json({ success: true, data: discounts });
    } catch (error) {
        next(error);
    }
};

exports.createDiscount = async (req, res, next) => {
    try {
        const discount = await discountService.createDiscount(req.body);
        res.status(201).json({ success: true, data: discount });
    } catch (error) {
        next(error);
    }
};

exports.updateDiscount = async (req, res, next) => {
    try {
        const discount = await discountService.updateDiscount(req.params.id, req.body);
        res.json({ success: true, message: 'Discount updated successfully', data: discount });
    } catch (error) {
        next(error);
    }
};

exports.deleteDiscount = async (req, res, next) => {
    try {
        const result = await discountService.deleteDiscount(req.params.id);
        res.json({ success: true, message: result.message });
    } catch (error) {
        next(error);
    }
};