const solanaWeb3 = require('@solana/web3.js');
async function createPhantomAccount() {
  try{
    // Generate a new Keypair
    const newKeypair = solanaWeb3.Keypair.generate();

    // Extract the public and private keys
    const publicKey = newKeypair.publicKey.toString();
    const secretKey = newKeypair.secretKey;
    
    return { publicKey, secretKey };
  } catch (error) {
    console.error('Error creating phantom account:', error);
    return null;
  }
}


module.exports = {
  createPhantomAccount
};
