import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const baseUrl = process.env.REACT_APP_BACKEND_URL;

const api = {
    customToast: (message) => {
        return (
            <div>
                {message} 
                <br />
                <a href={`${process.env.REACT_APP_SOLSCAN_API_URL}${message}`} target='_blank' rel='noopener noreferrer'>View on Solscan</a>
            </div>
        );
    },

    getDepositWallets: async () => {
        try {
            const response = await axios.post(baseUrl + '/api/trade/getDepositWallets', { wallet: localStorage.getItem('wallet') });
            if (Array.isArray(response.data) && response.data.length > 0) {
                const singleWalletArray = [];
                for (let i = 0; i < response.data.length; i++) {
                    singleWalletArray.push(response.data[i].wallet);
                }
                return singleWalletArray; // Return the new array containing one wallet object
            } else {
                console.log('No wallets found in the response.');
                return []; // Return an empty array if no wallets are found
            }
        } catch (error) {
            console.error('Error fetching deposit wallets:', error);
            return [];
        }
    },
    isSwapAvailable: async (tokenAddress) => {
        try {
            const response = await axios.post(baseUrl + '/api/bot/isSwapAvailable', { tokenAddress });
            console.log('/////response---', response.data);
            return response;
        } catch (error) {
            console.error('Error checking swap availability:', error);
            return error;
        }
    },
    botWorking: async (reqData) => {
        try {
            console.log('reqData---', reqData);
            // const response = await axios.post(baseUrl + '/api/bot/sendSignal', reqData);
            // console.log('response---', response.data);
            // return response.data;
        } catch (error) {
            console.error('Error sending signal:', error);
            return error;
        }
    },
    getBots: async () => {
        try {
            const response = await axios.post(baseUrl + '/api/bot/getTradingBots', { wallet: localStorage.getItem('wallet') });
            return response.data;
        } catch (error) {
            console.error('Error fetching trading bots:', error);
            return [];
        }
    },

    createTradingBot: async (requestData) => {
        try {
            const response = await axios.post(baseUrl + '/api/bot/createTradingBot', requestData);
            return response;
        } catch (error) {
            console.error('Error creating trading bot:', error);
            return error;
        }
    },

    signUp: async (userWallet) => {
        try {
            const response = await axios.post(baseUrl + '/api/users/connectWallet', { userWallet });
            return response.data;
        } catch (error) {
            console.error('Error signing up:', error);
            return error;
        }
    },

    generateWalletAccount: async () => {
        try {
            // console.log('**** generateWalletAccount ****');
            const response = await axios.post(baseUrl + '/api/trade/newCreateWallet', { wallet: localStorage.getItem('wallet') });
            if(response.data.status !== false){
                const depositWallet = response.data.depositWallets;
                const lastIndex = depositWallet.length - 1;

                // Check if the array is not empty before accessing the last element
                if (lastIndex >= 0) {
                    const lastWallet = depositWallet[lastIndex];
                    toast.success(api.customToast(`${lastWallet.wallet}`));
                } else {
                    console.log('The depositWallet array is empty.');
                }
            }
            return response.data;
        } catch (error) {
            console.error('Error generating wallet account:', error);
            return error;
        }
    },

    saveNewTransactions: async (botId, transactions) => {
        try {   
            const response = await axios.post(baseUrl + '/api/bot/saveNewTransactions', { botId, transactions });
            return response.data;
        } catch (error) {
            console.error('Error saving new transactions:', error);
            return error;
        }
    },

    getTransactions: async (botId) => {
        try {
            const response = await axios.post(baseUrl + '/api/bot/getTransactions', { botId });
            return response.data;
        } catch (error) {
            console.error('Error fetching transactions:', error);
            return error;
        }
    }
}

export default api;