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
const { swapTokenToSOL } = require('./index');
const { getTokenInfo, getTokenPrice, sendSOLToken } = require('./tokens');
const connection = new Connection(process.env.QUICKNODE_RPC_URL, 'confirmed');

const getStatusBot = async (detectWallet, bot) => {
    console.log('detectWallet---', detectWallet);
    console.log('userInfo---', bot);
    const profit = (detectWallet.totalTradePrice - bot.depositPrice) / bot.depositPrice;
    const profitPercentage = profit * 100;
    if(profitPercentage >= bot.takeProfit && profitPercentage <= bot.stopLoss){
        return true;
    }
    return false;
}

const closeBot = async (tradeWallet, secretKey) => {
    try {
        const tokenInfo = await getTokenInfo(tradeWallet);
        console.log('tokenInfo---', tokenInfo);
        const withdrawSPLToken = [];
        const withdrawSPLTokenPromises = tokenInfo.tokens.map(async (token) => {
            const price = await getTokenPrice(token.address);
            const pricePerToken = price * token.balance;
            withdrawSPLToken.push({
                ...token,
                pricePerToken
            })
        })
        await Promise.all(withdrawSPLTokenPromises);
        const withdrawSPLTokenFilter = withdrawSPLToken.filter((token) => token.pricePerToken > 1.5);
        const withdrawSPLTokenFilterPromises = withdrawSPLTokenFilter.map(async (token) => {
            const response = await swapTokenToSOL(token.address, token.balance, secretKey);
            return response;
        })
        await Promise.all(withdrawSPLTokenFilterPromises);
        return {msg: 'success'};
    } catch (error) {
        console.error('Error closing bot:', error);
        return {error: error.message};
    }
}
const withdrawBot = async (tradeWallet, secretKey, withdrawAddress) => {
    try {
        const response = await sendSOLToken(tradeWallet, secretKey, withdrawAddress);
        console.log('response---', response);
        return response;
    } catch (error) {
        console.error('Error withdrawing bot:', error);
        return {error: error.message};
    }
}
module.exports = {
    closeBot,
    withdrawBot,
    getStatusBot
}
