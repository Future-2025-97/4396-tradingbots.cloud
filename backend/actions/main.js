const { 
    Connection, 
    PublicKey, 
    Transaction, 
    SystemProgram, 
    LAMPORTS_PER_SOL,
    Keypair
} = require('@solana/web3.js');
const axios = require('axios');
const { ShyftSdk, Network } = require('@shyft-to/js');


const shyft = new ShyftSdk({ apiKey: process.env.SHYFT_API_KEY, network: Network.Mainnet });
const quickNode = process.env.QUICKNODE_RPC_URL;
const connection = new Connection(quickNode, 'confirmed');
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
                    if (pair.dexId === 'raydium') {
                        updateTokens.push({
                            ...token,
                            symbol: pair.baseToken.symbol,
                            tokenNativePrice: pair.priceUsd,
                            tokenPrice: (Number(pair.priceUsd) * Number(token.balance))
                        });
                        totalTokenPrice += Number(pair.priceUsd) * Number(token.balance);
                        findTokenInfo = true;
                        return totalTokenPrice;
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
    const updateToken = await (updatedTokensWeight.filter(token => token.weight < process.env.MIN_TOKEN_WEIGHT)).filter(token => token.tokenPrice > process.env.MIN_TOKEN_PRICE);
    if(updateToken.length > 0) {
        if(updateToken.length == updatedTokensWeight.length) {
            const sortedToken = sortTokenByPrice(updateToken);
            console.log('sortedToken---', sortedToken);
            const lastToken = sortedToken[sortedToken.length - 1];
            if(lastToken.tokenPrice < process.env.MIN_TOKEN_PRICE) {
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
    const updateToken = await (updatedTokensWeight.filter(token => token.weight < process.env.MIN_TOKEN_WEIGHT)).filter(token => token.tokenPrice > process.env.MIN_TOKEN_PRICE);
    
    if(updateToken.length > 0) {
        if(updateToken.length == updatedTokensWeight.length) {
            const sortedToken = sortTokenByPrice(updateToken);
            console.log('sortedToken---', sortedToken);
            const lastToken = sortedToken[sortedToken.length - 1];
            console.log('lastToken---tokenPrice', lastToken.tokenPrice);
            if(lastToken.tokenPrice < process.env.MIN_TOKEN_PRICE) {
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
        const filterTokens = portfolio.tokens.filter(token => token.balance > process.env.BALANCE_MIN_LIMIT);
        const {isNonCopyToken, updateCopyToken} = await filterCopyTokens(filterTokens);
        let totalTargetTokenPrice = 0;
        let totalTargetPrice = 0;
        if(!isNonCopyToken){
            totalTargetTokenPrice = updateCopyToken.reduce((total, token) => total + Number(token.tokenPrice), 0);
        } else {
            totalTargetTokenPrice = 0;
        }
        totalTargetPrice = totalTargetTokenPrice + sol_balance.price;
        return {isNonCopyToken, updateCopyToken, totalTargetTokenPrice, totalTargetPrice, solTargetToken:{ amount: solBalance, price: sol_balance.price}};
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
    const filterTokens = portfolio.tokens.filter(token => token.balance > process.env.BALANCE_MIN_LIMIT);
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
    if(updateCopyToken.length == 0 && updatePasteToken.length == 0) {
        console.log('updateCopyToken.length == 0 && updatePasteToken.length == 0');
        return true;
    }
    const copyToken = updateCopyToken.map(token => token.address);
    const pasteToken = updatePasteToken.map(token => token.address);
    const isAvailable = copyToken.some(token => pasteToken.includes(token));
    return isAvailable;
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
    const threshold = process.env.THRESHOLD_POSITION || 1;

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
    const requestData = [];
    const {isNonCopyToken, updateCopyToken, totalTargetTokenPrice, solTargetToken} = copyDetectResult;
    const {isNonPasteToken, updatePasteToken, totalTradeTokenPrice, solTradeToken} = pasteDetectResult;
    const isSameToken = isSameTokenAvailable(updateCopyToken, updatePasteToken);
    const isPosition = isPositionAvailable(updateCopyToken, updatePasteToken);
    
    if(solTradeToken.price > process.env.SOL_MIN_PRICE_FOR_SWAP && updateCopyToken.length === updatePasteToken.length && isSameToken && !isPosition && updateCopyToken.length > 0 || isNonCopyToken === isNonPasteToken ) {
        isSafe = true;
        index = -1;
    } 
    if (solTradeToken.price <= process.env.SOL_MIN_PRICE_FOR_SWAP) {
        msg = 'Sol balance for trader is too low for swap';
        index = 1;
        requestData.push({
            msg: msg,
            index: index
        });
    }    
    if((updateCopyToken.length == 0 && updatePasteToken.length != 0) || (updateCopyToken.length != 0 && updatePasteToken.length == 0)) {
        msg = 'Copy token is empty';
        index = 2;
        requestData.push({
            msg: msg,
            index: index
        });
    }
    if (isNonCopyToken !== isNonPasteToken) {
        msg = 'Copy and paste token didn\'t matched';
        index = 3;
        requestData.push({
            msg: msg,
            index: index
        });
    }
    if (updateCopyToken.length !== updatePasteToken.length) {
        msg = 'Copy and paste token length are not same';
        index = 4;
        requestData.push({
            msg: msg,
            index: index
        });
    }
    if (!isSameToken) {
        msg = 'Same token is not allowed';
        index = 5;  
        requestData.push({
            msg: msg,
            index: index
        });
    }
    if (isPosition) {
        msg = 'Position balance has been damaged';
        index = 6;
        requestData.push({
            msg: msg,
            index: index
        });
    }
    return {isSafe, requestData};
}
const detectWallet = async (tradeWallet, targetWallet, secretKey) => {
    console.log('detectWallet---', tradeWallet, targetWallet, secretKey);
    const copyDetectResult = await detectCopyTokens(targetWallet);
    console.log('copyDetectResult---', copyDetectResult);
    const pasteDetectResult = await detectPasteTokens(tradeWallet);    
    console.log('pasteDetectResult---', pasteDetectResult);
    const safe = await isSafeBalance(copyDetectResult, pasteDetectResult);
    return {copyDetectResult, pasteDetectResult, safe};
}


// Main working function when isSafe is false.

const isSolEnoughForSwapAndUpdate = async (tradeWallet, pasteDetectResult, secretKey) => {
    const solBalance = await shyft.wallet.getBalance({ network: Network.Mainnet, wallet: tradeWallet });
    const sol_balance = await solPrice(solBalance);
    console.log('sol_balance---', sol_balance);
    console.log('process.env.SOL_MIN_PRICE_FOR_SWAP---', process.env.SOL_MIN_PRICE_FOR_SWAP);
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
}
const getSOLTokenPrice = async () => {
    const tokenPrice = await axios.get(`${process.env.DEXSCREENER_API_URL}${process.env.SOLTOKEN_ADDRESS}`);
    return tokenPrice.data.pairs[0].priceUsd;
}

const checkPortfolio = (tradeWallet, tokenAddress, interval, confirm, maxAttempts) => {
    let attempts = 0; // Counter for the number of attempts
    const intervalId = setInterval(() => {
        shyft.wallet.getPortfolio({ network: Network.Mainnet, wallet: tradeWallet })
            .then(portfolio => {
                if (portfolio.tokens.find(token => token.address === tokenAddress && Number(token.balance) > 0)) {
                    console.log('Token found in portfolio with balance greater than 0.');
                    clearInterval(intervalId); // Stop checking if the condition is met
                    confirm = true; // Set confirm to true or handle as needed
                } else {
                    console.log('Token not found or balance is 0. Checking again...');
                }
            })
            .catch(error => {
                console.error('Error fetching portfolio:', error);
            });

        attempts++; // Increment the attempt counter
        if (attempts >= maxAttempts) {
            clearInterval(intervalId); // Stop checking after max attempts
            return false;
        }
    }, interval); // Set the interval time in milliseconds
    return confirm;
};



// Update bot status
const updateBotStatus = async (tradeWallet, copyDetectResult, pasteDetectResult, secretKey) => {
    if(pasteDetectResult.updatePasteToken.length > 0) {
        const positionValue = copyDetectResult.totalTargetTokenPrice / pasteDetectResult.totalTradeTokenPrice;
        console.log('positionValue-++--', positionValue);
    } else {
        const intervalTime = process.env.INTERVAL_TIME_FOR_CHECK_PORTFOLIO || 5000;
        const maxAttempts = process.env.MAX_ATTEMPTS_FOR_CHECK_PORTFOLIO || 10;
        const positionValue = copyDetectResult.totalTargetTokenPrice / (pasteDetectResult.solTradeToken.price - process.env.SOL_NORMAL_PRICE_FOR_SWAP);
        const solTokenPrice = await getSOLTokenPrice();

        const swapTokens = copyDetectResult.updateCopyToken.map(async (token) => {
            const tokenAmount = (token.balance / positionValue) * token.tokenNativePrice / solTokenPrice;
            console.log('tokenAmount---', tokenAmount, 'tokenSymbol---', token.symbol, 'secretKey---', secretKey);
            
            let attempt = 0; // Current attempt count
            const maxAttempts = 3; // Maximum number of attempts for swapping

            while (attempt < maxAttempts) {
                const result = await swapSOLToToken(token.address, tokenAmount, secretKey);
                let confirm = false;

                if (checkPortfolio(tradeWallet, token.address, intervalTime, confirm, maxAttempts)) {
                    return result; // Successful check, return result
                } else {
                    console.log(`Attempt ${attempt + 1} failed for token ${token.symbol}. Retrying swap...`);
                    attempt++;
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait before retrying
                }
            }
            return false; // Return false after max attempts
        })

        const swapTokenPromise = await Promise.all(swapTokens);
        console.log('swapTokenPromise---', swapTokenPromise);
        return swapTokenPromise;
    }   
}

const sentTradePasteTokenToSOL = async (tradeWallet, pasteDetectResult, secretKey) => {
    const swapTokens = pasteDetectResult.updatePasteToken.map(async (token) => {
        console.log('tokenAmount---', token.balance, 'tokenSymbol---', token.symbol, 'secretKey---', secretKey);
        
        let attempt = 0; // Current attempt count
        const maxAttempts = 3; // Maximum number of attempts for swapping
        const intervalTime = process.env.INTERVAL_TIME_FOR_CHECK_PORTFOLIO || 5000;

        while (attempt < maxAttempts) {
            const result = await swapTokenToSOL(token.address, token.balance, secretKey);
            let confirm = false;

            // Check portfolio after each swap attempt
            if (checkPortfolio(tradeWallet, token.address, intervalTime, confirm, maxAttempts)) {
                return result; // Successful check, exit the loop and return result
            } else {
                console.log(`Attempt ${attempt + 1} failed for token ${token.symbol}. Retrying swap...`);
                attempt++;
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait before retrying
            }
        }

        // If max attempts reached and checkPortfolio is still false, try one last swap
        const finalResult = await swapTokenToSOL(token.address, token.balance, secretKey);
        return finalResult; // Return the result of the final swap attempt
    });

    const swapTokenPromise = await Promise.all(swapTokens);
    console.log('swapTokenPromise---', swapTokenPromise);
    return swapTokenPromise;
}

const isCopyTokenEmpty = (requestData) => {
    const exist = requestData.some(item => item.index === process.env.INDEX_COPY_TOKEN_EMPTY || item.index === 2);
    return exist;
}
const mainWorking = async (targetWallet, tradeWallet, secretKey, copyDetectResult, pasteDetectResult, safe) => {
    const isSolEngouh = await isSolEnoughForSwapAndUpdate(tradeWallet, pasteDetectResult, secretKey);
    if(isSolEngouh.status) {
        updateBotStatus(tradeWallet, copyDetectResult, pasteDetectResult, secretKey);
        const isEmptyCopyToken = isCopyTokenEmpty(safe.requestData);
        console.log('isEmptyCopyToken---', isEmptyCopyToken);
        if(isEmptyCopyToken) {
            sentTradePasteTokenToSOL(tradeWallet, pasteDetectResult, secretKey);
            // return {status: false, msg: 'Copy token is empty'};
        }
    } else {
        console.log('isSolEngouh---', isSolEngouh);
    }
}

module.exports = {
  detectWallet,
  mainWorking
}
