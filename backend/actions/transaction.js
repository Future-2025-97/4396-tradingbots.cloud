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
    const connection = new web3.Connection(
      network === 'mainnet' 
        ? web3.clusterApiUrl('mainnet-beta')
        : web3.clusterApiUrl('devnet')
    );

    // Get transaction details
    const transaction = await connection.getTransaction(signature);

    // Verify transaction exists and is confirmed
    if (!transaction) {
      console.log('Transaction not found');
      return false;
    }

    // You can add additional verification logic here
    // For example, verify amount, recipient address, etc.

    return true;
  } catch (error) {
    console.error('Error verifying transaction:', error);
    return false;
  }
}


module.exports = {
  verifyTransactionSignature
};