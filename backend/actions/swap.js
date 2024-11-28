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
const privateKey = [168,3,1,121,142,98,106,120,38,16,166,233,173,198,110,109,224,8,226,246,43,25,36,88,46,4,101,90,122,49,19,174,221,154,168,51,212,248,26,64,30,161,104,77,187,89,142,185,220,236,180,66,97,41,178,70,154,188,198,26,105,7,2,81];
// Example usage
const privateKeyString = process.env.WALLET_PRIVATE_KEY; // Your private key string
const owner2 = getWalletFromPrivateKey(privateKeyString);

const secretKey = Uint8Array.from(privateKey);

// Get the wallet (Keypair) from the secret key
const owner = Keypair.fromSecretKey(secretKey);

const connection = new Connection(process.env.QUICKNODE_RPC_URL, "confirmed");

const swapTokens = async (tokenA, tokenB, amount) => {
    const response = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${tokenB}`);
    const slippage = 0.05;
    const txVersion = 'V0';
    const isV0Tx = txVersion === 'V0'
    const { data } = await axios.get(`${API_URLS.BASE_HOST}${API_URLS.PRIORITY_FEE}`)
    console.log('data***', data);
    
    let swapResponse; // Declare swapResponse outside the try block
    try {
        const { data: swapResponseData } = await axios.get(
          `${
            API_URLS.SWAP_HOST
          }/compute/swap-base-out?inputMint=${tokenA}&outputMint=${tokenB}&amount=${amount}&slippageBps=${
            slippage * 100}&txVersion=${txVersion}`
        );
        swapResponse = swapResponseData; // Assign the response to swapResponse
    } catch (error) {
        console.error('Error fetching swap response:', error);
        error = error;
        return {msg:'Error fetching swap response', error: error};
    }
    
    console.log('swapResponse***', swapResponse);
    if(swapResponse.success) {

      const [isInputSol, isOutputSol] = [tokenA === NATIVE_MINT.toBase58(), tokenB === NATIVE_MINT.toBase58()]
      const { tokenAccounts } = await fetchTokenAccountData();
      console.log('tokenAccounts***', tokenAccounts);
      const inputTokenAcc = tokenAccounts.find((a) => a.mint.toBase58() === tokenA)?.publicKey
      const outputTokenAcc = tokenAccounts.find((a) => a.mint.toBase58() === tokenB)?.publicKey

      
      // console.log('tokenAccounts***', tokenAccounts);
      // console.log('owner***', owner.publicKey.toBase58());
      // console.log('isInputSol***', isInputSol);
      // console.log('isOutputSol***', isOutputSol);

      let swapTransactionsResponse; // Declare swapTransactions outside the try block
      try {
          const {data: swapTransactions} = await axios.post(
            `${API_URLS.SWAP_HOST}/transaction/swap-base-out`, 
              {
                computeUnitPriceMicroLamports: String(data.data.default.vh * 2),
                swapResponse,
                txVersion,
                wallet: owner.publicKey.toBase58(),
                wrapSol: isInputSol,
                unwrapSol: isOutputSol, // true means output mint receive sol, false means output mint received wsol
                inputAccount: isInputSol ? undefined : (inputTokenAcc ? inputTokenAcc.toBase58() : undefined),
                outputAccount: isOutputSol ? undefined : (outputTokenAcc ? outputTokenAcc.toBase58() : undefined),
              }
          );
          console.log('response***tx', response);
          swapTransactionsResponse = swapTransactions; // Assign the response to swapTransactions
      } catch (error) {
          console.error('Error fetching swap transactions:', error);
          return {msg:'Error fetching swap transactions', error: error};
      }
      console.log('swapTransactions***', swapTransactionsResponse);
      
      if(swapTransactionsResponse.success) {
        const allTxBuf = swapTransactionsResponse.data.map((tx) => Buffer.from(tx.transaction, 'base64'))
        const allTransactions = allTxBuf.map((txBuf) =>
          isV0Tx ? VersionedTransaction.deserialize(txBuf) : Transaction.from(txBuf)
        )
      console.log('allTransactions***', allTransactions);
      console.log(`total ${allTransactions.length} transactions`, swapTransactionsResponse)

      

      let idx = 0
      const MAX_RETRIES = 5; // Maximum number of retries
      const RETRY_DELAY = 3000;
      if (!isV0Tx) {
        for (const tx of allTransactions) {
          console.log(`${++idx} transaction sending...`)
          const transaction = tx
          transaction.sign(owner)
          const txId = await sendAndConfirmTransaction(connection, transaction, [owner], { skipPreflight: true })
          console.log(`${++idx} transaction confirmed, txId: ${txId}`)
        }
      } else {
        for (const tx of allTransactions) {
          idx++
          const transaction = tx
          transaction.sign([owner])
          const txId = await connection.sendTransaction(tx, { skipPreflight: true })
          
          console.log(`${idx} transaction sending..., txId: ${txId}`)

          let attempt = 0; // Initialize attempt counter
          let confirmed = false;
          while (attempt < MAX_RETRIES && !confirmed) {
            try {
              const { lastValidBlockHeight, blockhash } = await connection.getLatestBlockhash({
                commitment: 'finalized',
              })
              console.log('lastValidBlockHeight***', lastValidBlockHeight);
              console.log('blockhash***', blockhash);
                await connection.confirmTransaction(
                    {
                        blockhash,
                        lastValidBlockHeight,
                        signature: txId,
                    },
                    { commitment: 'confirmed' }
                );
                confirmed = true; // Set confirmed to true if successful
            } catch (error) {
              console.log(`Transaction expired on attempt ${attempt + 1}, retrying...`);
              attempt++; // Increment attempt counter
              await new Promise(resolve => setTimeout(resolve, RETRY_DELAY)); // Wait before retrying
            }
          }        
          if (!confirmed) {
              console.log('Transaction confirmation failed after maximum retries');
              return {status: false, msg:'Transaction confirmation failed after maximum retries'};
          } else {
            console.log(`${idx} transaction confirmed, txId: ${txId}`)
            return {status: true, msg:`Transaction confirmed ${txId}`};
          }
        }
      }
    } else {
      return {status: false, msg: swapTransactionsResponse.msg};
    }
    
  } else {
    return {status: false, msg: swapResponse.msg};
  }
};

module.exports = {
  swapTokens,
};
