import { Router } from 'express';
import { accountController } from '../controllers/account.controller';
import {
  createAccountValidation,
  transactionValidation,
} from '../middlewares/validation.middleware';

const router = Router();

router.post('/', createAccountValidation, accountController.createAccount);
router.get('/:accountId/balance', accountController.getBalance);
router.post('/:accountId/deposit', transactionValidation, accountController.deposit);
router.post('/:accountId/withdraw', transactionValidation, accountController.withdraw);
router.patch('/:accountId/block', accountController.blockAccount);
router.get('/:accountId/statement', accountController.getStatement);

export default router;
