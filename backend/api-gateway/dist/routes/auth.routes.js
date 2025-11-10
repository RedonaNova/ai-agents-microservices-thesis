"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const kafka_1 = __importDefault(require("../services/kafka"));
const logger_1 = __importDefault(require("../services/logger"));
const uuid_1 = require("uuid");
const router = (0, express_1.Router)();
/**
 * POST /api/auth/register
 * Triggers welcome email flow via Kafka
 */
router.post('/register', async (req, res) => {
    try {
        const { email, name, country, investmentGoals, riskTolerance, preferredIndustry } = req.body;
        if (!email || !name) {
            return res.status(400).json({ error: 'Email and name are required' });
        }
        // Send user registration event to Kafka
        const requestId = (0, uuid_1.v4)();
        await kafka_1.default.sendEvent('user-registration-events', email, {
            requestId,
            email,
            name,
            country,
            investmentGoals,
            riskTolerance,
            preferredIndustry,
            timestamp: new Date().toISOString()
        });
        logger_1.default.info('User registration event sent', { email, requestId });
        res.status(202).json({
            success: true,
            message: 'Registration processed. Welcome email will be sent shortly.',
            requestId
        });
    }
    catch (error) {
        logger_1.default.error('Registration error', { error });
        res.status(500).json({ error: 'Failed to process registration' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.routes.js.map