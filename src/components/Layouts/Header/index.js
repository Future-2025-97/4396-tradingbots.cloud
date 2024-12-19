import React, { useContext, useEffect, useState } from 'react';
import './index.css';

import logo from '../../../source/img/header/icon.png';
import { StoreContext } from '../../../context/PageStore';
import api from '../../../api';
import { useWallet } from '@solana/wallet-adapter-react';
import {
    WalletMultiButton
} from '@solana/wallet-adapter-react-ui';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLocalStorage } from '@solana/wallet-adapter-react';
import { useAutoConnect } from '../../../context/AutoConnectProvider';
import { useMediaQuery } from 'react-responsive';

const Header = () => {
    const isMobile = useMediaQuery({ query: '(max-width: 600px)' })
    const { autoConnect } = useAutoConnect();
    const location = useLocation();
    const navigate = useNavigate();
    
    const isHome = location.pathname === '/';
    const { account, setAccount } = useContext(StoreContext);
    const [ isConnected, setIsConnected ] = useState(false);
    const { connected, wallet, connect, disconnect, publicKey } = useWallet();
    
    useEffect(() => {
        if (connected || autoConnect) {
            setIsConnected(true);
            const getWallet = async () => {
                // Check if window.solana is defined
                if (window.solana) {
                    try {
                        console.log('window.solana---', window.solana);
                        const resp = await window.solana.connect();
                        const walletAddress = resp.publicKey.toString(); 
                        // const [account, setAccount] = useLocalStorage('account', walletAddress);
                        localStorage.setItem('wallet', walletAddress);        
                        await api.signUp(walletAddress);
                        setAccount(walletAddress);
                        setIsConnected(true);
                    } catch (error) {
                        console.error('Connection failed:', error);
                        // Handle connection error (e.g., show a toast notification)
                    }
                } else {
                    if (publicKey) {
                        console.log('publicKey---', publicKey);
                        const walletAddress = publicKey.toString();
                        localStorage.setItem('wallet', walletAddress);   
                        setAccount(walletAddress);
                        api.signUp(walletAddress);
                    }
                }
            }
            getWallet();
        }
    }, [publicKey]);

    // const disconnectWallet = () => {
    //     localStorage.removeItem('wallet');
    //     localStorage.removeItem('token');
    //     setAccount(null);
    //     setIsConnected(false);
    //     toast.success('Wallet disconnected successfully');
    // }

    return (
        <div className='header'>
            <div className='header-logo d-flex align-items-center justify-content-between container'>
                <div className='header-logo-icon d-flex align-items-center' onClick={() => {
                    window.location.href = '/';
                }}>
                    <img src={logo} alt="logo" width={50} height={50} />
                    <h4 className='mb-0 mx-2'>{isMobile ? '' : 'Copy Trading Bot'}</h4>
                </div>
                <div>
                    {isHome ? <div className='btn-app btn-outline-start' onClick={() => {
                        window.location.href = '/app';
                    }}>Start App</div> : <WalletMultiButton/>}
                </div>
            </div>
        </div>
    )
}

export default Header;