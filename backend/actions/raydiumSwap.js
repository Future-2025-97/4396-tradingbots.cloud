// src/RaydiumSwap.js
const { Connection, PublicKey, Keypair, Transaction, VersionedTransaction, TransactionMessage } = require('@solana/web3.js');
const {
  Liquidity,
  LiquidityPoolKeys,
  jsonInfo2PoolKeys,
  LiquidityPoolJsonInfo,
  TokenAccount,
  Token,
  TokenAmount,
  TOKEN_PROGRAM_ID,
  Percent,
  SPL_ACCOUNT_LAYOUT,
} = require('@raydium-io/raydium-sdk');
const { Wallet } = require('@coral-xyz/anchor');
const bs58 = require('bs58');
const { swapConfig } = require('./swapConfig');
/**
 * Class representing a Raydium Swap operation.
 */
const quickNodeUrl = process.env.QUICKNODE_RPC_URL;
const connection = new Connection(quickNodeUrl, 'confirmed');

const getWalletFromPrivateKey = (privateKeyString) => {
  try {
    const secretKey = Uint8Array.from(bs58.decode(privateKeyString));
    return Keypair.fromSecretKey(secretKey);
  } catch (error) {
    console.error('Failed to decode private key:', error);
    throw error; // Rethrow the error after logging
  }
}

// Example usage
const privateKeyString = process.env.WALLET_PRIVATE_KEY; // Your private key string
const wallet = getWalletFromPrivateKey(privateKeyString);
/**
 * Retrieves token accounts owned by the wallet.
 * @async
 * @returns {Promise<Array>} An array of token accounts.
 */
const getOwnerTokenAccounts = async () => {
  const walletTokenAccount = await connection.getTokenAccountsByOwner(this.wallet.publicKey, {
    programId: TOKEN_PROGRAM_ID,
  });

  return walletTokenAccount.value.map((i) => ({
    pubkey: i.pubkey,
    programId: i.account.owner,
    accountInfo: SPL_ACCOUNT_LAYOUT.decode(i.account.data),
  }));
}

/**
 * Builds a swap transaction.
 * @async
 * @param {string} toToken - The mint address of the token to receive.
 * @param {number} amount - The amount of the token to swap.
 * @param {Object} poolKeys - The liquidity pool keys.
 * @param {number} [maxLamports=100000] - The maximum lamports to use for transaction fees.
 * @param {boolean} [useVersionedTransaction=true] - Whether to use a versioned transaction.
 * @param {'in' | 'out'} [fixedSide='in'] - The fixed side of the swap ('in' or 'out').
 * @returns {Promise<Transaction | VersionedTransaction>} The constructed swap transaction.
 */
const getSwapTransaction = async (
  toToken,
  amount,
  poolKeys,
  decimalsA,
  decimalsB,
  maxLamports = 100000,
  useVersionedTransaction = true,
  fixedSide = 'in'
) => {
  console.log('wallet***', wallet);
  const directionIn = poolKeys.quoteMint.toString() === toToken;
  console.log('directionIn***', directionIn);
  const { minAmountOut, amountIn } = await calcAmountOut(poolKeys, amount, decimalsA, decimalsB, directionIn);
  console.log({ minAmountOut, amountIn });
  const userTokenAccounts = await getOwnerTokenAccounts();
  const swapTransaction = await Liquidity.makeSwapInstructionSimple({
    connection: connection,
    makeTxVersion: useVersionedTransaction ? 0 : 1,
    poolKeys: {
      ...poolKeys,
    },
    userKeys: {
      tokenAccounts: userTokenAccounts,
      owner: wallet.publicKey,
    },
    amountIn: amountIn,
    amountOut: minAmountOut,
    fixedSide: fixedSide,
    config: {
      bypassAssociatedCheck: false,
    },
    computeBudgetConfig: {
      microLamports: maxLamports,
    },
  });
  console.log('swapTransaction***', swapTransaction);
  const recentBlockhashForSwap = await connection.getLatestBlockhash();
  const instructions = swapTransaction.innerTransactions[0].instructions.filter(Boolean);

  if (useVersionedTransaction) {
    const versionedTransaction = new VersionedTransaction(
      new TransactionMessage({
        payerKey: wallet.publicKey,
        recentBlockhash: recentBlockhashForSwap.blockhash,
        instructions: instructions,
      }).compileToV0Message()
    );

    versionedTransaction.sign([wallet.payer]);

    return versionedTransaction;
  }

  const legacyTransaction = new Transaction({
    blockhash: recentBlockhashForSwap.blockhash,
    lastValidBlockHeight: recentBlockhashForSwap.lastValidBlockHeight,
    feePayer: this.wallet.publicKey,
  });

  legacyTransaction.add(...instructions);

  return legacyTransaction;
}

