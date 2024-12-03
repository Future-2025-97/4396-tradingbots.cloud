const swapConfig = {
    executeSwap: true, // Send tx when true, simulate tx when false
    useVersionedTransaction: true,
    maxLamports: 3000000, // Micro lamports for priority fee
    direction: "in", // Swap direction
    maxRetries: 20,
};

module.exports = {
    swapConfig
};