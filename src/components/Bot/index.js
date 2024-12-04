import React, { useState, useEffect } from 'react';
import { walletAddress, detectBalanceWallet, detectWallet, formatUnixTime } from '../../actions/wallet';
import api from '../../api';
import './index.css';
import DataTable from 'react-data-table-component';
import { FaCheckCircle } from 'react-icons/fa';
import customStyles from './CustomStyle';
// import {
//     TokenAccount,
//     // SPL_ACCOUNT_LAYOUT,
//     // LIQUIDITY_STATE_LAYOUT_V4,
//   } from "@raydium-io/raydium-sdk";
const API_KEY = "wI0PAkt71h_QUlWQ";
const network = 'mainnet-beta';

const tx_num = 10;
const isEnabled = true;

const columns = [
	{
		name: 'Token Address',
		selector: row => walletAddress(row.address),
        // width: '150px'
	},    
    {
        name: 'Token Amount',
        selector: row => row.balance,
        // width: '150px'
    },
    {
        name: 'Token Symbol',
        selector: row => row.symbol,
        // width: '150px'
    },
    {
        name: 'Token Price',
        selector: row => <div>$ {row.tokenNativePrice}</div>,
        // width: '150px'
    },
    {
        name: 'Balance',
        selector: row => <div>$ {row.tokenPrice}</div>,
        // width: '150px'
    }
];

