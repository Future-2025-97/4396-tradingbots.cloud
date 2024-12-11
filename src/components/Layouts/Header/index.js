import React, { useContext, useEffect, useState } from 'react';
import './index.css';
import logo from '../../../source/img/header/icon.png';
import { StoreContext } from '../../../context/PageStore';
import api from '../../../api';
import { useWallet } from '@solana/wallet-adapter-react';
import {
    WalletMultiButton
} from '@solana/wallet-adapter-react-ui';
import { useAutoConnect } from '../../../context/AutoConnectProvider';
import { useMediaQuery } from 'react-responsive';

const Header = () => {
    const isMobile = useMediaQuery({ query: '(max-width: 600px)' })
    const { autoConnect } = useAutoConnect();
    
    const { account, setAccount } = useContext(StoreContext);
    const [ isConnected, setIsConnected ] = useState(false);
    const { connected, wallet, connect, disconnect } = useWallet();
    
    useEffect(() => {
        if (connected || autoConnect) {
            setIsConnected(true);
            const getWallet = async () => {
                const resp = await window.solana.connect();
                const walletAddress = resp.publicKey.toString();  
                localStorage.setItem('wallet', walletAddress);        
                await api.signUp(walletAddress);
                setAccount(walletAddress);
                setIsConnected(true);
            }
            getWallet();
        }
    }, []);

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
                <div className='header-logo-icon d-flex align-items-center'>
                    <img src={logo} alt="logo" width={50} height={50} />
                    <h4 className='mb-0 font-weight-bold'>{isMobile ? '' : 'Solana Copy Trading Bot'}</h4>
                </div>
                <div>
                    <WalletMultiButton/>
                    {/* <div className='btn btn-outline-main' onClick={isConnected ? disconnectWallet : WalletConnector}>
                        {account ? walletAddress(account) : 'Connect Wallet'}
                    </div> */}
                </div>
            </div>
        </div>
    )
}

export default Header;