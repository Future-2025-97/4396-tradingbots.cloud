require('dotenv/config');
const { swapConfig } = require('./swapConfig'); // Import the configuration
const raydiumSwap = require('./swapBaseIn');
const { Wallet } = require('@coral-xyz/anchor');
const { Connection, PublicKey, Keypair, Transaction, VersionedTransaction, TransactionMessage } = require('@solana/web3.js');
const axios = require('axios');
const { verifyTransactionSignature } = require('./transaction');

/**
 * Performs a token swap on the Raydium protocol.
 * Depending on the configuration, it can execute the swap or simulate it.
 */
const getPoolId = async (tokenAddress, SOL_ADDRESS) => {
  try {
    const poolResponse = await axios.get(`${process.env.DEXSCREENER_API_URL}${tokenAddress}`);
    const pairs = poolResponse.data.pairs;
    let findTokenInfo = false;
    for (const pair of pairs) { // Changed to for...of loop
      if (pair.dexId === 'raydium' && pair.baseToken.address === tokenAddress && pair.quoteToken.address === SOL_ADDRESS) {
        const poolKeys = await raydiumSwap.loadPoolKeys(pair.pairAddress);
        if (poolKeys !== null) {
          findTokenInfo = true;
          return pair.pairAddress;
        }
      }
    }
    if (findTokenInfo == false) {
      return null;
    }
  } catch (error) {
    console.error('Error getting pool ID:', error);
    return null;
  }
  // return poolId.data.pairs[0].poolId;
}

const swapSOLToToken = async (tokenAddress, amount, secretKey) => {
  try {
    const numArray = secretKey.split(',').map(Number);

    // Step 2: Convert the array to a Buffer
    const privateKeyBuffer = Buffer.from(numArray);

    // Output the private key buffer
    const wallet = new Wallet(Keypair.fromSecretKey(Uint8Array.from(privateKeyBuffer)));
    /**
     * The RaydiumSwap instance for handling swaps.
     */
    const SOL_ADDRESS = process.env.SOLTOKEN_ADDRESS;

    /**
     * Load pool keys from the Raydium API to enable finding pool information.
     */
    const POOL_ID = await getPoolId(tokenAddress, SOL_ADDRESS);
    const poolKeys = await raydiumSwap.loadPoolKeys(POOL_ID);
    // console.log("pool keys", poolKeys);
    /**
     * Find pool information for the given token pair.
     */

    const poolInfo = raydiumSwap.findPoolInfoForTokens(tokenAddress, SOL_ADDRESS);
    if (!poolInfo) {
      console.error('Pool info not found');
      return 'Pool info not found';
    } else {
      console.log('Found pool info');
    }

    // /**
    //  * Prepare the swap transaction with the given parameters.
    //  */
    // console.log('swapConfig.direction***', swapConfig.direction);
    const tx = await raydiumSwap.getSwapTransaction(
      tokenAddress,
      amount,
      poolInfo,
      swapConfig.maxLamports,
      swapConfig.useVersionedTransaction,
      swapConfig.direction,
      wallet
    );
    // /**
    //  * Depending on the configuration, execute or simulate the swap.
    const MAX_RETRIES = 3; 
    try {
      let simRes;
      let attempts = 0;

      // Retry logic
      while (attempts < MAX_RETRIES) {
        simRes = swapConfig.useVersionedTransaction
          ? await raydiumSwap.simulateVersionedTransaction(tx)
          : await raydiumSwap.simulateLegacyTransaction(tx, wallet);

        console.log('simRes---', simRes);
        
        if (simRes.value.err === null) {
          console.log('simulate success');
          const txid = swapConfig.useVersionedTransaction
            ? await raydiumSwap.sendVersionedTransaction(tx, swapConfig.maxRetries, wallet)
            : await raydiumSwap.sendLegacyTransaction(tx, wallet);
          const isSuccess = await verifyTransactionSignature(txid);

          if (isSuccess) {
            return {result: `https://solscan.io/tx/${txid}`};
          } else {
            return { Error: 'Transaction not found' };
          }
        } else {
          console.log('simulate failed, retrying...');
          attempts++;
        }
      }

      // If all attempts fail
      return { simRes, tx, error: 'Max retries reached' };
    } catch (error) {
      console.error('Error during swap:', error);
      return { error: error.message };
    }
  } catch (error) {
    console.error('Error during swap:', error);
    return { error: error.message };
  }
};


const swapTokenToSOL = async (tokenAddress, amount, secretKey) => {
  try {
    console.log('swapTokenToSOL---', tokenAddress, amount, secretKey);
    const numArray = secretKey.split(',').map(Number);

    // Step 2: Convert the array to a Buffer
    const privateKeyBuffer = Buffer.from(numArray);

    // Output the private key buffer
    const wallet = new Wallet(Keypair.fromSecretKey(Uint8Array.from(privateKeyBuffer)));
    /**
     * The RaydiumSwap instance for handling swaps.
     */
    const SOL_ADDRESS = process.env.SOLTOKEN_ADDRESS;
    console.log(`Raydium swap initialized swap token to sol`);
    console.log(`Swapping ${amount} of ${tokenAddress} for ${SOL_ADDRESS}...`)

    /**
     * Load pool keys from the Raydium API to enable finding pool information.
     */
    const POOL_ID = await getPoolId(tokenAddress, SOL_ADDRESS);
    const poolKeys = await raydiumSwap.loadPoolKeys(POOL_ID);
    console.log("poolKeys", poolKeys);
    /**
     * Find pool information for the given token pair.
     */

    const poolInfo = raydiumSwap.findPoolInfoForTokens(tokenAddress, SOL_ADDRESS);
    if (!poolInfo) {
      console.error('Pool info not found');
      return 'Pool info not found';
    } else {
      console.log('Found pool info');
    }

    // /**
    //  * Prepare the swap transaction with the given parameters.
    //  */

    const tx = await raydiumSwap.getSwapTransaction(
      SOL_ADDRESS,
      amount,
      poolInfo,
      swapConfig.maxLamports,
      swapConfig.useVersionedTransaction,
      swapConfig.direction,
      wallet
    );
    // /**
    //  * Depending on the configuration, execute or simulate the swap.
    const MAX_RETRIES = 3; 
    try {
      let simRes;
      let attempts = 0;

      // Retry logic
      while (attempts < MAX_RETRIES) {
        simRes = swapConfig.useVersionedTransaction
          ? await raydiumSwap.simulateVersionedTransaction(tx)
          : await raydiumSwap.simulateLegacyTransaction(tx, wallet);

        console.log('simRes---', simRes);
        
        if (simRes.value.err === null) {
          console.log('simulate success');
          const txid = swapConfig.useVersionedTransaction
            ? await raydiumSwap.sendVersionedTransaction(tx, swapConfig.maxRetries, wallet)
            : await raydiumSwap.sendLegacyTransaction(tx, wallet);
          const isSuccess = await verifyTransactionSignature(txid);

          if (isSuccess) {
            return {result: `https://solscan.io/tx/${txid}`};
          } else {
            return { Error: 'Transaction not found' };
          }
        } else {
          console.log('simulate failed, retrying...');
          attempts++;
        }
      }

      // If all attempts fail
      return { simRes, tx, error: 'Max retries reached' };
    } catch (error) {
      console.error('Error during swap:', error);
      return { error: error.message };
    }
  } catch (error) {
    console.error('Error during swap:', error);
    return { error: error.message };
  }
}

module.exports = {
  swapSOLToToken,
  swapTokenToSOL
};