/**
 * Sends a legacy transaction.
 * @async
 * @param {Transaction} tx - The transaction to send.
 * @returns {Promise<string>} The transaction ID.
 */
const sendLegacyTransaction = async (tx, maxRetries) => {
  const txid = await connection.sendTransaction(tx, [wallet.payer], {
    skipPreflight: true,
    maxRetries: maxRetries,
  });

  return txid;
}

/**
 * Sends a versioned transaction.
 * @async
 * @param {VersionedTransaction} tx - The versioned transaction to send.
 * @returns {Promise<string>} The transaction ID.
 */
const sendVersionedTransaction = async (tx, maxRetries) => {
  const txid = await connection.sendTransaction(tx, {
    skipPreflight: true,
    maxRetries: maxRetries,
  });

  return txid;
}

/**
 * Simulates a versioned transaction.
 * @async
 * @param {VersionedTransaction} tx - The versioned transaction to simulate.
 * @returns {Promise<any>} The simulation result.
 */
const simulateLegacyTransaction = async (tx) => {
  const txid = await connection.simulateTransaction(tx, [wallet.payer]);

  return txid;
}

/**
 * Simulates a versioned transaction.
 * @async
 * @param {VersionedTransaction} tx - The versioned transaction to simulate.
 * @returns {Promise<any>} The simulation result.
 */
const simulateVersionedTransaction = async (tx) => {
  const txid = await connection.simulateTransaction(tx);

  return txid;
}

/**
 * Gets a token account by owner and mint address.
 * @param {PublicKey} mint - The mint address of the token.
 * @returns {TokenAccount} The token account.
 */
const getTokenAccountByOwnerAndMint = (mint) => {
  return {
    programId: TOKEN_PROGRAM_ID,
    pubkey: PublicKey.default,
    accountInfo: {
      mint: mint,
      amount: 0,
    },
  };
}

/**
 * Calculates the amount out for a swap.
 * @async
 * @param {Object} poolKeys - The liquidity pool keys.
 * @param {number} rawAmountIn - The raw amount of the input token.
 * @param {boolean} swapInDirection - The direction of the swap (true for in, false for out).
 * @returns {Promise<Object>} The swap calculation result.
 */
const  calcAmountOut = async (poolKeys, rawAmountIn, decimalsA, decimalsB, swapInDirection) => {
  console.log('poolKeys***', poolKeys);
  const poolInfo = poolKeys;
  console.log('poolInfo***', poolInfo);
  let currencyInMint = poolKeys.baseMint;
  let currencyInDecimals = decimalsA;
  let currencyOutMint = poolKeys.quoteMint;
  let currencyOutDecimals = decimalsB;

  if (!swapInDirection) {
    currencyInMint = poolKeys.quoteMint;
    currencyInDecimals = decimalsB;
    currencyOutMint = poolKeys.baseMint;
    currencyOutDecimals = decimalsA;
  }

  console.log('rawAmountIn***', rawAmountIn);

  const currencyIn = new Token(TOKEN_PROGRAM_ID, currencyInMint, currencyInDecimals);
  const amountIn = new TokenAmount(currencyIn, rawAmountIn, false);
  const currencyOut = new Token(TOKEN_PROGRAM_ID, currencyOutMint, currencyOutDecimals);
  const slippage = new Percent(5, 100); // 5% slippage
  
  console.log('slippage***', slippage);
  console.log('poolInfo***', poolInfo);
  console.log('currencyIn***', currencyIn);
  console.log('amountIn***', amountIn);
  console.log('currencyOut***', currencyOut);
  console.log('-----poolInfo***', poolInfo);
  
  const poolInfo2 = Liquidity.fetchInfo({ connection: connection, poolKeys });
  console.log('poolInfo2***', poolInfo2);
  const { amountOut, minAmountOut, currentPrice, executionPrice, priceImpact, fee } = Liquidity.computeAmountOut({
    poolKeys,
    poolInfo,
    amountIn,
    currencyOut,
    slippage,
  });

  return {
    amountIn,
    amountOut,
    minAmountOut,
    currentPrice,
    executionPrice,
    priceImpact,
    fee,
  };
}


module.exports = {
  getSwapTransaction,
  sendLegacyTransaction,
  sendVersionedTransaction,
  simulateLegacyTransaction,
  simulateVersionedTransaction,
  getTokenAccountByOwnerAndMint,
  calcAmountOut,
}