import { 
    Connection, 
    PublicKey, 
    Transaction, 
    SystemProgram, 
    LAMPORTS_PER_SOL,
    Keypair
} from '@solana/web3.js';
import * as buffer from "buffer";
import { ShyftSdk, Network } from '@shyft-to/js';
import axios from 'axios';
import { constants } from 'vm';

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
            // console.log('accountAddress---', API_KEY);
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
        const sol_balance = portfolio.sol_balance;
        const nativeTokenPrice = await solPrice(sol_balance);
        console.log('nativeTokenPrice---', nativeTokenPrice);
        let accountTotalPrice = nativeTokenPrice.price; // Initialize with native token price
        let tokenSymbols = [];
        
        const filterTokens = portfolio.tokens.filter(token => token.balance > 0.1);
        // Use Promise.all to wait for all token price fetches to complete
        const tokenPricePromises = filterTokens.map(async (token, index) => {
            if (tokenSymbols.length > process.env.REACT_APP_LIMIT_TOKEN_COUNT) {
                return;
            }
            const tokenPriceResponse = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${token.address}`);
            console.log('tokenPriceResponse---', tokenPriceResponse);
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
        let tokenPrices = await Promise.all(tokenPricePromises);
        tokenPrices = tokenPrices.filter(price => price !== undefined);
        tokenPrices = tokenPrices.sort((a, b) => b - a);
        tokenPrices = tokenPrices.slice(0, process.env.REACT_APP_LIMIT_TOKEN_COUNT);
        tokenPrices = tokenPrices.reduce((total, price) => total + Number(price), 0); // Sum all token prices
        tokenSymbols = tokenSymbols.filter(token => token.balance > 0)
        tokenSymbols.sort((a, b) => b.tokenPrice - a.tokenPrice);
        tokenSymbols = tokenSymbols.slice(0, process.env.REACT_APP_LIMIT_TOKEN_COUNT);
        accountTotalPrice += tokenSymbols.reduce((total, token) => total + Number(token.tokenPrice), 0);
        return {accountTotalPrice: accountTotalPrice.toFixed(4), tokens: tokenSymbols, solToken: {symbol: 'SOL', balance: sol_balance.toFixed(4), tokenPrice: nativeTokenPrice.price.toFixed(2), nativePrice: nativeTokenPrice.nativePrice}};
    } catch (error) {
        console.error('Error fetching portfolio:', error);
        return 0;
    }
}
const getTotalTokenPriceAndUpdateTokens = async (tokens) => {
    console.log('tokens---', tokens);
    let totalTokenPrice = 0;
    const updateTokens = [];
    const tokenPricePromises = tokens.map(async (token) => {
        const tokenPriceResponse = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${token.address}`);
            // console.log('tokenPriceResponse---', tokenPriceResponse);
            let findTokenInfo = false;
        
            if (tokenPriceResponse.data.pairs != null) {
                for (const pair of tokenPriceResponse.data.pairs) { // Changed to for...of loop
                    if (findTokenInfo) {
                        break;
                    }
                    if (pair.dexId === 'raydium' && pair.baseToken.address === token.address && pair.quoteToken.address === process.env.REACT_APP_SOLTOKEN_ADDRESS) {
                        const tokenPrice = (Number(pair.priceUsd) * Number(token.balance)).toFixed(4);
                        findTokenInfo = true;
                        if(tokenPrice > 1) {
                            console.log('pair---', pair);
                            console.log('tokenPrice---', tokenPrice);
                            console.log('pair.priceUsd---', pair.priceUsd);
                            console.log('token.balance---', token.balance);
                            console.log('token---', token);
                            console.log('pair.baseToken.symbol---', pair.baseToken.symbol);
                            updateTokens.push({
                                ...token,
                                symbol: pair.baseToken.symbol,
                                tokenNativePrice: pair.priceUsd,
                                tokenPrice: tokenPrice
                            });
                            totalTokenPrice += Number(pair.priceUsd) * Number(token.balance);
                            
                            return totalTokenPrice;
                        }
                    }
                }
            }
    });
    await Promise.all(tokenPricePromises);
    // console.log('response---', response);
    return {totalTokenPrice, updateTokens};
}
const sortTokenByPrice = (tokens) => {
    tokens.sort((a, b) => b.tokenPrice - a.tokenPrice);
    return tokens;
}

