const express = require('express');
const router = express.Router();
const { upload } = require('../config/cloudinary');
const { requireInvoiceKey, syncInvoice } = require('../controllers/invoiceSyncController');

// key check first, then file upload, then save
router.post('/invoice-sale', requireInvoiceKey, upload.single('pdf'), syncInvoice);

module.exports = router;
