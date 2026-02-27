const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/lotController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', ctrl.getLots);
router.post('/', ctrl.createLot);
router.get('/:id', ctrl.getLot);
router.put('/:id', ctrl.updateLot);
router.delete('/:id', ctrl.deleteLot);

router.post('/:id/add-purchase', ctrl.addPurchase);
router.post('/:id/add-sale', ctrl.addSale);
router.delete('/:id/purchases/:entryId', ctrl.removePurchase);
router.delete('/:id/sales/:entryId', ctrl.removeSale);

module.exports = router;