import React, { useState, useEffect } from 'react';
import { walletAddress, detectBalance, formatUnixTime } from '../../actions/wallet';
import api from '../../api';
import './index.css';
import DataTable from 'react-data-table-component';
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
    },
    // {
    //     name: 'Status',
    //     selector: row => row.status,
    // }
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
    } = bot;

    const [showTransactions, setShowTransactions] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [targetBalance, setTargetBalance] = useState(0);
    const [tradeBalance, setTradeBalance] = useState(0);
    const [positionValue, setPositionValue] = useState(0);
    const [targetTokens, setTargetTokens] = useState([]);
    const [tradeTokens, setTradeTokens] = useState([]);
    const [targetSolToken, setTargetSolToken] = useState({});
    const [tradeSolToken, setTradeSolToken] = useState({});
    
    const fetchTransactions = async () => {
        const url = `https://api.shyft.to/sol/v1/wallet/transaction_history?wallet=${targetWallet}&network=${network}&tx_num=${tx_num}`;
        setLoading(true);
        const myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");
        myHeaders.append("x-api-key", API_KEY);

        const requestOptions = {
            method: 'GET',
            headers: myHeaders
        };

        try {
            const response = await fetch(`${url}`, requestOptions);
            const result = await response.json();
            const result_query = result.result;
            const new_transactions = [];
            result_query.map(result => {
                
                if (result.status.toLowerCase() === "success" && result.protocol && result.protocol.name && result.protocol.name.toLowerCase().includes("raydium")) {
                    // The string "raydium" is found in transaction.protocol.name
                    const new_transaction = {
                        account: result.signers[0],
                        status: result.status,
                        type: result.type,
                        signature: result.signatures[0],
                        tokenAddressA: result.token_balance_changes[0].address,
                        tokenAddressB: result.token_balance_changes[1].address,
                        tokenAmountA: result.token_balance_changes[0].change_amount,
                        tokenAmountB: result.token_balance_changes[1].change_amount,
                        tokenDecimalsA: result.token_balance_changes[0].decimals,
                        tokenDecimalsB: result.token_balance_changes[1].decimals,
                    }
                    new_transactions.push(new_transaction);
                    setShowTransactions(true);
                } else {
                    // The string "raydium" is not found
                    console.log("The protocol name is not raydium.");
                }                      
            });
            const res = await api.saveNewTransactions(bot._id, new_transactions);
        } catch (error) {
            console.error("Error fetching transactions:", error);
        } finally {
            setLoading(false);
        }
    };

    const updateTradeWalletTokens = async (targetTokens, tradeTokens, position) => {
        const updatedTradeTokens = {};
    
        // Calculate new amounts for each token in the target wallet
        for (const token of targetTokens) {
            console.log('token---', token);
            const { address, balance } = token; // Assuming token has address and amount properties
            const newAmount = balance / position;
            console.log('newAmount---', newAmount);
            // Check if the trade wallet has enough balance for the token
            console.log('tradeTokens---', tradeTokens);
            const tradeTokenBalance = tradeTokens.find(t => t.address === address)?.balance || 0;
            console.log('tradeTokenBalance---', tradeTokenBalance);
            if (tradeTokenBalance < newAmount) {
                // Perform swap to acquire the necessary amount
                const amountToSwap = newAmount - tradeTokenBalance;
                // await performSwap(address, amountToSwap); // Implement this function to handle the swap
            }
    
            // Update the trade token amount
            updatedTradeTokens[address] = newAmount;
        }
    
        // Update the state with the new trade tokens
        // setTradeTokens(prevTokens => {
        //     return prevTokens.map(token => {
        //         if (updatedTradeTokens[token.address] !== undefined) {
        //             return { ...token, amount: updatedTradeTokens[token.address] };
        //         }
        //         return token;
        //     });
        // });
    };
    const updateTradeWalletNativeToken = async () => {
        const {balance} = targetSolToken; 
        console.log('targetSolToken---', targetSolToken);
        console.log('tradeSolToken---', tradeSolToken);
        const newAmount = balance / positionValue;
        console.log('newAmount---', newAmount);
        if (Math.abs(newAmount - tradeSolToken.balance) > tradeSolToken.balance * 0.003) {
            const availableSolAmountToSwap = newAmount - tradeSolToken.balance;
            console.log('availableSolAmountToSwap---', availableSolAmountToSwap);
            // await performSwap(address, amountToSwap); // Implement this function to handle the swap
        }
    }

    // Call this function after fetching the target wallet's balances
    const getUpdatedBalances = async () => {    
        await updateTradeWalletNativeToken();
        // await updateTradeWalletTokens(targetTokens, tradeTokens, positionValue);
    };

    const getDetectBalance = async () => {
        const {accountTotalPrice: target_balance, tokens: target_tokens, solToken: _target_solToken} = await detectBalance(targetWallet);
        const {accountTotalPrice: trade_balance, tokens: trade_tokens, solToken: _trade_solToken} = await detectBalance(tradeWallet);
        setTargetSolToken(_target_solToken);
        setTradeSolToken(_trade_solToken);
        setTargetBalance(target_balance);
        setTradeBalance(trade_balance);
        setTargetTokens(target_tokens);
        setTradeTokens(trade_tokens);
        setLoading(false);
        getUpdatedBalances();
    }
    useEffect(() => {
        setPositionValue((targetBalance / tradeBalance).toFixed(2));
    }, [targetBalance, tradeBalance]);

    useEffect(() => {
        getDetectBalance();
        const interval = setInterval(() => getDetectBalance(), 3600000); // Poll every 20 seconds

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
                        <h5><span className='text-warning'>User Wallet:</span> {walletAddress(userWallet)}</h5>
                    </div>
                </div>
                
                <div className='text-white d-flex justify-content-between'>
                    <h5><span className='text-warning'>Trade Wallet:</span> {walletAddress(tradeWallet)}</h5>
                    <h5><span className='text-warning'>Balance:</span> {tradeBalance} $</h5>
                </div>
                <div className='text-white d-flex justify-content-between'>
                    <h5><span className='text-warning'>Target Wallet:</span> {walletAddress(targetWallet)}</h5>
                    <h5><span className='text-warning'>Balance:</span> {targetBalance} $</h5>
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
                    <>
                        <div className='text-white d-flex justify-content-start my-3'><h3>SOL Price: <span className='text-warning font-weight-bold'>{targetSolToken.nativePrice}</span> $</h3></div>
                        <div className='d-flex justify-content-start'>
                            <div>
                                <h5><span className='text-primary'>Target Wallet:</span></h5>
                                <h5><span className='text-white'> {targetSolToken.balance} {targetSolToken.symbol}</span></h5>
                                <h5><span className='text-white'>{targetSolToken.tokenPrice} $</span></h5>
                            </div>
                            <div className='mx-4'>
                                <h5><span className='text-warning'>Trade Wallet:</span></h5>
                                <h5><span className='text-white'>{tradeSolToken.balance} {tradeSolToken.symbol}</span></h5>
                                <h5><span className='text-white'>{tradeSolToken.tokenPrice} $</span></h5>
                            </div>
                        </div>
                    </>
                )}

                <hr className='text-white'/>
                <div className='d-flex justify-content-start'>
                    <div>
                        <h2><span className='text-white'>Target Wallet:</span></h2>
                    </div>
                </div>
                {loading ? <div className='text-center'><div className='spinner-border text-warning' role='status'></div></div> : (
                    <DataTable
                        columns={columns}
                        data={targetTokens}
                        customStyles={customStyles}
                        pagination
                        responsive
                    />
                )}
                <hr className='text-white'/>
                <div className='d-flex justify-content-start'>
                    <div>
                        <h2><span className='text-white'>Trade Wallet:</span></h2>
                    </div>
                </div>
                {loading ? <div className='text-center'><div className='spinner-border text-warning' role='status'></div></div> : (   
                    <DataTable
                        columns={columns}
                        data={tradeTokens}
                        customStyles={customStyles}
                        pagination
                        responsive
                    />
                )}
            </div>
        </div>
    )
}

export default Bot;