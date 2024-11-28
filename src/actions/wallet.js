import { 
    Connection, 
    PublicKey, 
    Transaction, 
    SystemProgram, 
    LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import * as buffer from "buffer";
import { ShyftSdk, Network } from '@shyft-to/js';
import axios from 'axios';

const API_KEY = process.env.REACT_APP_SHYFT_API_KEY;

const shyft = new ShyftSdk({ apiKey: API_KEY, network: Network.Mainnet });
const quickNodeUrl = process.env.REACT_APP_QUICKNODE_URL;
const connection = new Connection(quickNodeUrl, 'confirmed');

// const yourWalletAddress = "random exhibit again whip cruise copy useless snap robot october cute abstract";
export const walletAddress = (address) => {
    const wallet = address.slice(0, 5) + '...' + address.slice(-5);
    return wallet;
}
 
export const formatUnixTime = (unixTimestamp) => {
    const date = new Date(unixTimestamp * 1000); // Convert seconds to milliseconds
    return date.toLocaleString(); // You can customize the format as needed
};
// Use the appropriate cluster

export const getUserBalance = async (accountAddress) => {
    try {
        if (!accountAddress) return;
        else {
            const accountPublicKey = new PublicKey(accountAddress);
            const bal = await connection.getBalance(accountPublicKey) / LAMPORTS_PER_SOL;
            return bal;
        }
    } catch (error) {
        console.error('Error fetching balance:', error);
        return 0;
    }
};  

export const depositSOLToken = async (sender, recipient, _amount) => {
    window.Buffer = buffer.Buffer;
    const amount = Number(_amount);
    if (!sender || !recipient || !amount) {
        console.error('Sender, recipient, and amount must be provided.');
        return;
    }

    if (typeof amount !== 'number' || amount <= 0) {
        console.error('Amount must be a positive number.');
        return;
    }
    const senderPublicKey = new PublicKey(sender);
    const recipientPublicKey = new PublicKey(recipient);
    
    const transaction = new Transaction().add(
        SystemProgram.transfer({
            fromPubkey: senderPublicKey,
            toPubkey: recipientPublicKey,
            lamports: amount * LAMPORTS_PER_SOL,
        })
    );    

    return transaction;
}

const solPrice = async (amount) => {
    try {
        const solTokenAddress = process.env.REACT_APP_SOLTOKEN_ADDRESS;
        const tokenPrice = await axios.get(`${process.env.REACT_APP_DEXSCREENER_API_URL}${solTokenAddress}`);
        return {price: tokenPrice.data.pairs[0].priceUsd * amount, nativePrice: tokenPrice.data.pairs[0].priceUsd};
    } catch (error) {
        console.error('Error fetching SOL price:', error);
        return 0;
    }
}

export const detectBalanceWallet = async (wallet) => {
    try {
        const portfolio = await shyft.wallet.getPortfolio({ network: Network.Mainnet, wallet: wallet });
        console.log('portfolio---', portfolio);
        const sol_balance = portfolio.sol_balance;
        const nativeTokenPrice = await solPrice(sol_balance);
        console.log(nativeTokenPrice);
        let accountTotalPrice = nativeTokenPrice.price; // Initialize with native token price
        let tokenSymbols = [];
        
        // Use Promise.all to wait for all token price fetches to complete
        const tokenPricePromises = portfolio.tokens.map(async (token, index) => {
            if (index > 100) {
                return;
            }
            const tokenPriceResponse = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${token.address}`);
            console.log('tokenPriceResponse---', tokenPriceResponse.data);
            let findTokenInfo = false;
        
            if (tokenPriceResponse.data.pairs != null) {
                for (const pair of tokenPriceResponse.data.pairs) { // Changed to for...of loop
                    if (findTokenInfo) {
                        break;
                    }
                    if (pair.dexId === 'raydium') {
                        tokenSymbols.push({
                            ...token,
                            symbol: pair.baseToken.symbol,
                            tokenNativePrice: pair.priceUsd,
                            tokenPrice: (Number(pair.priceUsd) * Number(token.balance)).toFixed(4)
                        });
                        findTokenInfo = true;
                        return (Number(pair.priceUsd) * Number(token.balance)).toFixed(4);
                    }
                }
            }
        });

        // Wait for all promises to resolve and sum the results
        const tokenPrices = await Promise.all(tokenPricePromises);
        console.log('tokenPrices---', tokenPrices);
        accountTotalPrice += tokenPrices.reduce((total, price) => price == undefined ? total : total + Number(price), 0); // Sum all token prices
        
        tokenSymbols = tokenSymbols.filter(token => token.balance > 0)
        tokenSymbols.sort((a, b) => b.balance - a.balance);
        return {accountTotalPrice: accountTotalPrice.toFixed(4), tokens: tokenSymbols, solToken: {symbol: 'SOL', balance: sol_balance.toFixed(4), tokenPrice: nativeTokenPrice.price.toFixed(2), nativePrice: nativeTokenPrice.nativePrice}};

    } catch (error) {
        console.error('Error fetching portfolio:', error);
        return 0;
    }
}
