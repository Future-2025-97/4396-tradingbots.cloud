const { getTokenInfo } = require('./tokens');
const axios = require('axios');
const { mergeArraysWithDuplicates } = require('./array');
const raydiumSwap = require('./swapBaseIn');
const {swapSOLToToken, swapTokenToSOL} = require('./index');

const solPrice = async (amount) => {
    try {
        const solTokenAddress = process.env.SOLTOKEN_ADDRESS;
        const tokenPrice = await axios.get(`${process.env.DEXSCREENER_API_URL}${solTokenAddress}`);
        return {price: tokenPrice.data.pairs[0].priceUsd * amount, nativePrice: tokenPrice.data.pairs[0].priceUsd};
    } catch (error) {
        console.error('Error fetching SOL price:', error);
        return 0;
    }
}


const getTotalTokenPriceAndUpdateTokens = async (tokens) => {
    try{
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
                    if (pair.dexId === 'raydium' && pair.baseToken.address === token.address && pair.quoteToken.address === process.env.SOLTOKEN_ADDRESS) {
                        const tokenPrice = (Number(pair.priceUsd) * Number(token.balance)).toFixed(4);
                        findTokenInfo = true;
                        if(tokenPrice > 1) {
                            updateTokens.push({
                                ...token,
                                symbol: pair.baseToken.symbol
                            });
                            totalTokenPrice += Number(pair.priceUsd) * Number(token.balance);
                            
                            return totalTokenPrice;
                        }
                    }
                }
            }
        });
        await Promise.all(tokenPricePromises);
        const sortedTokens = updateTokens.sort((a, b) => b.tokenPrice - a.tokenPrice);
        // console.log('response---', response);
        return {totalTokenPrice, updateTokens: sortedTokens};
    } catch (error) {
        console.error('Error getting token price:', error);
        return {totalTokenPrice: 0, updateTokens: []};
    }
}
const sortTokenByPrice = (tokens) => {
    try{
        tokens.sort((a, b) => b.tokenPrice - a.tokenPrice);
        return tokens;
    } catch (error) {
        console.error('Error sorting token by price:', error);
        return [];
    }
}

const isNonCopyTokenChecking = async (totalTokenPrice, tokens) => {
    try{
        let isNonCopyToken = false;

        const updatedTokensWeight = [];
        tokens.map(token => {
            updatedTokensWeight.push({
                ...token,
                weight: totalTokenPrice / token.tokenPrice
            });
            // return totalTokenPrice / token.tokenPrice;
        });

        // filter tokens by weight and price value
        const updateToken = await updatedTokensWeight.filter(token => token.weight < process.env.MIN_TOKEN_WEIGHT && Number(token.tokenPrice) > process.env.MIN_TOKEN_PRICE);
        
        if(updateToken.length > 0) {
            if(updateToken.length == updatedTokensWeight.length) {
                
                // sort update tokens by price. from small to large
                const sortedToken = sortTokenByPrice(updateToken);

                // get smallest token price
                const lastToken = sortedToken[sortedToken.length - 1];
                
                // smallest price token is smaller than limit min price
                if(Number(lastToken.tokenPrice) < process.env.MIN_TOKEN_PRICE) {
                    isNonCopyToken = true;                
                    return {isNonCopyToken, updateCopyToken: []};
                } else {                                                            // smallest price token is bigger than limit min price
                    isNonCopyToken = false;
                    return {isNonCopyToken, updateCopyToken: updatedTokensWeight};
                }
            } else {                                                                // updatedTokens weight length is different from update tokens length
                isNonCopyToken = false;
                return {isNonCopyToken,  updateCopyToken: updateToken};
            }
        } else {
            isNonCopyToken = true;
            return {isNonCopyToken, updateCopyToken: updateToken};
        }

    } catch (error) {
        console.error('Error checking non copy token:', error);
        return {isNonCopyToken: false, updateCopyToken: []};
    }
}

