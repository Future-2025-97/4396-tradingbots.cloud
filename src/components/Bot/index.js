import React, { useState, useEffect } from 'react';
import { walletAddress, detectWallet, formatUnixTime } from '../../actions/wallet';
import api from '../../api';
import './index.css';
import DataTable from 'react-data-table-component';
import { FaCheckCircle } from 'react-icons/fa';
import customStyles from './CustomStyle';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import { columns } from './column';
import { toast } from 'react-toastify';
import { useMediaQuery } from 'react-responsive';

const Bot = ({bot, setTradingBots, userInfo}) => {
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
        isFinished,
        depositPrice
    } = bot;

    const isMobile = useMediaQuery({ query: '(max-width: 768px)' });

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
    const [isClosed, setIsClosed] = useState(false);
    const [isWithdraw, setIsWithdraw] = useState(false);
    const [closeModal, setCloseModal] = useState(false);
    const [withdrawModal, setWithdrawModal] = useState(false);
    const [withdrawAddress, setWithdrawAddress] = useState('');
    const [profit, setProfit] = useState(0);
    const [profitPercentage, setProfitPercentage] = useState(0);

    const updateTradeWalletTokens = async (tradeWallet, isSafe) => {
        if(!isSafe) {
            const reqData = {
                wallet: tradeWallet
            }
            const res = await api.botWorking(reqData);
        }
    };

    // Call this function after fetching the target wallet's balances
    const getUpdatedBalances = async (isSafe) => {    
        await updateTradeWalletTokens(tradeWallet, isSafe);
    };
    const closeBot = async (botId) => {
        const res = await api.closeBot(botId);
        let bot = [];
        bot.push(res.bot);
        setIsClosed(true);
        setIsWithdraw(false);
        setCloseModal(false);      
        setTradingBots(bot);
        toast.success(`${res.msg}`);
    }
    const getDetectBalance = async () => {
        // if(isFinished) {
        //     return;
        // }
        if(userInfo) {
            const {copyDetectResult, pasteDetectResult, safe} = await detectWallet(targetWallet, tradeWallet, userInfo);
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
            const profitValue = pasteDetectResult.totalTradePrice - depositPrice;
            const profitPercentageValue = (profitValue / depositPrice * 100).toFixed(4);
            setProfit(profitValue);
            setProfitPercentage(profitPercentageValue);
        }
    }
    useEffect(() => {
        setIsClosed(isFinished);
        setIsWithdraw(isFinished);
        const positionAmount = (targetTotalTokenPrice / (tradeBalance - process.env.REACT_APP_SOL_NORMAL_PRICE_FOR_SWAP)).toFixed(2);
        if(positionAmount > 0) {
            setPositionValue(positionAmount);
        }
    }, [targetTotalTokenPrice, tradeTotalTokenPrice]);

    useEffect(() => {
        getDetectBalance();
        const interval = setInterval(() => getDetectBalance(), 60000); // Poll every 2mins
        return () => clearInterval(interval); // Cleanup on unmount
    }, [targetWallet, userInfo]);

    const withdrawBot = async (botId, withdrawAddress) => {
        const res = await api.withdrawBot(botId, withdrawAddress);
        if(res.error === false) {
            setWithdrawModal(false);
            setIsWithdraw(false);
            toast.success(api.customToastWithSignature(`${res.msg}`));
            setTradingBots([]);
        } else {
            toast.error(`Try again later`);
            setWithdrawModal(false);
            setWithdrawAddress('');
        }
    }
    return (
        <div>
            <div className='card-panel-muted text-center text-success'>
                <div className='d-flex justify-content-between'>
                    <div className='text-white'>
                        <h5><span className='text-pink'>User Wallet:</span> {walletAddress(userWallet)}</h5>
                    </div>
                </div>
                <div className='text-white d-flex justify-content-between flex-wrap'>
                    <h5><span className='text-primary'>Target Wallet:</span> {walletAddress(targetWallet)}</h5>
                    <h5><span className='text-primary'>Balance:</span> {targetBalance.toFixed(3)} $</h5>
                </div>
                <div className='text-white d-flex justify-content-between mt-3 flex-wrap'>
                    <h5><span className='text-warning'>Trade Wallet:</span> {walletAddress(tradeWallet)}</h5>
                    <div className={`text-white d-flex flex-column ${isMobile ? 'align-items-start' : 'align-items-end'}`}>
                        <h5><span className='text-white'>Current Balance:</span> {tradeBalance.toFixed(3)} $</h5>
                        <h5><span className='text-white'>Old Balance:</span> {depositPrice} $</h5>
                        <h5><span className='text-success'>Profit:</span> {profit.toFixed(3)} $ <span className='text-yellow font-weight-bold'> ({profitPercentage}%)</span></h5>
                    </div>
                </div>
                <div className={`text-white d-flex justify-content-between ${isMobile ? 'mt-3' : ''}`}>
                    <h5><span className='text-warning'>Position Value:</span> {positionValue}</h5>
                </div>
                <div className='text-white d-flex justify-content-between'>
                    <h5><span className='text-warning'>Created Time:</span> {formatUnixTime(createdTime)}</h5>
                </div>
                <div className='d-flex justify-content-between'>                    
                    
                    <div className='text-white d-flex flex-wrap'>
                        <h5><span className='text-warning'>Take Profit:</span> {isTakeProfit ? <span className='text-success'>On</span> : <span className='text-danger'>Off</span>}</h5>
                        <h5 className={`${isMobile ? '' : 'mx-4'}`}><span className='text-warning'>Value:</span> {takeProfit} %</h5>
                    </div>
                    <div className='text-white d-flex flex-wrap'>
                        <h5><span className='text-warning'>Stop Loss:</span> {isStopLoss ? <span className='text-success'>On</span> : <span className='text-danger'>Off</span>}</h5>
                        <h5 className={`${isMobile ? '' : 'mx-4'}`}><span className='text-warning'>Value:</span> {stopLoss} %</h5>
                    </div>
                </div>     
                <div className='d-flex justify-content-start'>
                    <div className='text-white'>
                        <h5><span className='text-warning'>Original Price:</span> {depositValue} SOL</h5>
                    </div> 
                </div>
                <div className='d-flex justify-content-start my-3'>
                    <div className={`btn btn-danger ${isClosed ? 'disabled' : ''}`} onClick={() => setCloseModal(true)}>
                        Close
                    </div>
                    {isClosed && (
                        <div className='btn btn-success mx-4' onClick={() => setWithdrawModal(true)}>Withdraw</div>
                    )}
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
                        {!isFinished && (
                            <div className='d-flex justify-content-center'>
                                <div className='text-warning mx-2 mt-1'>Bot Status:</div> {isSafe == false ? <div className='spinner-border text-warning' role='status'></div> : <div className='text-success align-items-center'><FaCheckCircle size={40} /></div>}
                            </div>
                        )}
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
                        {userInfo && (
                            <>
                                {isMobile ? (
                                    <DataTable
                                        responsive
                                        // responsiveWrapperClassName='table-responsive'
                                        columns={columns}
                                        data={targetTokens}
                                        customStyles={customStyles}
                                        pagination
                                        // allowOverflow={true}
                                        // direction='auto'
                                        // Add any mobile-specific styles or props here
                                    />
                                ) : (
                                    <DataTable
                                        responsive
                                        columns={columns}
                                        data={targetTokens}
                                        customStyles={customStyles}
                                        pagination
                                    />
                                )}
                            </>
                        )}
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
            <Modal show={closeModal} centered onHide={() => setCloseModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Close Bot</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div>Are you sure you want to close this bot?</div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setCloseModal(false)}>Cancel</Button>
                    <Button variant="danger" onClick={() => closeBot(bot._id)}>Confirm</Button>
                </Modal.Footer>
            </Modal>
            <Modal show={withdrawModal} centered onHide={() => setWithdrawModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title className='text-warning font-weight-bold'>Withdraw</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <input type='text' className='form-control' placeholder='Enter your withdraw address' value={withdrawAddress} onChange={(e) => setWithdrawAddress(e.target.value)} />
                    <h5 className='text-center pt-4 font-weight-bold'>Are you sure you want to withdraw to this address?</h5>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setWithdrawModal(false)}>Cancel</Button>
                    <Button variant="danger" onClick={() => withdrawBot(bot._id, withdrawAddress)}>Confirm</Button>
                </Modal.Footer>
            </Modal>
        </div>
    )
}

export default Bot;