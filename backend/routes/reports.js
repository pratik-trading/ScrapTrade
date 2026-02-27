const express = require('express');
const router = express.Router();
const { exportPurchases, exportSales } = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

router.get('/purchases/export', protect, exportPurchases);
router.get('/sales/export', protect, exportSales);

module.exports = router;