const isNonPasteTokenChecking = async (totalTokenPrice, tokens) => {
    try{
        let isNonPasteToken = false;
        const updatedTokensWeight = [];
        tokens.map(token => {
        updatedTokensWeight.push({
            ...token,
            weight: totalTokenPrice / token.tokenPrice
        });
        // return totalTokenPrice / token.tokenPrice;
        });
        const updateToken = await updatedTokensWeight.filter(token => token.weight < process.env.MIN_TOKEN_WEIGHT && Number(token.tokenPrice) > process.env.MIN_TOKEN_PRICE);
        
        if(updateToken.length > 0) {
            if(updateToken.length == updatedTokensWeight.length) {
                const sortedToken = sortTokenByPrice(updateToken);
                const lastToken = sortedToken[sortedToken.length - 1];
                if(Number(lastToken.tokenPrice) < process.env.MIN_TOKEN_PRICE) {
                    isNonPasteToken = true;                
                    return {isNonPasteToken, updatePasteToken: []};
                } else {
                    isNonPasteToken = false;
                    return {isNonPasteToken, updatePasteToken: updateToken};
                }
            } else {
                isNonPasteToken = false;
                return {isNonPasteToken,  updatePasteToken: updateToken};
            }
        } else {
            isNonPasteToken = true;
            return {isNonPasteToken, updatePasteToken: updateToken};
        }
    } catch (error) {
        console.error('Error checking non paste token:', error);
        return {isNonPasteToken: false, updatePasteToken: []};
    }   
}

const filterAvailableSwapTokens = async (tokens) => {
    try{
        const availableSwapTokens = await tokens.map(async (token) => {
            if (token.address != undefined) {
                const tokenInfo = await axios.get(`${process.env.DEXSCREENER_API_URL}${token.address}`);
                for (const pair of tokenInfo.data.pairs) {
                    const response = await raydiumSwap.loadPoolKeys(pair.pairAddress);
                    if (response) {
                        return token;
                    }
                }
            }
        });
        const availableSwap = await Promise.all(availableSwapTokens);
        return availableSwap;
    } catch (error) {
        console.error('Error filtering available swap tokens:', error);
        return [];
    }
}

const isNonCopyToken = async (tokens) => {
    try{
        const {totalTokenPrice, updateTokens} = await getTotalTokenPriceAndUpdateTokens(tokens);   
        const availableSwapTokens = await filterAvailableSwapTokens(updateTokens);
        const response = await isNonCopyTokenChecking(totalTokenPrice, availableSwapTokens);
        return response;
    } catch (error) {
        console.error('Error checking non copy token:', error);
        return {isNonCopyToken: false, updateCopyToken: []};
    }
}

const isNonPasteToken = async (tokens) => {
    try{
        const {totalTokenPrice, updateTokens} = await getTotalTokenPriceAndUpdateTokens(tokens);
        const response = await isNonPasteTokenChecking(totalTokenPrice, updateTokens);
        return response;
    } catch (error) {
        console.error('Error checking non paste token:', error);
        return {isNonPasteToken: false, updatePasteToken: []};
    }
}

const filterCopyTokens = async (tokens) => {
    try{
        const response = await isNonCopyToken(tokens);
        return response;
    } catch (error) {
        console.error('Error filtering copy tokens:', error);
        return {isNonCopyToken: false, updateCopyToken: []};
    }
}


const filterPasteTokens = async (tokens) => {
    try{
        const response = await isNonPasteToken(tokens);
        return response;
    } catch (error) {
        console.error('Error filtering paste tokens:', error);
        return {isNonPasteToken: false, updatePasteToken: []};
    }
}

