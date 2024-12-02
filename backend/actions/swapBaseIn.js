// src/RaydiumSwap.js
const { Connection, PublicKey, Keypair, Transaction, VersionedTransaction, TransactionMessage } = require('@solana/web3.js');
const {
  Liquidity,
  jsonInfo2PoolKeys,
  TokenAccount,
  Token,
  TokenAmount,
  TOKEN_PROGRAM_ID,
  LIQUIDITY_STATE_LAYOUT_V4,
  Percent,
  SPL_ACCOUNT_LAYOUT,
  MARKET_STATE_LAYOUT_V3,
  Market,
  SPL_MINT_LAYOUT
} = require('@raydium-io/raydium-sdk');
const { Wallet } = require('@coral-xyz/anchor');
const bs58 = require('bs58');
const { swapConfig } = require('./swapConfig');

const connection = new Connection(process.env.QUICKNODE_RPC_URL, { commitment: 'confirmed' })
const wallet = new Wallet(Keypair.fromSecretKey(Uint8Array.from(bs58.decode(process.env.WALLET_PRIVATE_KEY))))
let allPoolKeysJson = [];

const loadPoolKeys = async () => {
    const POOL_ID = 'AQptcJhCg5k1BQpTtFDVvuZAekhm5eS49oneMfwZW9V5';
  
    const account = await connection.getAccountInfo(new PublicKey(POOL_ID))
    if (account === null) throw Error(' get id info error ')
    const info = LIQUIDITY_STATE_LAYOUT_V4.decode(account.data)
  
    const marketId = info.marketId
    const marketAccount = await connection.getAccountInfo(marketId)
    if (marketAccount === null) throw Error(' get market info error')
    const marketInfo = MARKET_STATE_LAYOUT_V3.decode(marketAccount.data)
    console.log('marketInfo***', marketInfo);
    const lpMint = info.lpMint
    const lpMintAccount = await connection.getAccountInfo(lpMint)
    console.log('lpMintAccount***', lpMintAccount.data);
    if (lpMintAccount === null) throw Error(' get lp mint info error')
    const lpMintInfo = SPL_MINT_LAYOUT.decode(lpMintAccount.data)
    const poolInfo = {
      id:POOL_ID,
      baseMint: info.baseMint.toString(),
      quoteMint: info.quoteMint.toString(),
      lpMint: info.lpMint.toString(),
      baseDecimals: info.baseDecimal.toNumber(),
      quoteDecimals: info.quoteDecimal.toNumber(),
      lpDecimals: lpMintInfo.decimals,
      version: 4,
      programId: account.owner.toString(),
      authority: Liquidity.getAssociatedAuthority({ programId: account.owner }).publicKey.toString(),
      openOrders: info.openOrders.toString(),
      targetOrders: info.targetOrders.toString(),
      baseVault: info.baseVault.toString(),
      quoteVault: info.quoteVault.toString(),
      withdrawQueue: info.withdrawQueue.toString(),
      lpVault: info.lpVault.toString(),
      marketVersion: 4,
      marketProgramId: info.marketProgramId.toString(),
      marketId: info.marketId.toString(),
      marketAuthority: Market.getAssociatedAuthority({ programId: info.marketProgramId, marketId: info.marketId }).publicKey.toString(),
      marketBaseVault: marketInfo.baseVault.toString(),
      marketQuoteVault: marketInfo.quoteVault.toString(),
      marketBids: marketInfo.bids.toString(),
      marketAsks: marketInfo.asks.toString(),
      marketEventQueue: marketInfo.eventQueue.toString(),
      lookupTableAccount: PublicKey.default.toString()
    }
    allPoolKeysJson.push(poolInfo);
    return allPoolKeysJson;
}
// Example usage
/**
 * Retrieves token accounts owned by the wallet.
 * @async
 * @returns {Promise<Array>} An array of token accounts.
 */