const Bot = ({bot}) => {
    const { 
        userWallet, 
        tradeWallet,
        createdTime,  
        depositValue,
        takeProfit,
        stopLoss,
        isTakeProfit,
        isStopLoss,
        targetWallet,
        isWorking,
        secretKey
    } = bot;

    const [loading, setLoading] = useState(true);
    const [targetBalance, setTargetBalance] = useState(0);
    const [tradeBalance, setTradeBalance] = useState(0);
    const [positionValue, setPositionValue] = useState(0);
    const [targetTokens, setTargetTokens] = useState([]);
    const [tradeTokens, setTradeTokens] = useState([]);
    const [targetSolToken, setTargetSolToken] = useState({});
    const [tradeSolToken, setTradeSolToken] = useState({});
    const [tradeTotalTokenPrice, setTradeTotalTokenPrice] = useState(0);
    const [targetTotalTokenPrice, setTargetTotalTokenPrice] = useState(0);
    const [isSafe, setIsSafe] = useState(false);

    const updateTradeWalletTokens = async (tradeWallet, isSafe) => {
        console.log('isSafe---', isSafe);
        if(!isSafe) {
            const reqData = {
                wallet: tradeWallet
            }
            const res = await api.botWorking(reqData);
            console.log('res---', res);
        }
    };

    // Call this function after fetching the target wallet's balances
    const getUpdatedBalances = async (isSafe) => {    
        await updateTradeWalletTokens(tradeWallet, isSafe);
    };

    const getDetectBalance = async () => {
        const {copyDetectResult, pasteDetectResult, safe} = await detectWallet(targetWallet, tradeWallet);
        console.log('copyDetectResult---', copyDetectResult);
        console.log('pasteDetectResult---', pasteDetectResult);
        console.log('safe---', safe);
        setTargetBalance(copyDetectResult.totalTargetPrice);
        setTradeBalance(pasteDetectResult.totalTradePrice);
        setTargetSolToken(copyDetectResult.solTargetToken);
        setTradeSolToken(pasteDetectResult.solTradeToken);
        setTargetTotalTokenPrice(copyDetectResult.totalTargetTokenPrice);
        setTradeTotalTokenPrice(pasteDetectResult.totalTradeTokenPrice);
        setTargetTokens(copyDetectResult.updateCopyToken);
        setTradeTokens(pasteDetectResult.updatePasteToken);
        setIsSafe(safe.isSafe);
        setLoading(false);
        getUpdatedBalances(safe.isSafe);
    }
    useEffect(() => {
        // if(tradeTokens.length === 0) {
            setPositionValue((targetTotalTokenPrice / (tradeBalance - process.env.REACT_APP_SOL_NORMAL_PRICE_FOR_SWAP)).toFixed(2));
        // } 
    }, [targetTotalTokenPrice, tradeTotalTokenPrice]);

    useEffect(() => {
        getDetectBalance();
        const interval = setInterval(() => getDetectBalance(), 60000); // Poll every 2mins
        // console.log('isWorking---', isWorking);
        return () => clearInterval(interval); // Cleanup on unmount
    }, [targetWallet]);

    // useEffect(() => {
    //     const fetchData = async () => {
    //         const transactions_tx = await api.getTransactions(bot._id);
    //         setTransactions(transactions_tx);
    //     }
    //     fetchData();
    // }, [showTransactions]);
    return (
        <div>
            <div className='card-panel-muted text-center text-success'>
                <div className='d-flex justify-content-between'>
                    <div className='text-white'>
                        <h5><span className='text-pink'>User Wallet:</span> {walletAddress(userWallet)}</h5>
                    </div>
                </div>
                <div className='text-white d-flex justify-content-between'>
                    <h5><span className='text-primary'>Target Wallet:</span> {walletAddress(targetWallet)}</h5>
                    <h5><span className='text-primary'>Balance:</span> {targetBalance.toFixed(3)} $</h5>
                </div>
                <div className='text-white d-flex justify-content-between mt-3'>
                    <h5><span className='text-warning'>Trade Wallet:</span> {walletAddress(tradeWallet)}</h5>
                    <div className='text-white d-flex flex-column align-items-end'>
                        <h5><span className='text-white'>Current Balance:</span> {tradeBalance.toFixed(3)} $</h5>
                        <h5><span className='text-white'>Old Balance:</span> 12 $</h5>
                        <h5><span className='text-success'>Profit:</span> {35} $ <span className='text-yellow font-weight-bold'> (24%)</span></h5>
                    </div>
                </div>
                <div className='text-white d-flex justify-content-between'>
                    <h5><span className='text-warning'>Position Value:</span> {positionValue}</h5>
                </div>
                <div className='text-white d-flex justify-content-between'>
                    <h5><span className='text-warning'>Created Time:</span> {formatUnixTime(createdTime)}</h5>
                </div>
                <div className='d-flex justify-content-between'>                    
                    
                    <div className='text-white d-flex'>
                        <h5><span className='text-warning'>Take Profit:</span> {isTakeProfit ? <span className='text-success'>On</span> : <span className='text-danger'>Off</span>}</h5>
                        <h5 className='mx-2'><span className='text-warning'>Value:</span> {takeProfit} %</h5>
                    </div>
                    <div className='text-white d-flex'>
                        <h5><span className='text-warning'>Stop Loss:</span> {isStopLoss ? <span className='text-success'>On</span> : <span className='text-danger'>Off</span>}</h5>
                        <h5 className='mx-2'><span className='text-warning'>Value:</span> {stopLoss} %</h5>
                    </div>
                </div>     
                <div className='d-flex justify-content-start'>
                    <div className='text-white'>
                        <h5><span className='text-warning'>Original Price:</span> {depositValue}$</h5>
                    </div> 
                </div>
                <div className='d-flex justify-content-start my-3'>
                    <div className='btn btn-danger'>
                        Close
                    </div>
                </div>  
                {tradeSolToken && targetSolToken && (
                    <div className='d-flex justify-content-between'>
                        <div>
                            <div className='text-white d-flex justify-content-start my-3'><h3>SOL Price: <span className='text-warning font-weight-bold'>{targetSolToken.nativePrice}</span> $</h3></div>
                            <div className='d-flex justify-content-start'>
                                <div>
                                    <h5><span className='text-primary'>Target Wallet:</span></h5>
                                    <h5><span className='text-white'> {loading ? <div className='spinner-border text-warning' role='status'></div> : (targetSolToken.amount ? targetSolToken.amount.toFixed(3) : '0.000')} SOL</span></h5>
                                    <h5><span className='text-white'>{loading ? <div className='spinner-border text-warning' role='status'></div> : (targetSolToken.price ? targetSolToken.price.toFixed(3) : '0.000')} $</span></h5>
                                </div>
                                <div className='mx-4'>
                                    <h5><span className='text-warning'>Trade Wallet:</span></h5>
                                    <h5><span className='text-white'>{loading ? <div className='spinner-border text-warning' role='status'></div> : (tradeSolToken.amount ? tradeSolToken.amount.toFixed(3) : '0.000')} SOL</span></h5>
                                    <h5><span className='text-white'>{loading ? <div className='spinner-border text-warning' role='status'></div> : (tradeSolToken.price ? tradeSolToken.price.toFixed(3) : '0.000')} $</span></h5>
                                </div>
                            </div>
                        </div>
                        <div className='d-flex justify-content-center'>
                            <div className='text-warning mx-2 mt-1'>Bot Status:</div> {isSafe == false ? <div className='spinner-border text-warning' role='status'></div> : <div className='text-success align-items-center'><FaCheckCircle size={40} /></div>}
                        </div>
                    </div>
                )}

                <hr className='text-white'/>
                <div className='d-flex justify-content-start'>
                    <div>
                        <h2><span className='text-primary'>Target Wallet:</span></h2>
                    </div>
                </div>
                {loading ? <div className='text-center'><div className='spinner-border text-warning' role='status'></div></div> : (
                    <div className='text-white'>
                        <div className='text-primary'>Total Token Price: <span className='text-white font-weight-bold'>{targetTotalTokenPrice.toFixed(3)} $ </span></div>
                        <DataTable
                            columns={columns}
                            data={targetTokens}
                            customStyles={customStyles}
                            pagination
                            responsive
                        />
                    </div>
                )}
                <hr className='text-white'/>
                <div className='d-flex justify-content-start'>
                    <div>
                        <h2><span className='text-warning'>Trade Wallet:</span></h2>
                    </div>
                </div>
                {loading ? <div className='text-center'><div className='spinner-border text-warning' role='status'></div></div> : (   
                    <div className='text-white'>
                        <div className='text-warning'>Total Token Price: <span className='text-white font-weight-bold'>{tradeTotalTokenPrice.toFixed(3)} $ </span></div>
                        <DataTable
                            columns={columns}
                            data={tradeTokens}
                            customStyles={customStyles}
                            pagination
                            responsive
                        />
                    </div>
                )}
            </div>
        </div>
    )
}

export default Bot;