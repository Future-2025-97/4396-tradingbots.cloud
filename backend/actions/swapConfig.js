const swapConfig = {
    executeSwap: false, // Send tx when true, simulate tx when false
    useVersionedTransaction: false,
    tokenAmount: 1.1, // Swap 0.01 SOL for USDC in this example
    tokenAAddress: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
    tokenBAddress: "So11111111111111111111111111111111111111112",
    maxLamports: 3000000, // Micro lamports for priority fee
    direction: "in", // Swap direction
    maxRetries: 20,
};

module.exports = {
    swapConfig
};