const getOwnerTokenAccounts = async () => {
  const walletTokenAccount = await connection.getTokenAccountsByOwner(wallet.publicKey, {
    programId: TOKEN_PROGRAM_ID,
  });

  return walletTokenAccount.value.map((i) => ({
    pubkey: i.pubkey,
    programId: i.account.owner,
    accountInfo: SPL_ACCOUNT_LAYOUT.decode(i.account.data),
  }));
}

const findPoolInfoForTokens = (mintA, mintB) => {
  const poolData = allPoolKeysJson.find(
    (i) => (i.baseMint === mintA && i.quoteMint === mintB) || (i.baseMint === mintB && i.quoteMint === mintA)
  )

  if (!poolData) return null

  return jsonInfo2PoolKeys(poolData)
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
  // fromToken: string,
  amount,
  poolKeys,
  maxLamports,
  useVersionedTransaction,
  fixedSide
) => {
  console.log('++++poolKeys***', poolKeys);
  const directionIn = poolKeys.quoteMint.toString() == toToken
  const { minAmountOut, amountIn } = await calcAmountOut(poolKeys, amount, directionIn)
  console.log({ minAmountOut, amountIn });
  console.log('amountIn', amountIn.toFixed());
  console.log('minAmountOut', minAmountOut.toFixed());
  const userTokenAccounts = await getOwnerTokenAccounts()
  const swapTransaction = await Liquidity.makeSwapInstructionSimple({
    connection,
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
  })

  const recentBlockhashForSwap = await connection.getLatestBlockhash()
  const instructions = swapTransaction.innerTransactions[0].instructions.filter(Boolean)

  if (useVersionedTransaction) {
    const versionedTransaction = new VersionedTransaction(
      new TransactionMessage({
        payerKey: wallet.publicKey,
        recentBlockhash: recentBlockhashForSwap.blockhash,
        instructions: instructions,
      }).compileToV0Message()
    )

    versionedTransaction.sign([wallet.payer])

    return versionedTransaction
  }

  const legacyTransaction = new Transaction({
    blockhash: recentBlockhashForSwap.blockhash,
    lastValidBlockHeight: recentBlockhashForSwap.lastValidBlockHeight,
    feePayer: wallet.publicKey,
  })

  legacyTransaction.add(...instructions)

  return legacyTransaction
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
const calcAmountOut = async (poolKeys, rawAmountIn, swapInDirection) => {
  const poolInfo =  await Liquidity.fetchInfo({ connection, poolKeys });
  
  let currencyInMint = poolKeys.baseMint
  let currencyInDecimals = poolInfo.baseDecimals
  let currencyOutMint = poolKeys.quoteMint
  let currencyOutDecimals = poolInfo.quoteDecimals
  if (!swapInDirection) {
    currencyInMint = poolKeys.quoteMint
    currencyInDecimals = poolInfo.quoteDecimals
    currencyOutMint = poolKeys.baseMint
    currencyOutDecimals = poolInfo.baseDecimals
  }
  const currencyIn = new Token(TOKEN_PROGRAM_ID, currencyInMint, currencyInDecimals)
  const amountIn = new TokenAmount(currencyIn, rawAmountIn, false)
  const currencyOut = new Token(TOKEN_PROGRAM_ID, currencyOutMint, currencyOutDecimals)
  const slippage = new Percent(10, 100) // 5% slippage
  
  const { amountOut, minAmountOut, currentPrice, executionPrice, priceImpact, fee } = Liquidity.computeAmountOut({
    poolKeys,
    poolInfo,
    amountIn,
    currencyOut,
    slippage,
  })

  return {
    amountIn,
    amountOut,
    minAmountOut,
    currentPrice,
    executionPrice,
    priceImpact,
    fee,
  }
}


module.exports = {
  loadPoolKeys,
  getSwapTransaction,
  findPoolInfoForTokens,
  sendLegacyTransaction,
  sendVersionedTransaction,
  simulateLegacyTransaction,
  simulateVersionedTransaction,
  getTokenAccountByOwnerAndMint,
  calcAmountOut,
}