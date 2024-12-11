import React, { useState, useEffect } from 'react';
import './index.css';
import { useWallet } from '@solana/wallet-adapter-react';
import { getMemberShipInfo } from '../../actions/membership';
import { 
    Connection, 
    PublicKey, 
    SystemProgram, 
    LAMPORTS_PER_SOL,
    TransactionMessage,
    VersionedTransaction
} from '@solana/web3.js';
import bigInt from "big-integer";
import { getUserBalance } from '../../actions/wallet';
import { toast } from 'react-toastify';
import api from '../../api';

const quickNodeUrl = process.env.REACT_APP_QUICKNODE_URL;
const connection = new Connection(quickNodeUrl, 'confirmed');

const Membership = ({ memberShipInfo, userInfo, account }) => {
    const [newMemberShipInfo, setNewMemberShipInfo] = useState([]);
    const { sendTransaction } = useWallet();
    
    const today = new Date();
    const oneMonthLater = new Date(today);
    oneMonthLater.setMonth(today.getMonth() + 1);

    const twoWeeksLater = new Date(today);
    twoWeeksLater.setDate(today.getDate() + 14); 

    
    useEffect(() => {
        const fetchMemberShipInfo = async () => {
            if(userInfo){
                const res = await getMemberShipInfo(memberShipInfo, userInfo);
                setNewMemberShipInfo(res);
            }
        }
        fetchMemberShipInfo();
    }, [userInfo]);

    const getMemberShip = async (price, membershipId, isUsing) => {
        try{
            if(isUsing){
                return;
            }
            const senderPublicKey = new PublicKey(account);
            const recipientPublicKey = new PublicKey(process.env.REACT_APP_ADMIN_WALLET_ADDRESS);
            const senderBalance = await getUserBalance(account);
            const depositValueInLamports = price * LAMPORTS_PER_SOL; // Convert depositVa
            
            if (senderBalance * LAMPORTS_PER_SOL < depositValueInLamports) {
                toast.error('Insufficient funds for the transaction.');
                console.error('Insufficient funds for the transaction.');
                return; // Exit the function if funds are insufficient
            }

            const instructions = [
                SystemProgram.transfer({
                    fromPubkey: senderPublicKey,
                    toPubkey: recipientPublicKey,
                    lamports: bigInt(depositValueInLamports),
                }),
            ];

            // Get the lates block hash to use on our transaction and confirmation
            let latestBlockhash = await connection.getLatestBlockhash()

            // Create a new TransactionMessage with version and compile it to legacy
            const messageLegacy = new TransactionMessage({
                payerKey: senderPublicKey,
                recentBlockhash: latestBlockhash.blockhash,
                instructions,
            }).compileToLegacyMessage();

            // Create a new VersionedTransacction which supports legacy and v0
            const transation = new VersionedTransaction(messageLegacy)

            // Send transaction and await for signature
            let signature = await sendTransaction(transation, connection);
            const confirmation = await connection.confirmTransaction(signature, { commitment: 'confirmed' });

            if (confirmation.value.confirmationStatus === 'confirmed') {   
                const updatedUserInfo = await api.updateMembership(account, membershipId, signature);                     
                if(updatedUserInfo){
                    window.location.reload();          
                }
            }
        } catch (error) {
            console.error('Error sending transaction:', error);
        }
    }
    return (
        <div className='membership-container'>
            <div className='member-ship-panel d-flex justify-content-center flex-wrap'>
                { newMemberShipInfo.length > 0 && newMemberShipInfo.map((info) => {
                    return (
                        <div className='text-center member-ship-item' key={info._id}>
                            {info.typeOfMembership === 0 ? <h4 className='text-grey-light font-weight-bold'>Free Version</h4> : info.typeOfMembership === 1 ? <h4 className='text-success font-weight-bold'>Professional Version</h4> : <h4 className='text-warning font-weight-bold'>VIP Version</h4>}
                            <div className='text-white'>
                                <span className='text-warning font-size-24'>{info.price}</span> SOL
                                <h5 className='text-white'>Available token: {info.maxCopyTokens}</h5> 
                                <h5 className='text-white'>Max bots: {info.maxBots}</h5>
                                <p className='text-white'>Available copy trades period: {info.period} days</p> 
                                {info.typeOfMembership == 0 ? <div className={`btn btn-primary mt-3 ${info.isUsing ? 'disabled' : 'disabled'}`}>{info.isUsing ? 'Using Now' : 'End'}</div> : <div className={`btn btn-success mt-3 ${info.isUsing ? 'disabled' : ''}`} onClick={() => getMemberShip(info.price, info._id, info.isUsing)}>{info.isUsing ? 'Using Now' : 'Buy Now'}</div>}
                             </div>
                        </div>  
                    )
                })}
            </div>
        </div>
    )
}

export default Membership;