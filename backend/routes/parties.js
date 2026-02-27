const express = require('express');
const router = express.Router();
const { getParties, createParty, updateParty, deleteParty, getPartyLedger } = require('../controllers/partyController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/', getParties);
router.post('/', createParty);
router.put('/:id', updateParty);
router.delete('/:id', deleteParty);
router.get('/:id/ledger', getPartyLedger);

module.exports = router;
