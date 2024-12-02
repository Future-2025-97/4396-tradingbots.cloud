const { Raydium, TxVersion, parseTokenAccountResp, API_URLS } = require('@raydium-io/raydium-sdk-v2')
const { Connection, Keypair, clusterApiUrl } = require('@solana/web3.js')
const { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } = require('@solana/spl-token')
const bs58 = require('bs58')

const owner = Keypair.fromSecretKey(bs58.decode('3ET4gXCPq3naF2zbRLHG7bo4tQh5MHc1ifS4P8UDqQL5JZVLnJN4Lc5cxKpxBfwcK4Q49eHqkBPHUH6UpEmpnNbi'))
const connection = new Connection('https://solana-mainnet.core.chainstack.com/725769c59a095e02f7c391de67d6679b') //<YOUR_RPC_URL>
// export const connection = new Connection(clusterApiUrl('devnet')) //<YOUR_RPC_URL>
const txVersion = TxVersion.V0 // or TxVersion.LEGACY
const cluster = 'mainnet' // 'mainnet' | 'devnet'

let raydium;
const initSdk = async () => {
  if (raydium) return raydium
  if (connection.rpcEndpoint === clusterApiUrl('mainnet-beta'))
    console.warn('using free rpc node might cause unexpected error, strongly suggest uses paid rpc node')
  console.log(`connect to rpc ${connection.rpcEndpoint} in ${cluster}`)
  raydium = await Raydium.load({
    owner,
    connection,
    cluster,
    disableFeatureCheck: true,
    disableLoadToken: false,
    blockhashCommitment: 'finalized',
    urlConfigs: {
      BASE_HOST: API_URLS.BASE_HOST, // api url configs, currently api doesn't support devnet
    },
  })

  /**
   * By default: sdk will automatically fetch token account data when need it or any sol balace changed.
   * if you want to handle token account by yourself, set token account data after init sdk
   * code below shows how to do it.
   * note: after call raydium.account.updateTokenAccount, raydium will not automatically fetch token account
   */

  /*  
  raydium.account.updateTokenAccount(await fetchTokenAccountData())
  connection.onAccountChange(owner.publicKey, async () => {
    raydium!.account.updateTokenAccount(await fetchTokenAccountData())
  })
  */

  return raydium
}

const fetchTokenAccountData = async () => {
  const solAccountResp = await connection.getAccountInfo(owner.publicKey)
  const tokenAccountResp = await connection.getTokenAccountsByOwner(owner.publicKey, { programId: TOKEN_PROGRAM_ID })
  const token2022Req = await connection.getTokenAccountsByOwner(owner.publicKey, { programId: TOKEN_2022_PROGRAM_ID })
  const tokenAccountData = parseTokenAccountResp({
    owner: owner.publicKey,
    solAccountResp,
    tokenAccountResp: {
      context: tokenAccountResp.context,
      value: [...tokenAccountResp.value, ...token2022Req.value],
    },
  })
  return tokenAccountData
}

module.exports = {
    initSdk,
    fetchTokenAccountData
}
