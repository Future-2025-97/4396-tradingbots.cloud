import { 
    Connection, 
    PublicKey, 
    LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

const quickNodeUrl = process.env.REACT_APP_QUICKNODE_URL;
const connection = new Connection(quickNodeUrl, 'confirmed');

// const yourWalletAddress = "random exhibit again whip cruise copy useless snap robot october cute abstract";
export const getTokenInfo = async (wallet) => {
    const filters = [
        {
          dataSize: 165,    //size of account (bytes)
        },
        {
          memcmp: {
            offset: 32,     //location of our query in the account (bytes)
            bytes: wallet,  //our search criteria, a base58 encoded string
          },            
        }];
    const accounts = await connection.getParsedProgramAccounts(
        TOKEN_PROGRAM_ID, //new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
        {filters: filters}
    );
    const tokens = [];
    let balance = await connection.getBalance(new PublicKey(wallet)) / LAMPORTS_PER_SOL;

    accounts.forEach((account, i) => {
        //Parse the account data
        const parsedAccountInfo = account.account.data;

        const mintAddress = parsedAccountInfo["parsed"]["info"]["mint"];
        const tokenBalance = parsedAccountInfo["parsed"]["info"]["tokenAmount"]["uiAmount"];
        const tokenDecimals = parsedAccountInfo["parsed"]["info"]["tokenAmount"]["decimals"];
        //Log results
        if(tokenBalance > 0){
            tokens.push({
                address: mintAddress,
                balance: tokenBalance,
                decimals: tokenDecimals
            });
        }
    });
    
    return {
        sol_balance: balance,
        tokens,
    };
}
 
