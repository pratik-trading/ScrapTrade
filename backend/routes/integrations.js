const express = require('express');
const multer = require('multer');
const apiKey = require('../middleware/apiKey');
const {
  getParties,
  getLastInvoiceNo,
  createInvoiceSale,
} = require('../controllers/integrationController');

const router = express.Router();

// Keep the uploaded PDF in memory, then stream it to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// All integration routes require the x-api-key header
router.use(apiKey);

router.get('/parties', getParties);
router.get('/last-invoice-no', getLastInvoiceNo);
router.post('/invoice-sale', upload.single('pdf'), createInvoiceSale);

module.exports = router;