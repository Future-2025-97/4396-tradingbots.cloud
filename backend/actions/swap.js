const { Transaction, VersionedTransaction, sendAndConfirmTransaction } = require('@solana/web3.js')
const { NATIVE_MINT } = require('@solana/spl-token')
const axios = require('axios')
const { API_URLS, TxVersion, parseTokenAccountResp } = require('@raydium-io/raydium-sdk-v2')
const { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } = require('@solana/spl-token')
const { 
  Connection, 
  PublicKey, 
  SystemProgram, 
  LAMPORTS_PER_SOL,
  Keypair
} = require('@solana/web3.js');
const bs58 = require('bs58');

const getWalletFromPrivateKey = (privateKeyString) => {
  try {
    const secretKey = Uint8Array.from(bs58.decode(privateKeyString));
    return Keypair.fromSecretKey(secretKey);
  } catch (error) {
    console.error('Failed to decode private key:', error);
    throw error; // Rethrow the error after logging
  }
}

const fetchTokenAccountData = async () => {
  const solAccountResp = await connection.getAccountInfo(owner.publicKey)
  const tokenAccountResp = await connection.getTokenAccountsByOwner(owner.publicKey, { programId: TOKEN_PROGRAM_ID })
  const token2022Req = await connection.getTokenAccountsByOwner(owner.publicKey, { programId: TOKEN_2022_PROGRAM_ID })
  
  const tokenAccountData = parseTokenAccountResp({
    owner: owner.publicKey,
    solAccountResp,
    tokenAccountResp: {
      context: tokenAccountResp.context,
      value: [...tokenAccountResp.value, ...token2022Req.value],
    },
  })

  return tokenAccountData
}

// Example usage
const privateKeyString = process.env.WALLET_PRIVATE_KEY; // Your private key string
const owner = getWalletFromPrivateKey(privateKeyString);

const connection = new Connection(process.env.QUICKNODE_RPC_URL, "confirmed");

const swapTokens = async (tokenA, tokenB, amount, decimalsA, decimalsB) => {
    const response = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${tokenB}`);
    const slippage = 0.5;
    const txVersion = 'V0';
    const isV0Tx = txVersion === 'V0'
    const { data } = await axios.get(`${API_URLS.BASE_HOST}${API_URLS.PRIORITY_FEE}`)
    console.log('data***', data);

    const { data: swapResponse } = await axios.get(
      `${
        API_URLS.SWAP_HOST
      }/compute/swap-base-in?inputMint=${tokenA}&outputMint=${tokenB}&amount=${amount}&slippageBps=${
        slippage * 100}&txVersion=${txVersion}`
    )
    console.log('swapResponse***', swapResponse);


    const tokenAAddress = new PublicKey(tokenA);
    const tokenBAddress = new PublicKey(tokenB);

    const [isInputSol, isOutputSol] = [tokenA === NATIVE_MINT.toBase58(), tokenB === NATIVE_MINT.toBase58()]
    const { tokenAccounts } = await fetchTokenAccountData();

    const inputTokenAcc = tokenAccounts.find((a) => a.mint.toBase58() === tokenA)?.publicKey
    const outputTokenAcc = tokenAccounts.find((a) => a.mint.toBase58() === tokenB)?.publicKey
    
    // console.log('tokenAccounts***', tokenAccounts);
    // console.log('owner***', owner.publicKey.toBase58());
    // console.log('isInputSol***', isInputSol);
    // console.log('isOutputSol***', isOutputSol);
    // console.log('tokenAAddress***', tokenAAddress.toBase58());

    const { data: swapTransactions } = await axios.post(
      `${API_URLS.SWAP_HOST}/transaction/swap-base-in`, 
        {
        computeUnitPriceMicroLamports: String(data.data.default.h),
        swapResponse,
        txVersion,
        wallet: owner.publicKey.toBase58(),
        wrapSol: isInputSol,
        unwrapSol: isOutputSol, // true means output mint receive sol, false means output mint received wsol
        inputAccount: isInputSol ? undefined : (inputTokenAcc ? inputTokenAcc.toBase58() : undefined),
        outputAccount: isOutputSol ? undefined : (outputTokenAcc ? outputTokenAcc.toBase58() : undefined),
      }
    )

    // console.log('swapTransactions***', swapTransactions);


    const allTxBuf = swapTransactions.data.map((tx) => Buffer.from(tx.transaction, 'base64'))
    const allTransactions = allTxBuf.map((txBuf) =>
      isV0Tx ? VersionedTransaction.deserialize(txBuf) : Transaction.from(txBuf)
    )
  
    console.log(`total ${allTransactions.length} transactions`, swapTransactions)

    let idx = 0
    
    const maxRetries = 3; // Maximum number of retries
    const retryDelay = 2000; // Delay between retries in milliseconds

    const sendTransaction = async (transaction) => {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const txId = await sendAndConfirmTransaction(connection, transaction, [owner], { skipPreflight: true });
                console.log(`${++idx} transaction confirmed, txId: ${txId}`);
                return txId; // Return the transaction ID if successful
            } catch (error) {
                if (error instanceof TransactionExpiredBlockheightExceededError) {
                    console.warn(`Transaction expired, retrying... (Attempt ${attempt + 1})`);
                    await new Promise(resolve => setTimeout(resolve, retryDelay)); // Wait before retrying
                } else {
                    throw error; // Rethrow if it's a different error
                }
            }
        }
        throw new Error('Max retries reached, transaction failed.');
    };

    if (!isV0Tx) {
        for (const tx of allTransactions) {
            console.log(`${++idx} transaction sending...`);
            const transaction = tx;
            transaction.sign(owner);
            await sendTransaction(transaction); // Use the new sendTransaction function
        }
    } else {
        for (const tx of allTransactions) {
            idx++;
            const transaction = tx;
            transaction.sign([owner]);
            const txId = await connection.sendTransaction(tx, { skipPreflight: true });
            const { lastValidBlockHeight, blockhash } = await connection.getLatestBlockhash({
                commitment: 'finalized',
            });

            console.log(`${idx} transaction sending..., txId: ${txId}`);

            await connection.confirmTransaction(
                {
                    blockhash,
                    lastValidBlockHeight,
                    signature: txId,
                },
                'confirmed'
            );
            console.log(`${idx} transaction confirmed`);
        }
    }
};

module.exports = {
  swapTokens,
};
