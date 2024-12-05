import { 
    Connection, 
    PublicKey, 
    Transaction, 
    SystemProgram, 
    LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import * as buffer from "buffer";
import axios from 'axios';
import api from '../api';
import { getTokenInfo } from './token';
import bigInt from "big-integer";

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
    console.log('sender---', sender);
    console.log('recipient---', recipient);
    console.log('_amount---', _amount);
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
            lamports: bigInt(amount * LAMPORTS_PER_SOL),
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
        const portfolio = await getTokenInfo(wallet);
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
            const tokenPriceResponse = await axios.get(`${process.env.REACT_APP_DEXSCREENER_API_URL}${token.address}`);
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
        console.log('token---', token);
        const tokenPriceResponse = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${token.address}`);
            // console.log('tokenPriceResponse---', tokenPriceResponse);
            let findTokenInfo = false;
            console.log('tokenPriceResponse---', tokenPriceResponse);
            if (tokenPriceResponse.data.pairs != null) {
                for (const pair of tokenPriceResponse.data.pairs) { // Changed to for...of loop
                    if (findTokenInfo) {
                        break;
                    }
                    if (pair.dexId === 'raydium' && pair.baseToken.address === token.address && pair.quoteToken.address === process.env.REACT_APP_SOLTOKEN_ADDRESS) {
                        
                            const tokenPrice = (Number(pair.priceUsd) * Number(token.balance)).toFixed(4);
                            findTokenInfo = true;
                            console.log('/////tokenPrice---', tokenPrice);
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
                        // }
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
    try {
        console.log('totalTokenPrice---', totalTokenPrice);
        console.log('tokens---', tokens);
        let isNonCopyToken = false;
        const updatedTokensWeight = [];
        await tokens.map(async (token) => {
            updatedTokensWeight.push({
                ...token,
                weight: totalTokenPrice / token.tokenPrice
            });
            // return totalTokenPrice / token.tokenPrice;
        });
        
        console.log('updatedTokensWeight---', updatedTokensWeight);
        const updateToken = await updatedTokensWeight.filter(token => token.weight < process.env.REACT_APP_MIN_TOKEN_WEIGHT && Number(token.tokenPrice) > process.env.REACT_APP_MIN_TOKEN_PRICE);
        if(updateToken.length > 0) {
            if(updateToken.length == updatedTokensWeight.length) {
                const sortedToken = sortTokenByPrice(updateToken);
                console.log('sortedToken---', sortedToken);
                const lastToken = sortedToken[sortedToken.length - 1];
                if(Number(lastToken.tokenPrice) < process.env.REACT_APP_MIN_TOKEN_PRICE) {
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
    } catch (error) {
        console.error('Error fetching portfolio:', error);
        return {isNonCopyToken: false, updateCopyToken: []};
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
    const updateToken = await updatedTokensWeight.filter(token => token.weight < process.env.REACT_APP_MIN_TOKEN_WEIGHT && Number(token.tokenPrice) > process.env.REACT_APP_MIN_TOKEN_PRICE);
    if(updateToken.length > 0) {
        if(updateToken.length == updatedTokensWeight.length) {
            const sortedToken = sortTokenByPrice(updateToken);
            console.log('sortedToken---', sortedToken);
            const lastToken = sortedToken[sortedToken.length - 1];
            if(Number(lastToken.tokenPrice) < process.env.REACT_APP_MIN_TOKEN_PRICE) {
                console.log('/////lastToken---///////', lastToken.tokenPrice);
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
const filterAvailableSwapTokens = async (tokens) => {
    try {
        const availableSwapTokens = await tokens.map(async (token) => {
            const isSwapAvailable = await api.isSwapAvailable(token.address);
            if(isSwapAvailable.data.msg !== false){
                console.log('token---here');
                return token;
            }
            console.log('token---not here');
            return null;  // explicitly return null
        });
        const availableSwap = await Promise.all(availableSwapTokens);
        // Filter out null values from the results
        return availableSwap.filter(token => token !== null);
    } catch (error) {
        console.error('Error fetching available swap tokens:', error);
        return [];
    }
}
const isNonCopyToken = async (tokens, userInfo) => {
    const {totalTokenPrice, updateTokens} = await getTotalTokenPriceAndUpdateTokens(tokens);
    const availableSwapTokens = await filterAvailableSwapTokens(updateTokens);
    const response = await isNonCopyTokenChecking(totalTokenPrice, availableSwapTokens);
    return response;
}

const isNonPasteToken = async (tokens) => {
    const {totalTokenPrice, updateTokens} = await getTotalTokenPriceAndUpdateTokens(tokens);
    const response = await isNonPasteTokenChecking(totalTokenPrice, updateTokens);
    return response;
}

const filterCopyTokens = async (tokens, userInfo) => {
    const response = await isNonCopyToken(tokens, userInfo);
    return response;
}

const filterPasteTokens = async (tokens) => {
    const response = await isNonPasteToken(tokens);
    return response;
}

const detectCopyTokens = async (wallet, userInfo) => {
    try {
        const maxRetries = 3; // Maximum number of retries
        let attempt = 0; // Current attempt count
        let portfolio; // Variable to hold the portfolio data
    
        while (attempt < maxRetries) {
            try {
                portfolio = await getTokenInfo(wallet);
                console.log('portfolio---', portfolio);
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
        console.log('filterTokens---', filterTokens);
        const {isNonCopyToken, updateCopyToken} = await filterCopyTokens(filterTokens, userInfo);
        
        
        let sortedUpdateCopyToken = sortTokenByPrice(updateCopyToken);
        if(userInfo !== null) {
            const limitTokenCount = userInfo.membership.maxCopyTokens;
            if(sortedUpdateCopyToken.length > limitTokenCount) {
                sortedUpdateCopyToken = sortedUpdateCopyToken.slice(0, limitTokenCount);
            }
        }
        let totalTargetTokenPrice = 0;
        let totalTargetPrice = 0;
        if(!isNonCopyToken){
            totalTargetTokenPrice = sortedUpdateCopyToken.reduce((total, token) => total + Number(token.tokenPrice), 0);
        } else {
            totalTargetTokenPrice = 0;
        }
        totalTargetPrice = totalTargetTokenPrice + sol_balance.price;
        return {isNonCopyToken, updateCopyToken: sortedUpdateCopyToken, totalTargetTokenPrice, totalTargetPrice, solTargetToken:{ amount: solBalance, price: sol_balance.price, nativePrice: sol_balance.nativePrice}};
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
            portfolio = await getTokenInfo(wallet);
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
        console.log('!!!!====!!!!!updatePasteToken---', updatePasteToken);
        totalTradeTokenPrice = updatePasteToken.reduce((total, token) => total + Number(token.tokenPrice), 0);
    } else {
        totalTradeTokenPrice = 0;
    }
    totalTradePrice = totalTradeTokenPrice + sol_balance.price;
    return {isNonPasteToken, updatePasteToken, totalTradeTokenPrice, totalTradePrice, solTradeToken:{ amount: solBalance, price: sol_balance.price, nativePrice: sol_balance.nativePrice}};
}

const isSameTokenAvailable = (updateCopyToken, updatePasteToken) => {
    try {
        if(updateCopyToken.length == 0 && updatePasteToken.length == 0) {
            return true;
        }
        const copyToken = updateCopyToken.map(token => token.address);
        const pasteToken = updatePasteToken.map(token => token.address);
        const isAvailable = copyToken.some(token => pasteToken.includes(token));
        return isAvailable;
    } catch (error) {
        console.error('Error fetching portfolio:', error);
        return false;
    }
}

const isPositionAvailable = (updateCopyToken, updatePasteToken) => {
    
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
    console.log('exists---', exists);
    return exists;
}
const getIsPositionSafe = (updateCopyToken, updatePasteToken, positionValue) => {
    let isPositionSafe = true;
    console.log('positionValue---', positionValue);
    const combinedPosition = updateCopyToken.map((token, index) => {
        const filterPasteToken = updatePasteToken.filter(pasteToken => pasteToken.address === token.address);
        if(filterPasteToken.length > 0) {
            return token.balance / filterPasteToken[0].balance;
        } else {
            return -1;
        }
    })
    console.log('combinedPosition---', combinedPosition);
    combinedPosition.map(position => {
        if (Math.abs(positionValue - position) > positionValue * process.env.REACT_APP_MIN_POSITION_VALUE) {
            isPositionSafe = false;
        }
    })
    return isPositionSafe;
}

const isSafeBalance = async (copyDetectResult, pasteDetectResult) => {
    console.log('here---');
    console.log('here---');
    let isSafe = false;
    const requestData = [];
    const {isNonCopyToken, updateCopyToken, totalTargetTokenPrice, solTargetToken} = copyDetectResult;
    const {isNonPasteToken, updatePasteToken, totalTradeTokenPrice, solTradeToken} = pasteDetectResult;
    const positionValue = totalTargetTokenPrice / (totalTradeTokenPrice + solTradeToken.price - process.env.REACT_APP_SOL_NORMAL_PRICE_FOR_SWAP);
    // console.log('positionValue---', positionValue);
    const isSameToken = isSameTokenAvailable(updateCopyToken, updatePasteToken);
    const isPosition = isPositionAvailable(updateCopyToken, updatePasteToken);
    const isPositionSafe = getIsPositionSafe(updateCopyToken, updatePasteToken, positionValue);
    console.log('isPositionSafe---', isPositionSafe);
    if(solTradeToken.price > process.env.REACT_APP_SOL_MIN_PRICE_FOR_SWAP && updateCopyToken.length === updatePasteToken.length && isSameToken && !isPosition && isNonCopyToken === isNonPasteToken && isPositionSafe) {
        console.log('isSafe--- ------++++++++++');
        isSafe = true;
    } 
    if (solTradeToken.price <= process.env.REACT_APP_SOL_MIN_PRICE_FOR_SWAP) {
        let msg = 'Sol balance for trader is too low for swap';
        let index = 1;
        isSafe = false;
        requestData.push({
            msg: msg,
            index: index
        });
    }
    if (!isPositionSafe) {
        let msg = 'Position balance has been damaged';
        let index = 7;
        isSafe = false;
        requestData.push({
            msg: msg,
            index: index
        });
    }    
    if((updateCopyToken.length == 0 && updatePasteToken.length != 0) || (updateCopyToken.length != 0 && updatePasteToken.length == 0)) {
        let msg = 'Copy token or paste token is empty';
        let index = 2;
        isSafe = false;
        requestData.push({
            msg: msg,
            index: index
        });
    }
    if (isNonCopyToken !== isNonPasteToken) {
        let msg = 'Copy and paste token didn\'t matched';
        let index = 3;
        isSafe = false;
        requestData.push({
            msg: msg,
            index: index
        });
    }
    if (updateCopyToken.length !== updatePasteToken.length) {
        let msg = 'Copy and paste token length are not same';
        let index = 4;
        isSafe = false;
        requestData.push({
            msg: msg,
            index: index
        });
    }
    if (!isSameToken) {
        let msg = 'Same token is not allowed';
        let index = 5;  
        isSafe = false;
        requestData.push({
            msg: msg,
            index: index
        });
    }
    if (isPosition) {
        let msg = 'Position balance has been damaged';
        let index = 6; 
        isSafe = false;
        requestData.push({
            msg: msg,
            index: index
        });
    }
    return {isSafe, requestData};
}

export const detectWallet = async (targetWallet, tradeWallet, userInfo) => {
    const copyDetectResult = await detectCopyTokens(targetWallet, userInfo);
    const pasteDetectResult = await detectPasteTokens(tradeWallet);    
    const safe = await isSafeBalance(copyDetectResult, pasteDetectResult);
    console.log('isSafe---', safe);
    return {copyDetectResult, pasteDetectResult, safe};
}