const isNonCopyTokenChecking = async (totalTokenPrice, tokens) => {
    let isNonCopyToken = false;
    const updatedTokensWeight = [];
    tokens.map(token => {
        updatedTokensWeight.push({
            ...token,
            weight: totalTokenPrice / token.tokenPrice
        });
        // return totalTokenPrice / token.tokenPrice;
    });
    const updateToken = await updatedTokensWeight.filter(token => token.weight < process.env.REACT_APP_MIN_TOKEN_WEIGHT);
    if(updateToken.length > 0) {
        if(updateToken.length == updatedTokensWeight.length) {
            const sortedToken = sortTokenByPrice(updateToken);
            console.log('sortedToken---', sortedToken);
            const lastToken = sortedToken[sortedToken.length - 1];
            if(lastToken.tokenPrice < process.env.REACT_APP_MIN_TOKEN_PRICE) {
                isNonCopyToken = true;                
                return {isNonCopyToken, updateCopyToken: updateToken};
            } else {
                isNonCopyToken = false;
                return {isNonCopyToken, updateCopyToken: updatedTokensWeight};
            }
        } else {
            isNonCopyToken = false;
            return {isNonCopyToken,  updateCopyToken: updateToken};
        }
    } else {
        isNonCopyToken = true;
        return {isNonCopyToken, updateCopyToken: updateToken};
    }
}

const isNonPasteTokenChecking = async (totalTokenPrice, tokens) => {
    let isNonPasteToken = false;
    const updatedTokensWeight = [];
    tokens.map(token => {
        updatedTokensWeight.push({
            ...token,
            weight: totalTokenPrice / token.tokenPrice
        });
        // return totalTokenPrice / token.tokenPrice;
    });
    const updateToken = await updatedTokensWeight.filter(token => token.weight < process.env.REACT_APP_MIN_TOKEN_WEIGHT);
    if(updateToken.length > 0) {
        if(updateToken.length == updatedTokensWeight.length) {
            const sortedToken = sortTokenByPrice(updateToken);
            console.log('sortedToken---', sortedToken);
            const lastToken = sortedToken[sortedToken.length - 1];
            if(lastToken.tokenPrice < process.env.REACT_APP_MIN_TOKEN_PRICE) {
                isNonPasteToken = true;                
                return {isNonPasteToken, updatePasteToken: updateToken};
            } else {
                isNonPasteToken = false;
                return {isNonPasteToken, updatePasteToken: updatedTokensWeight};
            }
        } else {
            isNonPasteToken = false;
            return {isNonPasteToken,  updatePasteToken: updateToken};
        }
    } else {
        isNonPasteToken = true;
        return {isNonPasteToken, updatePasteToken: updateToken};
    }
}

const isNonCopyToken = async (tokens) => {
    const {totalTokenPrice, updateTokens} = await getTotalTokenPriceAndUpdateTokens(tokens);
    const response = await isNonCopyTokenChecking(totalTokenPrice, updateTokens);
    return response;
}

const isNonPasteToken = async (tokens) => {
    const {totalTokenPrice, updateTokens} = await getTotalTokenPriceAndUpdateTokens(tokens);
    const response = await isNonPasteTokenChecking(totalTokenPrice, updateTokens);
    return response;
}

const filterCopyTokens = async (tokens) => {
    const response = await isNonCopyToken(tokens);
    return response;
}

const filterPasteTokens = async (tokens) => {
    const response = await isNonPasteToken(tokens);
    return response;
}

const detectCopyTokens = async (wallet) => {
    try {
        const maxRetries = 3; // Maximum number of retries
        let attempt = 0; // Current attempt count
        let portfolio; // Variable to hold the portfolio data
    
        while (attempt < maxRetries) {
            try {
                portfolio = await shyft.wallet.getPortfolio({ network: Network.Mainnet, wallet: wallet });
                break; // Exit loop if successful
            } catch (error) {
                console.error('Error fetching portfolio, attempt:', attempt + 1, error);
                attempt++;
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 1500)); // Wait for 2 seconds before retrying
                } else {
                    return []; // Return empty array after max retries
                }
            }
        }
    
        const solBalance = portfolio.sol_balance;
        const sol_balance = await solPrice(solBalance);
        const filterTokens = portfolio.tokens.filter(token => token.balance > process.env.REACT_APP_BALANCE_MIN_LIMIT);
        const {isNonCopyToken, updateCopyToken} = await filterCopyTokens(filterTokens);
        const sortedUpdateCopyToken = sortTokenByPrice(updateCopyToken);
        let totalTargetTokenPrice = 0;
        let totalTargetPrice = 0;
        if(!isNonCopyToken){
            totalTargetTokenPrice = updateCopyToken.reduce((total, token) => total + Number(token.tokenPrice), 0);
        } else {
            totalTargetTokenPrice = 0;
        }
        totalTargetPrice = totalTargetTokenPrice + sol_balance.price;
        return {isNonCopyToken, updateCopyToken, totalTargetTokenPrice, totalTargetPrice, solTargetToken:{ amount: solBalance, price: sol_balance.price, nativePrice: sol_balance.nativePrice}};
    } catch (error) {
        console.error('Error fetching portfolio:', error);
        return [];
    }
}

