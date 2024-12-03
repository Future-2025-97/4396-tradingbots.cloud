require('dotenv/config');
const { swapConfig } = require('./swapConfig'); // Import the configuration
const raydiumSwap = require('./swapBaseIn');
const { Wallet } = require('@coral-xyz/anchor');
const { Connection, PublicKey, Keypair, Transaction, VersionedTransaction, TransactionMessage } = require('@solana/web3.js');
const axios = require('axios');
// const raydiumSwapOut = require('./swapBaseOut');

/**
 * Performs a token swap on the Raydium protocol.
 * Depending on the configuration, it can execute the swap or simulate it.
 */
const getPoolId = async (tokenAddress, SOL_ADDRESS) => {
  try{
    const poolResponse = await axios.get(`${process.env.DEXSCREENER_API_URL}${tokenAddress}`);
    console.log('poolResponse', poolResponse.data);
    const pairs = poolResponse.data.pairs;
    console.log('pairs', pairs);
    let findTokenInfo = false;
    for (const pair of pairs) { // Changed to for...of loop
      if (findTokenInfo) {
          break;
      }
      if (pair.dexId === 'raydium' && pair.baseToken.address === tokenAddress && pair.quoteToken.address === SOL_ADDRESS) {
        console.log('pair', pair);
        return pair.pairAddress;
      }
    }
  } catch (error) {
    console.error('Error getting pool ID:', error);
    return null;
  }
    // return poolId.data.pairs[0].poolId;
}
const swapSOLToToken = async (tokenAddress, amount, secretKey) => {
    const numArray = secretKey.split(',').map(Number);

    // Step 2: Convert the array to a Buffer
    const privateKeyBuffer = Buffer.from(numArray);

    // Output the private key buffer
    console.log('privateKeyBuffer', privateKeyBuffer);
    const wallet = new Wallet(Keypair.fromSecretKey(Uint8Array.from(privateKeyBuffer)));
    console.log('wallet', wallet);
    /**
     * The RaydiumSwap instance for handling swaps.
     */
    const SOL_ADDRESS = process.env.SOLTOKEN_ADDRESS;
    console.log(`Raydium swap initialized`);
    if(swapConfig.direction === 'in'){
      console.log(`Swapping ${amount} of ${tokenAddress} for ${SOL_ADDRESS}...`)
    }else{
      console.log(`Swapping ${amount} of ${tokenAddress} for ${SOL_ADDRESS}...`)
    }

  /**
   * Load pool keys from the Raydium API to enable finding pool information.
   */
  const POOL_ID = await getPoolId(tokenAddress, SOL_ADDRESS);
  console.log('POOL_ID', POOL_ID);
  const poolKeys = await raydiumSwap.loadPoolKeys(POOL_ID);
  console.log(`poolKeys`, poolKeys);
  /**
   * Find pool information for the given token pair.
   */
  // return poolKeys;
  const poolInfo = raydiumSwap.findPoolInfoForTokens(tokenAddress, SOL_ADDRESS);
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
  try{
    const simRes = swapConfig.useVersionedTransaction
        ? await raydiumSwap.simulateVersionedTransaction(tx)
        : await raydiumSwap.simulateLegacyTransaction(tx, wallet);
    
        if(simRes.value.err === null){ 
          console.log('simulate success');
          const txid = swapConfig.useVersionedTransaction
            ? await raydiumSwap.sendVersionedTransaction(tx, swapConfig.maxRetries, wallet)
            : await raydiumSwap.sendLegacyTransaction(tx, wallet);

          return `https://solscan.io/tx/${txid}`;
        } else{
          console.log('simulate failed');
          return {simRes, tx};
        }
  } catch (error) {
    console.error('Error during swap:', error);
    return { error: error.message };
  }
};


const swapTokenToSOL = async (tokenAddress, amount, secretKey) => {
  console.log('-----Here-----');
    console.log('swapTokenToSOL---', tokenAddress, amount, secretKey);
    const numArray = secretKey.split(',').map(Number);

    // Step 2: Convert the array to a Buffer
    const privateKeyBuffer = Buffer.from(numArray);

    // Output the private key buffer
    console.log('privateKeyBuffer', privateKeyBuffer);
    const wallet = new Wallet(Keypair.fromSecretKey(Uint8Array.from(privateKeyBuffer)));
    console.log('wallet', wallet);
    /**
     * The RaydiumSwap instance for handling swaps.
     */
    const SOL_ADDRESS = process.env.SOLTOKEN_ADDRESS;
    console.log(`Raydium swap initialized`);
    console.log(`Swapping ${amount} of ${tokenAddress} for ${SOL_ADDRESS}...`)

  /**
   * Load pool keys from the Raydium API to enable finding pool information.
   */
  const POOL_ID = await getPoolId(tokenAddress, SOL_ADDRESS);
  console.log('POOL_ID', POOL_ID);
  const poolKeys = await raydiumSwap.loadPoolKeys(POOL_ID);
  console.log(`poolKeys`, poolKeys);
  /**
   * Find pool information for the given token pair.
   */
  // return poolKeys;
  const poolInfo = raydiumSwap.findPoolInfoForTokens(tokenAddress, SOL_ADDRESS);
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
  try{
        const simRes = swapConfig.useVersionedTransaction
            ? await raydiumSwap.simulateVersionedTransaction(tx)
            : await raydiumSwap.simulateLegacyTransaction(tx, wallet);
        if(simRes.value.err === null){ 
          console.log('simulate success');
          const txid = swapConfig.useVersionedTransaction
            ? await raydiumSwap.sendVersionedTransaction(tx, swapConfig.maxRetries, wallet)
            : await raydiumSwap.sendLegacyTransaction(tx, wallet);

          return `https://solscan.io/tx/${txid}`;
        } else{
          console.log('simulate failed');
          return {simRes, tx};
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
