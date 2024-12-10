import React, { useState, useEffect, useContext } from 'react';

import 'react-dropdown/style.css';
import './index.css';

import Dropdown from 'react-dropdown';
import { PiCreditCardFill } from "react-icons/pi";
import { toast } from 'react-toastify';
import medalLogo from '../../source/img/section1/medal.png';
import bulbLogo from '../../source/img/section1/bulb.ico';
import goldCup from '../../source/img/section1/Gold_Cup.png';
import docs from '../../source/img/content/docs.png';
import importWallet from '../../source/img/section1/importWallet.png';
import magic from '../../source/img/section3/magic.png';
import pencil from '../../source/img/section3/pencil.png';
import api from '../../api';
import { useWallet } from '@solana/wallet-adapter-react';
import { getUserBalance } from '../../actions/wallet';
import { StoreContext } from '../../context/PageStore';
import { Connection, 
    PublicKey, 
    SystemProgram, 
    LAMPORTS_PER_SOL,
    TransactionMessage,
    VersionedTransaction
} from '@solana/web3.js';
import * as buffer from "buffer";
import bigInt from "big-integer";
import Bot from '../Bot';
import Membership from '../MemberShip';
import { useMediaQuery } from 'react-responsive';
import { depositCheck } from '../../actions/deposit';

const quickNodeUrl = process.env.REACT_APP_QUICKNODE_URL;
const connection = new Connection(quickNodeUrl, 'confirmed');

