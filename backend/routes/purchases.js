const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/purchaseController');
const { protect } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');

router.use(protect);
router.get('/', ctrl.getPurchases);
router.post('/', upload.single('pdf'), ctrl.createPurchase);
router.get('/:id', ctrl.getPurchase);
router.put('/:id', upload.single('pdf'), ctrl.updatePurchase);
router.delete('/:id', ctrl.deletePurchase);
router.post('/:id/add-payment', ctrl.addPayment);
router.delete('/:id/payments/:paymentId', ctrl.deletePayment);

module.exports = router;