const detectCopyTokens = async (wallet, userInfo) => {
    try {

        const maxRetries = 3; // Maximum number of retries
        let attempt = 0; // Current attempt count
        let portfolio; // Variable to hold the portfolio data

        while (attempt < maxRetries) {
            try {
                console.log('wallet---', wallet);
                portfolio = await getTokenInfo(wallet);
                console.log('portfolio---', portfolio);
                break; // Exit loop if successful
            } catch (error) {
                console.error('Error fetching portfolio, attempt:', attempt + 1, error);
                attempt++;
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 2500)); // Wait for 2 seconds before retrying
                } else {
                    return []; // Return empty array after max retries
                }
            }
        }
        
        // get sol price value in target wallet
        const solBalance = portfolio.sol_balance;
        const sol_balance = await solPrice(solBalance);

        // get copy tokens filter by balance limit
        const filterTokens = portfolio.tokens.filter(token => token.balance > process.env.BALANCE_MIN_LIMIT);
        const {isNonCopyToken, updateCopyToken} = await filterCopyTokens(filterTokens);
        console.log('updateCopyToken---', updateCopyToken);
        // sort by price
        let sortedUpdateCopyToken = sortTokenByPrice(updateCopyToken);
        const limitTokenCount = userInfo.membership.maxCopyTokens;
        if(sortedUpdateCopyToken.length > limitTokenCount) {
            sortedUpdateCopyToken = sortedUpdateCopyToken.slice(0, limitTokenCount);
        }
        
        // get total target all token price and target alll price value in target wallet. 
        let totalTargetTokenPrice = 0;
        let totalTargetPrice = 0;
        if(!isNonCopyToken){            // When isNonCopyToken value is false
            totalTargetTokenPrice = sortedUpdateCopyToken.reduce((total, token) => total + Number(token.tokenPrice), 0);
        } else {                        // When isNonCopyToken value is true
            totalTargetTokenPrice = 0;
        }

        // Total price on target wallet
        totalTargetPrice = totalTargetTokenPrice + sol_balance.price;

        // return to the main function
        return {isNonCopyToken, updateCopyToken: sortedUpdateCopyToken, totalTargetTokenPrice, totalTargetPrice, solTargetToken:{ amount: solBalance, price: sol_balance.price, nativePrice: sol_balance.nativePrice}};
    } catch (error) {
        console.error('Error fetching portfolio:', error);
        return [];
    }
}

const detectPasteTokens = async (wallet) => {
    try{
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

        const filterTokens = portfolio.tokens.filter(token => token.balance > process.env.BALANCE_MIN_LIMIT);
        const {isNonPasteToken, updatePasteToken} = await filterPasteTokens(filterTokens);
        console.log('updatePasteToken---', updatePasteToken);
        let totalTradeTokenPrice = 0;
        let totalTradePrice = 0;
        if(!isNonPasteToken){
            totalTradeTokenPrice = updatePasteToken.reduce((total, token) => total + Number(token.tokenPrice), 0);
        } else {
            totalTradeTokenPrice = 0;
        }
        totalTradePrice = totalTradeTokenPrice + sol_balance.price;
        return {isNonPasteToken, updatePasteToken, totalTradeTokenPrice, totalTradePrice, solTradeToken:{ amount: solBalance, price: sol_balance.price, nativePrice: sol_balance.nativePrice}};
    } catch (error) {
        console.error('Error fetching portfolio:', error);
        return [];
    }
}

const isSameTokenAvailable = (updateCopyToken, updatePasteToken) => {
    try{
        if(updateCopyToken.length == 0 && updatePasteToken.length == 0) {
            return true;
        }
        const copyToken = updateCopyToken.map(token => token.address);
        const pasteToken = updatePasteToken.map(token => token.address);
        const isAvailable = copyToken.some(token => pasteToken.includes(token));
        return isAvailable;
    } catch (error) {
        console.error('Error checking same token availability:', error);
        return false;
    }
}

const isPositionAvailable = (updateCopyToken, updatePasteToken, positionValue) => {
    try{
        const combinedPosition = updateCopyToken.map((token) => {
            const filterPasteToken = updatePasteToken.filter(pasteToken => pasteToken.address === token.address);
            if(filterPasteToken.length > 0) {
                return token.balance / filterPasteToken[0].balance;
            } else {
                return -1;
            }
        })

        // Define a threshold for what constitutes an impulse
        const threshold = positionValue * (process.env.THRESHOLD_POSITION_PERCENTAGE / 100);

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
    } catch (error) {
        console.error('Error checking position availability:', error);
        return false;
    }
}

const getIsPositionSafe = (updateCopyToken, updatePasteToken, positionValue) => {
    let isPositionSafe = true;
    const combinedPosition = updateCopyToken.map((token, index) => {
        const filterPasteToken = updatePasteToken.filter(pasteToken => pasteToken.address === token.address);
        if(filterPasteToken.length > 0) {
            return token.balance / filterPasteToken[0].balance;
        } else {
            return -1;
        }
    })
    combinedPosition.map(position => {
        if (Math.abs(positionValue - position) > positionValue * process.env.MIN_POSITION_VALUE) {
            isPositionSafe = false;
        }
    })
    return isPositionSafe;
}