const ContentTitle = () => {
    const { account } = useContext(StoreContext);
    // const [trades, setTrades] = useState([]);
    const [ userBalance, setUserBalance ] = useState(0);
    const [isOpenCreateTrade, setIsOpenCreateTrade] = useState(false);
    const [isOpenMemberShip, setIsOpenMemberShip] = useState(true);
    const [tradeWallet, setTradeWallet] = useState(null);
    const [depositWallets, setDepositWallets] = useState([]);
    const [targetWallet, setTargetWallet] = useState();
    const [memberShipInfo, setMemberShipInfo] = useState([]);
    const [userInfo, setUserInfo] = useState({});
    const isMobile = useMediaQuery({ query: '(max-width: 600px)' })

    const [depositWalletsCount, setDepositWalletsCount] = useState(0);

    // Add new state variables for editable values
    const [isEditingTakeProfit, setIsEditingTakeProfit] = useState(false);
    const [takeProfitValue, setTakeProfitValue] = useState(50);
    const [isTakeProfit, setIsTakeProfit] = useState(false);

    const [isEditingStopLoss, setIsEditingStopLoss] = useState(false);
    const [stopLossValue, setStopLossValue] = useState(50);
    const [isStopLoss, setIsStopLoss] = useState(false);

    const [depositValue, setDepositValue] = useState(0);
    const [depositedValue, setDepositedValue] = useState(0);
    const { publicKey, sendTransaction } = useWallet();
    const [tradingBots, setTradingBots] = useState([]);

    useEffect(() => {
        if (account) {
            const fetchUserBalance = async () => {
                const balance = await getUserBalance(account);
                setUserBalance(balance);
            };
            fetchUserBalance();
        }
        const fetchUserInfo = async () => {
            if(account){
                const response = await api.getUserWalletCount(account);
                setDepositWalletsCount(response.count);
                setUserInfo(response.userInfo);
            }
        }        
        fetchUserInfo();
    }, [account]);

    useEffect(() => {
        const fetchDepositWallets = async () => {
            if (account) { // Check if account is not null
                try {
                    const fetchedOptions = await api.getDepositWallets();
                    const _depositWallets = fetchedOptions.map(val => (val));
                    setDepositWallets(_depositWallets.slice(0, depositWalletsCount)); // Set options if account is valid

                } catch (error) {
                    console.error('Error fetching deposit wallets:', error);
                }
            } else {
                console.log('Account is null, skipping fetch for deposit wallets.');
            }
        };
        const fetchBots = async () => {
            const bots = await api.getBots(account);
            setTradingBots(bots);
        }
        const fetchMemberShipInfo = async () => {   
            if(account){    
                const membership = await api.getMemberShipInfo(account);
                setMemberShipInfo(membership);
            }
        }        
        fetchDepositWallets();
        fetchBots();
        fetchMemberShipInfo();
    }, [account, userInfo])

    const handleStopLossSave = (e) => {
        if (e.key === 'Enter') {
            setIsEditingStopLoss(false);
        }
    };
    const handleTakeProfitSave = (e) => {
        if (e.key === 'Enter') {
            setIsEditingTakeProfit(false);
        }
    }

    const generateWallet = async (e) => {
        e.preventDefault();
        try {
            const res = await api.generateWalletAccount(account);
            if(res.status === true){
                console.log('res---', res);
                if (Array.isArray(res.trade.depositWallets) && res.trade.depositWallets.length > 0) {
                    const singleWalletArray = [];
                    for (let i = 0; i < res.trade.depositWallets.length; i++) {
                        singleWalletArray.push(res.trade.depositWallets[i].wallet);
                    }
                    const updatedWallets = singleWalletArray.slice(0, depositWalletsCount);
                    console.log('singleWalletArray---', singleWalletArray);
                    setDepositWallets(updatedWallets); // Return the new array containing one wallet object
                }
            } else {
                toast.error('You have reached the maximum number of wallets');
                return []; // Return an empty array if no wallets are found
            }
        } catch (error) {
            console.log('Error generating wallet account:', error);
        }
    }
    const depositToken = async (e) => {
        window.Buffer = buffer.Buffer;
        try {
            e.preventDefault();
            const res = await depositCheck(tradeWallet, targetWallet, depositValue);
            if(res.error === true){
                toast.error(res.msg);
                return;
            }
            const senderPublicKey = new PublicKey(account);
            const recipientPublicKey = new PublicKey(tradeWallet.value);
            const senderBalance = await getUserBalance(account);
            const depositValueInLamports = depositValue * LAMPORTS_PER_SOL; // Convert depositVa
            if (senderBalance * LAMPORTS_PER_SOL < depositValueInLamports) {
                toast.error('Insufficient funds for the transaction.');
                console.error('Insufficient funds for the transaction.');
                return; // Exit the function if funds are insufficient
            }
             // Create instructions to send, in this case a simple transfer
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
                setDepositedValue(depositValue);
            }
        } catch (error) {
            console.error('Transfer failed:', error);
        }
    }
    const createTradingBot = async (e) => {
        e.preventDefault();
        const createdTime = Math.floor(new Date().getTime() / 1000);
        if (!tradeWallet || !targetWallet) {
            toast.error('Please fill in all fields');
            return;
        }
        if (depositedValue == 0) {
            toast.error('You have to deposit tokens to trading wallet');
            return;
        }
        const requestData = {
            userWallet: localStorage.getItem('wallet'),
            tradeWallet: tradeWallet,
            targetWallet: targetWallet,
            depositValue: depositValue,
            takeProfit: Number(takeProfitValue),
            isTakeProfit: isTakeProfit,
            stopLoss: Number(stopLossValue),
            isStopLoss: isStopLoss,
            createdTime: createdTime
        }
        const response = await api.createTradingBot(requestData);
        if (response.status === 200) {
            toast.success('Trading bot created successfully');
            setIsOpenCreateTrade(false);
            setTradeWallet('');
            setTargetWallet('');
            setDepositValue(0);
            setDepositedValue(0);
            setTakeProfitValue(50);
            setStopLossValue(50);
            setIsStopLoss(false);
            setIsTakeProfit(false);
            setTradingBots([...tradingBots, response.data.bot]);
            setDepositWallets([response.data.tradeWallets.depositWallets]);
        } else {
            toast.error(response);
        }
    }
    return (
        <div className='content-position mb-5'>
            <div className='card my-1'>
                <div>
                    <img src={medalLogo} alt='logo' width={30} height={30} />
                    <span className='mx-3 align-middle'>Solana Copy Trading Bot</span>
                    <img src={medalLogo} alt='logo' width={30} height={30} />
                </div>
                <div>
                    <img src={bulbLogo} alt='logo' width={30} height={30} />
                    <span className='mx-3 align-middle'>Create wallet, Deposit MEME coin and create copy trade</span>
                </div>
            </div>
            <div className='card-panel text-center' onClick={() => setIsOpenMemberShip(!isOpenMemberShip)}>
                <div className='d-flex justify-content-center'>
                    <img src={goldCup} alt='logo' width={30} height={30} />
                    <span className='mx-3'>MemberShip</span>
                </div>
            </div>
            {
                isOpenMemberShip && memberShipInfo.length > 0 && userInfo.membership !== null && (
                    <div>
                        <Membership memberShipInfo={memberShipInfo} userInfo={userInfo} account={account} />
                    </div>
                )
            }
            <div className='card-panel text-center' onClick={() => setIsOpenCreateTrade(!isOpenCreateTrade)}>
                <div className='d-flex justify-content-center'>
                    <img src={goldCup} alt='logo' width={30} height={30} />
                    <span className='mx-3'>Create Copy Trades & Wallets</span>
                </div>
            </div>
            {isOpenCreateTrade && (
                <div>
                    <div className='d-flex flex-wrap justify-content-between'>
                        <div className='card-panel w-100 d-flex justify-content-center' onClick={(e) => generateWallet(e)}>
                            <img src={magic} alt='logo' width={30} height={30} />
                            <h5 className="mx-2 align-middle">Generate My Wallet</h5>
                        </div>
                        <div>
                            {/* <img src={importWallet} alt='logo' width={30} height={30} />
                            <h5 className="mx-2 align-middle mt-1">Import My Wallet</h5> */}
                        </div>
                    <div className={`card-panel ${isMobile ? 'w-100' : 'w-49'} d-flex justify-content-center`}>
                        <PiCreditCardFill color='#f8dc62' size={35} className='align-self-center mx-3'/>
                        <Dropdown className={`${isMobile ? 'base-class-wallet-mobile' : 'base-class-wallet'}`} controlClassName='control-class-wallet' menuClassName='menu-class' placeholderClassName='placeholder-class' options={depositWallets} onChange={(values) => setTradeWallet(values)} placeholder="Select wallet address" />
                    </div>
                    <div className={`card-panel ${isMobile ? 'w-100' : 'w-49'} d-flex justify-content-center`}>
                        <img src={docs} className='mx-3 mt-1' alt='logo' width={30} height={30} />
                        <input type='text' placeholder='Enter target wallet address' value={targetWallet} onChange={(e) => setTargetWallet(e.target.value)} className={`form-control main-input ${isMobile ? 'w-100' : 'w-50'}`} /></div>
                    </div>
                    <div>
                        <div className='card-panel-muted text-center d-flex justify-content-between flex-wrap'>
                            <div className={`d-flex justify-content-center flex-wrap ${isMobile ? 'w-100' : 'w-50'}`}>
                                <div className={`d-flex flex-column ${isMobile ? 'w-100' : 'w-50'}`}>
                                    <p className='text-danger text-italic mb-0'>You can deposit minimum 0.001 SOL!</p>   
                                    <h5 className='mx-3 mt-2'>User balance : {userBalance}</h5>
                                </div>
                                <div className='align-self-center d-flex'>
                                    <input
                                        type="number"
                                        value={depositValue}
                                        onChange={(e) => setDepositValue(e.target.value)}
                                        autoFocus
                                        className={`main-input ${isMobile ? 'w-100' : 'w-50'} p-1`}
                                        style={{ width: '50px' }}
                                    />
                                </div>
                                <div className={`align-self-center w-100 ${isMobile ? 'mt-3' : ''}`}><div className={`${isMobile ? '' : 'mx-3'} w-100 btn btn-primary text-center`} onClick={(e) => depositToken(e)}>Deposit</div></div>
                            </div>
                            <div className={`mt-2 align-self-center ${isMobile ? 'w-100' : 'w-50'}`}><h5>Deposited Amount: {depositedValue} </h5></div>
                        </div>   
                    </div>
                    <div>
                        <div className='card-panel-muted text-center'>
                            <div className='d-flex justify-content-center'>
                                <h5 className='mx-3 mt-1'>Setting Option</h5>
                            </div>
                        </div>
                        <div className='d-flex flex-wrap justify-content-between'>
                            <div className={`card-panel ${isMobile ? 'w-100' : 'w-49'} d-flex justify-content-center`}>
                                <h5 className="mx-2 align-middle mt-1">
                                    Take Profit: + {
                                        isEditingTakeProfit ? (
                                            <input
                                                type="number"
                                                value={takeProfitValue}
                                                onChange={(e) => setTakeProfitValue(e.target.value)}
                                                onKeyDown={handleTakeProfitSave}
                                                onBlur={() => setIsEditingTakeProfit(false)}
                                                autoFocus
                                                className="main-input w-50 p-1"
                                                style={{ width: '50px' }}
                                            />
                                        ) : (
                                            <span>{takeProfitValue}</span>
                                        )
                                    }
                                    <img src={pencil} alt='logo' className='cursor-pointer' width={30} height={30} onClick={() => setIsEditingTakeProfit(true)} /> % </h5>
                            </div>
                            <div className={`card-panel ${isMobile ? 'w-100' : 'w-49'} d-flex justify-content-center ${isTakeProfit ? 'bg-active-green text-success' : 'text-danger'}`} onClick={() => setIsTakeProfit(!isTakeProfit)}>
                                <h4 className="mx-2 align-middle mt-2">{isTakeProfit ? 'On' : 'Off'}</h4>
                            </div>
                            <div className={`card-panel ${isMobile ? 'w-100' : 'w-49'} d-flex justify-content-center`}>
                                <h5 className="mx-2 align-middle mt-1">
                                Stop Loss: - {
                                        isEditingStopLoss ? (
                                            <input
                                                type="number"
                                                value={stopLossValue}
                                                onChange={(e) => setStopLossValue(e.target.value)}
                                                onKeyDown={handleStopLossSave}
                                                onBlur={() => setStopLossValue(false)}
                                                autoFocus
                                                className="main-input w-50 p-1"
                                                style={{ width: '50px' }}
                                            />
                                        ) : (
                                            <span>{stopLossValue}</span>
                                        )
                                    }
                                    <img src={pencil} alt='logo' className='cursor-pointer' width={30} height={30} onClick={() => setIsEditingStopLoss(true)} /> % 
                                </h5>
                            </div>
                            <div className={`card-panel ${isMobile ? 'w-100' : 'w-49'} d-flex justify-content-center ${isStopLoss ? 'bg-active-green text-success' : 'text-danger'}`} onClick={() => setIsStopLoss(!isStopLoss)}>
                                <h4 className="mx-2 align-middle mt-2">{isStopLoss ? 'On' : 'Off'}</h4>
                            </div>
                        </div>
                    </div>
                    <div className='card-panel text-center' onClick={(e) => createTradingBot(e)}>
                        <div className='d-flex justify-content-center'>
                            <img src={magic} alt='logo' width={30} height={30} />
                            <h5 className='mx-3 mt-1'>Create</h5>
                        </div>
                    </div>
                </div>
            )}
            <hr className='my-3 text-white'/>
            
            <div className='d-flex justify-content-center flex-wrap'>
                <h1 className='text-center text-white'>Trading Bots Data</h1> 
                <h4 className={`text-warning mx-4 ${isMobile ? '' : 'mt-3'}`}>{userInfo.membership ? userInfo.membership.name : 'Free'} Version</h4>
            </div>
            {tradingBots.length > 0 && (
                <div>
                    {tradingBots.map((bot, index) => (
                        <Bot key={index} bot={bot} setTradingBots={setTradingBots} userInfo={userInfo} />
                    ))}
                </div>
            )}
            {tradingBots.length === 0 && (
                <div className='card-panel text-center'>
                    <h5 className='text-grey'>No trading bots data</h5>
                </div>
            )}
        </div>
    )
}

export default ContentTitle;