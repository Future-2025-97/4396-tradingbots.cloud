 const swapConfig = {
    executeSwap: true, // Send tx when true, simulate tx when false
    useVersionedTransaction: true,
    tokenAAmount: 0.005, // Swap 0.01 SOL for USDC in this example
    tokenAAddress: "So11111111111111111111111111111111111111112", // Token to swap for the other, SOL in this case
    tokenBAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC address
    maxLamports: 100000, // Micro lamports for priority fee
    direction: "in", // Swap direction: 'in' or 'out'
    maxRetries: 20,
};

module.exports = {
    swapConfig
};