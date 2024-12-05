const web3 = require('@solana/web3.js');
const { PublicKey, Connection } = require('@solana/web3.js');
const WebSocket = require('ws');
const { SolanaParser } = require('@debridge-finance/solana-transaction-parser');

/**
 * Verifies a Solana transaction signature
 * @param {string} signature - The transaction signature to verify
 * @param {string} network - (Optional) Solana network to use (default: 'devnet')
 * @returns {Promise<boolean>} - Returns true if transaction is valid
 */

async function verifyTransactionSignature(signature, network = 'mainnet') {
  try {
    // Connect to Solana network
    console.log('verifyTransactionSignature---', signature);
    const connection = new Connection(process.env.QUICKNODE_RPC_URL, 'confirmed');

    let transaction;
    const maxRetries = 5;
    const delay = 6000; // 6 seconds

    // Retry logic for getting transaction details
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      transaction = await connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0   
      });
      console.log(transaction);
      console.log('transaction---', transaction);
      if (transaction) {
        break; // Exit loop if transaction is found
      }
      console.log(`Attempt ${attempt + 1} failed, retrying in 3 seconds...`);
      await new Promise(resolve => setTimeout(resolve, delay)); // Wait for 3 seconds
    }

    // Verify transaction exists and is confirmed
    if (!transaction) {
      console.log('Transaction not found after multiple attempts');
      return false;
    }

    // You can add additional verification logic here
    // For example, verify amount, recipient address, etc.
    return transaction;
  } catch (error) {
    console.error('Error verifying transaction:', error);
    return false;
  }
}


module.exports = {
  verifyTransactionSignature
};