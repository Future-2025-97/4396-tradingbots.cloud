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
    },
    botWorking: async (reqData) => {
        console.log('reqData---', reqData);
        const response = await axios.post(baseUrl + '/api/bot/sendSignal', reqData);
        return response.data;
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
        const response = await axios.post(baseUrl + '/api/users/connectWallet', { userWallet });
        return response.data;
    },

    generateWalletAccount: async () => {
        // console.log('**** generateWalletAccount ****');
        const response = await axios.post(baseUrl + '/api/trade/newCreateWallet', { wallet: localStorage.getItem('wallet') });
        const depositWallet = response.data.depositWallets;
        const lastIndex = depositWallet.length - 1;

        // Check if the array is not empty before accessing the last element
        if (lastIndex >= 0) {
            const lastWallet = depositWallet[lastIndex];
            toast.success(api.customToast(`${lastWallet.wallet}`));
        } else {
            console.log('The depositWallet array is empty.');
        }

        return response.data;
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
        const response = await axios.post(baseUrl + '/api/bot/getTransactions', { botId });
        return response.data;
    }
}

export default api;