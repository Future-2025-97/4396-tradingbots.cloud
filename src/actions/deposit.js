
import { toast } from 'react-toastify';
export const depositCheck = async (tradeWallet, targetWallet, depositValue) => {
    if(tradeWallet == null){
        return { error: true, msg: 'Please select trade wallet address' };
    }
    if(targetWallet == null){
        return { error: true, msg: 'Please enter target wallet address' };
    }
    if (depositValue == 0) {
        return { error: true, msg: 'Please enter deposit value' };
    }
    return { error: false, msg: 'Success' };
}
