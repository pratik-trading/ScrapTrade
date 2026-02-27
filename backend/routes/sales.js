const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/saleController');
const { protect } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');

router.use(protect);
router.get('/', ctrl.getSales);
router.post('/', upload.single('pdf'), ctrl.createSale);
router.get('/:id', ctrl.getSale);
router.put('/:id', upload.single('pdf'), ctrl.updateSale);
router.delete('/:id', ctrl.deleteSale);
router.post('/:id/add-payment', ctrl.addPayment);
router.delete('/:id/payments/:paymentId', ctrl.deletePayment);

module.exports = router;