const isSafeBalance = async (copyDetectResult, pasteDetectResult) => {
    try {

        let isSafe = false;
        const requestData = [];
        const {isNonCopyToken, updateCopyToken, totalTargetTokenPrice, solTargetToken} = copyDetectResult;
        const {isNonPasteToken, updatePasteToken, totalTradeTokenPrice, solTradeToken} = pasteDetectResult;
        
        // calculate position value (Total price of trade wallet - Swap price: $20) / total targetTokenPrice.
        const positionValue = (totalTradeTokenPrice + solTradeToken.price - process.env.SOL_NORMAL_PRICE_FOR_SWAP) / totalTargetTokenPrice;
        
        const isSameToken = isSameTokenAvailable(updateCopyToken, updatePasteToken);
        const isPosition = isPositionAvailable(updateCopyToken, updatePasteToken, positionValue);
        const isPositionSafe = getIsPositionSafe(updateCopyToken, updatePasteToken, positionValue);

        if(solTradeToken.price > process.env.SOL_MIN_PRICE_FOR_SWAP && updateCopyToken.length === updatePasteToken.length && isSameToken && !isPosition && isNonCopyToken === isNonPasteToken && isPositionSafe) {
            isSafe = true;
            index = -1;
        } 

        if (solTradeToken.price <= process.env.SOL_MIN_PRICE_FOR_SWAP) {
            let msg = 'Sol balance for trader is too low for swap';
            let index = 1;
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
        
        if (!isPositionSafe) {
            let msg = 'Position balance has been damaged';
            let index = 7;
            isSafe = false;
            requestData.push({
                msg: msg,
                index: index
            });
        }    
        return {isSafe, requestData};
    } catch (error) {
        console.error('Error checking safe balance:', error);
        return {isSafe: false, requestData: []};
    }
}

const detectWallet = async (tradeWallet, targetWallet, userInfo) => {
    try {
        // get information of target wallet
        const copyDetectResult = await detectCopyTokens(targetWallet, userInfo);

        // get information of trade wallet
        const pasteDetectResult = await detectPasteTokens(tradeWallet);   

        // get bot status with copy tokens and past tokens result
        const safe = await isSafeBalance(copyDetectResult, pasteDetectResult);
        
        return {copyDetectResult, pasteDetectResult, safe};

    } catch (error) {
        console.error('Error detecting wallet:', error);
        return {copyDetectResult: [], pasteDetectResult: [], safe: {isSafe: false, requestData: []}};
    }
}



// Main working function when isSafe is false.

const isSolEnoughForSwapAndUpdate = async (tradeWallet, pasteDetectResult, secretKey) => {
    try{
        const solBalance = await getTokenInfo(tradeWallet);
        const sol_balance = await solPrice(solBalance.sol_balance);
        if(sol_balance.price > process.env.SOL_MIN_PRICE_FOR_SWAP) {
            return {status: true, msg: 'Sol balance is enough for swap'};
        } else {
            if(pasteDetectResult.updatePasteToken.length > 0) {
                const totalPasteTokensLength = pasteDetectResult.updatePasteToken.length;
                const necessarySolPricePerToken = (process.env.SOL_NORMAL_PRICE_FOR_SWAP - pasteDetectResult.solTradeToken.price) / totalPasteTokensLength;
                const swapToken = pasteDetectResult.updatePasteToken.map(token => {
                    if(token.tokenPrice > necessarySolPricePerToken) {
                        const tokenAmount = necessarySolPricePerToken / token.tokenNativePrice;
                        return swapTokenToSOL(token.address, tokenAmount, secretKey);
                    }
                })
                const swapTokenPromise = await Promise.all(swapToken);
                return {status: true, msg: 'Sol balance is not enough for swap, but there is a token to swap, so deposited!'};
            } else {
                return {status: false, msg: 'Sol balance is not enough for swap, you have to close bot!'};
            }
        }
    } catch (error) {
        console.error('Error checking sol balance:', error);
        return {status: false, msg: 'Error checking sol balance'};
    }
}
const getSOLTokenPrice = async () => {
    try{
        const tokenPrice = await axios.get(`${process.env.DEXSCREENER_API_URL}${process.env.SOLTOKEN_ADDRESS}`);
        return tokenPrice.data.pairs[0].priceUsd;
    } catch (error) {
        console.error('Error getting SOL token price:', error);
        return 0;
    }
}

// const swapToken1 = async (token, amount, secretKey) => {
//     // const result = await swapSOLToToken(token.address, token.swapAmount, secretKey);
//     await new Promise(resolve => setTimeout(resolve, 2000));
    
//     // const result = await swapSOLToToken(token.address, token.swapAmount, secretKey);
//     console.log('swap token 1---');
//     return true;
// }
// const swapToken2 = async (token, amount, secretKey) => {
//     await new Promise(resolve => setTimeout(resolve, 2000));
//     console.log('token---', token, 'amount---', amount, 'secretKey---', secretKey);
//     // const result = await swapSOLToToken(token.address, token.swapAmount, secretKey);
//     console.log('swap token 2---');
//     return true;
// }

// Update bot status

const updateBotStatus = async (tradeWallet, copyDetectResult, pasteDetectResult, secretKey) => {
    try{
        console.log('Main working function---');
        const positionValue = copyDetectResult.totalTargetTokenPrice / (pasteDetectResult.totalTradeTokenPrice + pasteDetectResult.solTradeToken.price - process.env.SOL_NORMAL_PRICE_FOR_SWAP);
        console.log('positionValue---', positionValue);
        const updateCopyToken = copyDetectResult.updateCopyToken;
        const updatePasteToken = pasteDetectResult.updatePasteToken;
        const mergedTokenBuilt = mergeArraysWithDuplicates(updateCopyToken, updatePasteToken, positionValue);

        console.log('mergedTokenBuilt---', mergedTokenBuilt);
        const swapTokens = [];
        const plusTokens = mergedTokenBuilt.filter(token => token.type === 1);
        const minusTokens = (mergedTokenBuilt.filter(token => token.type === 0)).sort((a, b) => b.swapAmount - a.swapAmount);
        // return {plusTokens, minusTokens, mergedTokenBuilt};

        const plusTokenResults = await Promise.all(plusTokens.map(async (token) => {
            if(token.swapAmount * token.tokenNativePrice > process.env.TOKEN_MIN_PRICE_FOR_SWAP) {
                const result = await swapTokenToSOL(token.address, token.swapAmount, secretKey);
                return result;
            }
        }));

        swapTokens.push(...plusTokenResults); // Add results to swapTokens

        if (plusTokenResults.some(result => result instanceof Error)) {
            throw new Error('Error occurred in plusTokenResults');
        }

        // Then process type 0 tokens
        const minusTokenResults = await Promise.all(minusTokens.map(async (token) => {
            if(token.swapAmount * token.tokenNativePrice > process.env.TOKEN_MIN_PRICE_FOR_SWAP) {
                const updatedSwapAmount = token.swapAmount * token.tokenNativePrice / copyDetectResult.solTargetToken.nativePrice;
                const result = await swapSOLToToken(token.address, updatedSwapAmount, secretKey);
                return result;
            }
        }));

        swapTokens.push(...minusTokenResults.filter(result => result)); 
        return swapTokens; 
    } catch (error) {
        console.error('Error calculating position value:', error);
        return [];
    }
   
}
const sentTradePasteTokenToSOL = async (pasteDetectResult, secretKey) => {
    try{
        const swapTokens = pasteDetectResult.updatePasteToken.map(async (token) => {
            const result = await swapTokenToSOL(token.address, token.balance, secretKey);
            try{
                return result;
            } catch (error) {
                console.error('Error sending trade paste token to SOL:', error);
                return [];
            }
        });

        const swapTokenPromise = await Promise.all(swapTokens);
        return swapTokenPromise;
    } catch (error) {
        console.error('Error sending trade paste token to SOL:', error);
        return [];
    }
}

const isCopyTokenEmpty = (requestData) => {
    try{
        const exist = requestData.some(item => item.index === process.env.INDEX_COPY_TOKEN_EMPTY || item.index === 2);
        return exist;
    } catch (error) {
        console.error('Error checking copy token empty:', error);
        return false;
    }
}

const mainWorking = async (targetWallet, tradeWallet, secretKey, copyDetectResult, pasteDetectResult, safe) => {
    try{
        const isSolEngouh = await isSolEnoughForSwapAndUpdate(tradeWallet, pasteDetectResult, secretKey);
        if(isSolEngouh.status) {
            const res = await updateBotStatus(tradeWallet, copyDetectResult, pasteDetectResult, secretKey);
            return res;
        } else {
            console.log('isSolEngouh---', isSolEngouh);
        }
    } catch (error) {
        console.error('Error main working:', error);
    }
}

module.exports = {
  detectWallet,
  mainWorking,
  solPrice
}
