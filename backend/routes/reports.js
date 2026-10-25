const express = require('express');
const router = express.Router();
const { exportPurchases, exportSales, getPartyTrades } = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

router.get('/purchases/export', protect, exportPurchases);
router.get('/sales/export', protect, exportSales);
router.get('/party-trades', protect, getPartyTrades);

module.exports = router;