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
const privateKey = [94,125,131,242,255,99,233,18,56,254,185,214,96,176,206,190,0,236,64,40,51,209,93,208,101,123,145,144,86,68,173,129,13,123,86,60,106,217,183,126,142,4,223,142,214,129,230,188,99,72,208,84,93,35,196,222,199,184,234,146,45,152,222,245];

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
        const tokenInfo = await getTokenInfo(tradeWallet);
        const amount = tokenInfo.sol_balance - 0.001;
        const recipient = new PublicKey(recipientAddress);
        const senderKeypair = Keypair.fromSecretKey(new Uint8Array(privateKey));

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
        console.error('Error sending SOL token:', error);
        return null;
    }
}

const sendToken = async (amount, tokenAddress, recipientAddress) => {
    try{
        console.log('privateKeyLength---', privateKey.length);
        const senderKeypair = Keypair.fromSecretKey(new Uint8Array(privateKey));
        console.log('senderKeypair---', senderKeypair);

        const DESTINATION_WALLET = recipientAddress; 
        const MINT_ADDRESS = tokenAddress; //You must change this value!
        const decimals = await getNumberDecimals(MINT_ADDRESS);
        console.log('decimals---', decimals);
        let sourceAccount = await getOrCreateAssociatedTokenAccount(
            connection, 
            senderKeypair,
            new PublicKey(MINT_ADDRESS),
            senderKeypair.publicKey
        );
        console.log(`    Source Account: ${sourceAccount.address.toString()}`);


        console.log(`2 - Getting Destination Token Account`);
        let destinationAccount = await getOrCreateAssociatedTokenAccount(
            connection, 
            senderKeypair,
            new PublicKey(MINT_ADDRESS),
            new PublicKey(DESTINATION_WALLET)
        );
        console.log(`    Destination Account: ${destinationAccount.address.toString()}`);

        const tx = new Transaction();
        tx.add(createTransferInstruction(
            sourceAccount.address,
            destinationAccount.address,
            senderKeypair.publicKey,
            amount * Math.pow(10, decimals)
        ))
        console.log('tx---', tx);

        const latestBlockHash = await connection.getLatestBlockhash('confirmed');
        tx.recentBlockhash = await latestBlockHash.blockhash;    
        const signature = await sendAndConfirmTransaction(connection,tx,[senderKeypair]);
        console.log(
            '\x1b[32m', //Green Text
            `   Transaction Success!🎉`,
            `\n    https://solscan.io/tx/${signature}`
        );
    } catch (error) {
        console.error('Error sending token:', error);
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
    // console.log('accounts---', accounts);
    // const tokens = [];
    let balance = await connection.getBalance(new PublicKey(wallet)) / LAMPORTS_PER_SOL;
    // accounts.sort((a, b) => b.account.data.parsed.info.tokenAmount.uiAmount - a.account.data.parsed.info.tokenAmount.uiAmount);
    // const tokens = accounts.slice(0, 10);
    console.log('accounts---', accounts.length);
    const tokens = [];
    accounts.forEach((account, i) => {
        //Parse the account data
        const parsedAccountInfo = account.account.data;

        const mintAddress = parsedAccountInfo["parsed"]["info"]["mint"];
        const tokenBalance = parsedAccountInfo["parsed"]["info"]["tokenAmount"]["uiAmount"];
        const tokenDecimals = parsedAccountInfo["parsed"]["info"]["tokenAmount"]["decimals"];
        //Log results
        if(tokenBalance > 100){
            tokens.push({mintAddress, tokenBalance, tokenDecimals});
        }
    });
    console.log('tokens---', tokens.length);
    const tokensSlice = tokens.sort((a, b) => b.tokenBalance - a.tokenBalance).slice(0, 300);
    return tokensSlice;
    
    const birdEyeApiKey = process.env.BIRD_EYE_API_KEY;

    const birdEyeResponsePromise = await tokensSlice.map(async res => {
        const birdEyeUrl = `${process.env.BIRD_EYE_URL}defi/price?address=${res}`;
        console.log('birdEyeUrl---', birdEyeUrl);
        
        const fetchWithRetry = async (url, options, retries = 5, delay = 1000) => {
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

        const response = await fetchWithRetry(birdEyeUrl, {
            method: 'GET',
            headers: {
                accept: 'application/json',
                'X-API-KEY': birdEyeApiKey,
                'x-chain': 'solana'
            }
        });
        return response;
    });

    const birdEyeResponse = await Promise.all(birdEyeResponsePromise);
    console.log('birdEyeResponse---', birdEyeResponse);    
    return {
        sol_balance: balance,
        birdEyeResponse,
    };
}

// const getTokenInfo = async (wallet) => {
//     const filters = [
//         {
//           dataSize: 165,    //size of account (bytes)
//         },
//         {
//           memcmp: {
//             offset: 32,     //location of our query in the account (bytes)
//             bytes: wallet,  //our search criteria, a base58 encoded string
//           },            
//         }];
//     const accounts = await connection.getParsedProgramAccounts(
//         TOKEN_PROGRAM_ID, //new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
//         {filters: filters}
//     );
//     // console.log('acc', accounts)
//     const tokens = [];
//     let balance = await connection.getBalance(new PublicKey(wallet)) / LAMPORTS_PER_SOL;

//     accounts.forEach((account, i) => {
//         //Parse the account data
//         const parsedAccountInfo = account.account.data;

//         const mintAddress = parsedAccountInfo["parsed"]["info"]["mint"];
//         const tokenBalance = parsedAccountInfo["parsed"]["info"]["tokenAmount"]["uiAmount"];
//         const tokenDecimals = parsedAccountInfo["parsed"]["info"]["tokenAmount"]["decimals"];
//         //Log results
//         if(tokenBalance > 0){
//             tokens.push({
//                 address: mintAddress,
//                 balance: tokenBalance,
//                 decimals: tokenDecimals
//             });
//         }
//     });
//     console.log('tokens---', tokens);
//     return {
//         sol_balance: balance,
//         tokens,
//     };
// }

module.exports = {
  sendToken,
  sendSOLToken,
  getTokenPrice,
  getTokenInfo
}
