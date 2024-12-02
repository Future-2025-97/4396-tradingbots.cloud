const RaydiumSwap = require('./swapBaseIn');
const { Transaction, VersionedTransaction } = require('@solana/web3.js');
require('dotenv/config');
const { swapConfig } = require('./swapConfig'); // Import the configuration
const raydiumSwap = require('./swapBaseIn');
// const raydiumSwapOut = require('./swapBaseOut');

/**
 * Performs a token swap on the Raydium protocol.
 * Depending on the configuration, it can execute the swap or simulate it.
 */

const swapBase = async (tokenAAddress, tokenBAddress, amount, wallet) => {
  /**
   * The RaydiumSwap instance for handling swaps.
   */
  console.log(`Raydium swap initialized`);
  if(swapConfig.direction === 'in'){
    console.log(`Swapping ${swapConfig.tokenAmount} of ${swapConfig.tokenAAddress} for ${swapConfig.tokenBAddress}...`)
  }else{
    console.log(`Swapping ${swapConfig.tokenAmount} of ${swapConfig.tokenBAddress} for ${swapConfig.tokenAAddress}...`)
  }

  /**
   * Load pool keys from the Raydium API to enable finding pool information.
   */
  const poolKeys = await raydiumSwap.loadPoolKeys(tokenAAddress, tokenBAddress);
  console.log(`poolKeys`, poolKeys);
  /**
   * Find pool information for the given token pair.
   */
  // return poolKeys;
  const poolInfo = raydiumSwap.findPoolInfoForTokens(swapConfig.tokenAAddress, swapConfig.tokenBAddress);
  console.log('poolInfo', poolInfo);
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
  console.log('++++poolInfo', poolInfo);
  const tx = await raydiumSwap.getSwapTransaction(
    swapConfig.tokenBAddress,
    swapConfig.tokenAmount,
    poolInfo,
    swapConfig.maxLamports, 
    swapConfig.useVersionedTransaction,
    swapConfig.direction
  );
  // /**
  //  * Depending on the configuration, execute or simulate the swap.
  //  */
  console.log('tx', tx);
  if (swapConfig.executeSwap) {
    /**
     * Send the transaction to the network and log the transaction ID.
     */
    const txid = swapConfig.useVersionedTransaction
      ? await raydiumSwap.sendVersionedTransaction(tx, swapConfig.maxRetries)
      : await raydiumSwap.sendLegacyTransaction(tx, swapConfig.maxRetries);

    console.log(`https://solscan.io/tx/${txid}`);
    return `https://solscan.io/tx/${txid}`;

  } else {
    /**
     * Simulate the transaction and log the result.
     */
    const simRes = swapConfig.useVersionedTransaction
      ? await raydiumSwap.simulateVersionedTransaction(tx)
      : await raydiumSwap.simulateLegacyTransaction(tx);

    console.log(simRes);
    console.log('simulate success');
    return {simRes, tx};
  }
};

module.exports = {
  swapBase
};
