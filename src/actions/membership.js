import { 
    Connection, 
    PublicKey, 
    LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

const quickNodeUrl = process.env.REACT_APP_QUICKNODE_URL;
const connection = new Connection(quickNodeUrl, 'confirmed');

const checkIsUsing = (userInfo) => {
    if(userInfo) {
        if(userInfo.paymentDate === null) {
            const createdAt = new Date(userInfo.registeredUserDate);
            const now = new Date();

            const diffTime = now - createdAt; // Difference in milliseconds
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); // Convert to days
            if (diffDays >= userInfo.membership.period) {
                return false;
            }
            return true;
        }
        else {
            const paymentDate = new Date(userInfo.paymentDate);
            const now = new Date();
            const diffTime = now - paymentDate; // Difference in milliseconds
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); // Convert to days
            if (diffDays >= userInfo.membership.period) {
                return false;
            }
            return true;
        }
    }
    return false;
}

export const getMemberShipInfo = async (memberShipInfo, userInfo) => {
    try {  
        console.log('userInfo---', userInfo);
        if (Object.keys(userInfo).length === 0) {
            return []; // Early return if userInfo is empty
        }
        const newMemberShipInfoPromise = memberShipInfo.map((info) => {
            if(info.typeOfMembership === userInfo.membership.typeOfMembership){
                info.isUsing = checkIsUsing(userInfo);
                return info;
            } else {
                info.isUsing = false;
                return info;
            }
        });
        const newMemberShipInfo = await Promise.all(newMemberShipInfoPromise);
        return newMemberShipInfo;
    } catch (error) {
        console.error('Error fetching member ship info:', error);
        return error;
    }
}

