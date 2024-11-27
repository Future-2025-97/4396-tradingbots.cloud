const solanaWeb3 = require('@solana/web3.js');
async function createPhantomAccount() {
  // Generate a new Keypair
  const newKeypair = solanaWeb3.Keypair.generate();

  // Extract the public and private keys
  const publicKey = newKeypair.publicKey.toString();
  const secretKey = newKeypair.secretKey;


  // Connect to the Solana Mainnet
  const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl('mainnet-beta'));

  // Check the balance of the new wallet
  const balance = await connection.getBalance(newKeypair.publicKey);

  return { publicKey, secretKey };
}


module.exports = {
  createPhantomAccount
};