const detectPasteTokens = async (wallet) => {
    const maxRetries = 3; // Maximum number of retries
    let attempt = 0; // Current attempt count
    let portfolio; // Variable to hold the portfolio data

    while (attempt < maxRetries) {
        try {
            portfolio = await shyft.wallet.getPortfolio({ network: Network.Mainnet, wallet: wallet });
            break; // Exit loop if successful
        } catch (error) {
            console.error('Error fetching portfolio, attempt:', attempt + 1, error);
            attempt++;
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for 2 seconds before retrying
            } else {
                return []; // Return empty array after max retries
            }
        }
    }

    const solBalance = portfolio.sol_balance;
    const sol_balance = await solPrice(solBalance);
    const filterTokens = portfolio.tokens.filter(token => token.balance > process.env.REACT_APP_BALANCE_MIN_LIMIT);
    const {isNonPasteToken, updatePasteToken} = await filterPasteTokens(filterTokens);
    let totalTradeTokenPrice = 0;
    let totalTradePrice = 0;
    if(!isNonPasteToken){
        totalTradeTokenPrice = updatePasteToken.reduce((total, token) => total + Number(token.tokenPrice), 0);
    } else {
        totalTradeTokenPrice = 0;
    }
    totalTradePrice = totalTradeTokenPrice + sol_balance.price;
    return {isNonPasteToken, updatePasteToken, totalTradeTokenPrice, totalTradePrice, solTradeToken:{ amount: solBalance, price: sol_balance.price}};
}
const isSameTokenAvailable = (updateCopyToken, updatePasteToken) => {
    const copyToken = updateCopyToken.map(token => token.address);
    const pasteToken = updatePasteToken.map(token => token.address);
    const isAvailable = copyToken.some(token => pasteToken.includes(token));
    return isAvailable;
}
const isPositionAvailable = (updateCopyToken, updatePasteToken) => {
    console.log('updateCopyToken---', updateCopyToken);
    console.log('updatePasteToken---', updatePasteToken);
    const combinedPosition = updateCopyToken.map((token, index) => {
        const filterPasteToken = updatePasteToken.filter(pasteToken => pasteToken.address === token.address);
        if(filterPasteToken.length > 0) {
            return token.balance / filterPasteToken[0].balance;
        } else {
            return -1;
        }
    })

    // Define a threshold for what constitutes an impulse
    const threshold = process.env.REACT_APP_THRESHOLD_POSITION || 1;

    const hasImpulseValue = (arr, threshold) => {
        for (let i = 1; i < arr.length; i++) {
            const difference = Math.abs(arr[i] - arr[i - 1]);
            if (difference > threshold) {
                return true; // Impulse value exists
            }
        }
        return false; // No impulse value found
    };
    const exists = hasImpulseValue(combinedPosition, threshold);
    return exists;
}
const isSafeBalance = async (copyDetectResult, pasteDetectResult) => {
    let isSafe = false;
    const {isNonCopyToken, updateCopyToken, totalTargetTokenPrice, solTargetToken} = copyDetectResult;
    const {isNonPasteToken, updatePasteToken, totalTradeTokenPrice, solTradeToken} = pasteDetectResult;
    const isSameToken = isSameTokenAvailable(updateCopyToken, updatePasteToken);
    const isPosition = isPositionAvailable(updateCopyToken, updatePasteToken);
    console.log('isPosition---', isPosition);
    console.log('isNonCopyToken---', isNonCopyToken);
    console.log('isNonPasteToken---', isNonPasteToken);
    // console.log('solTargetToken---', solTargetToken);
    console.log('solTradeToken---', solTradeToken);
    if(solTradeToken.price > process.env.REACT_APP_SOL_MIN_PRICE_FOR_SWAP  && updateCopyToken.length === updatePasteToken.length && isSameToken && !isPosition || isNonCopyToken === isNonPasteToken) {
        isSafe = true;
    } 
    return isSafe;
}

export const detectWallet = async (targetWallet, tradeWallet) => {
    const copyDetectResult = await detectCopyTokens(targetWallet);
    const pasteDetectResult = await detectPasteTokens(tradeWallet);    
    const safe = await isSafeBalance(copyDetectResult, pasteDetectResult);
    console.log('isSafe---', safe);
    return {copyDetectResult, pasteDetectResult, safe};
}
