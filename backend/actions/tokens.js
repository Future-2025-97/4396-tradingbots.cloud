const { 
    Connection, 
    PublicKey, 
    Transaction, 
    SystemProgram, 
    LAMPORTS_PER_SOL,
    sendAndConfirmTransaction,
    Keypair,
    GetProgramAccountsFilter
} = require('@solana/web3.js');
const { getOrCreateAssociatedTokenAccount, transfer, TOKEN_PROGRAM_ID, createTransferInstruction } = require('@solana/spl-token');
const axios = require('axios');

const connection = new Connection(process.env.QUICKNODE_RPC_URL, 'confirmed');

const getNumberDecimals = async (mintAddress) => {
    const info = await connection.getParsedAccountInfo(new PublicKey(mintAddress));
    const result = (info.value?.data).parsed.info.decimals;
    return result;
}
const getTokenPrice = async (mintAddress) => {
    try {
        const tokenInfo = await axios.get(`${process.env.DEXSCREENER_API_URL}${mintAddress}`);
        return tokenInfo.data.pairs[0].priceUsd;
    } catch (error) {
        console.error('Error getting token price:', error);
        return null;
    }
}

const sendSOLToken = async (tradeWallet, secretKey, recipientAddress) => {
    try {
        const privateKey = secretKey.split(',').map(Number);
        const tokenInfo = await getTokenInfo(tradeWallet);
        const amount = (tokenInfo.sol_balance - 0.001).toFixed(6);
        const recipient = new PublicKey(recipientAddress);
        const senderKeypair = Keypair.fromSecretKey(new Uint8Array(privateKey));
        console.log('amount---', amount * LAMPORTS_PER_SOL);
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: senderKeypair.publicKey,
                toPubkey: recipient,
                lamports: amount * LAMPORTS_PER_SOL,
            })
        );        
        console.log('transaction---', transaction);
        const signature = await sendAndConfirmTransaction(connection, transaction, [senderKeypair]);
        return {signature};
    } catch (error) {
        if (error) {
            console.error('Transaction Error Logs:', error);
        } else {
            console.error('Error sending SOL token:', error);
        }
        return null;
    }
}

const getTokenInfo = async (wallet) => {
    const filters = [
        {
          dataSize: 165,    //size of account (bytes)
        },
        {
          memcmp: {
            offset: 32,     //location of our query in the account (bytes)
            bytes: wallet,  //our search criteria, a base58 encoded string
          },            
        }];

    const accounts = await connection.getParsedProgramAccounts(
        TOKEN_PROGRAM_ID, //new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
        {filters: filters, dataSlice: {offset: 0, length: 2}}
    );
    let balance = await connection.getBalance(new PublicKey(wallet)) / LAMPORTS_PER_SOL;
    const tokens = [];
    accounts.forEach((account, i) => {
        const parsedAccountInfo = account.account.data;
        const mintAddress = parsedAccountInfo["parsed"]["info"]["mint"];
        const tokenBalance = parsedAccountInfo["parsed"]["info"]["tokenAmount"]["uiAmount"];
        const tokenDecimals = parsedAccountInfo["parsed"]["info"]["tokenAmount"]["decimals"];
        //Log results
        if(tokenBalance > 100){
            tokens.push({address: mintAddress, balance: tokenBalance, decimals: tokenDecimals});
        }
    });
    const tokensUpdateAndSlice = tokens.sort((a, b) => b.balance - a.balance).slice(0, 300);   
    const requestDataForPrice = tokensUpdateAndSlice.map(token => token.address);
    // return tokensUpdateAndSlice;
    const fetchWithRetry = async (url, options, retries = 5, delay = 600) => {
        try {
            const birdEyeResponse = await fetch(url, options);
            if (!birdEyeResponse.ok) {
                if (birdEyeResponse.status === 429 && retries > 0) { // Too Many Requests
                    console.log('Too Many Requests, retrying...');
                    await new Promise(res => setTimeout(res, delay)); // Wait for delay
                    return fetchWithRetry(url, options, retries - 1, delay); // Retry
                }
                throw new Error(`HTTP error! status: ${birdEyeResponse.status}`);
            }
            return await birdEyeResponse.json();
        } catch (error) {
            console.error('Fetch error:', error);
            throw error; // Rethrow error after logging
        }
    };

    const chunkArray = (array, chunkSize) => {
        const result = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            result.push(array.slice(i, i + chunkSize));
        }
        return result;
    };

    const birdEyeResponsePromise = await Promise.all(
        chunkArray(requestDataForPrice, 100).map(async chunk => {
            const birdEyeUrl = `${process.env.BIRD_EYE_URL}/defi/multi_price?check_liquidity=1&include_liquidity=true`;
            const requestDataString = chunk.join(',');

            // console.log('requestDataString---', requestDataString);
            const response = await fetchWithRetry(birdEyeUrl, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    accept: 'application/json',
                    'X-API-KEY': process.env.BIRD_EYE_API_KEY,
                    'x-chain': 'solana'
                },
                body: JSON.stringify({ list_address: requestDataString }) // Send the chunk of tokens
            });
            return response.data;
        })
    );
    let outputData = birdEyeResponsePromise.flatMap((obj, index) => {
        return Object.entries(obj).map(([address, details]) => ({ address, price: details == undefined ? null : details.value }))
    });

    tokensUpdateAndSlice.forEach(token => {
        const tokenPrice = outputData.find(item => item.address === token.address)?.price;
        token.tokenNativePrice = tokenPrice;
        token.tokenPrice = tokenPrice * token.balance;
    });
    const sortedTokens = tokensUpdateAndSlice.sort((a, b) => b.balanceUSD - a.balanceUSD).slice(0, process.env.RECOMMENDED_TOKEN_COUNT);
    
    return {
        sol_balance: balance,
        tokens: sortedTokens,
    };
}

module.exports = {
  sendSOLToken,
  getTokenPrice,
  getTokenInfo
}
