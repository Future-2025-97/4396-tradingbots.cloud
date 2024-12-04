import React, { useState, useEffect } from 'react';
import { walletAddress, detectBalanceWallet, detectWallet, formatUnixTime } from '../../actions/wallet';
import api from '../../api';
import './index.css';
import DataTable from 'react-data-table-component';
import { FaCheckCircle } from 'react-icons/fa';

const Membership = () => {
    const today = new Date();
    const oneMonthLater = new Date(today);
    oneMonthLater.setMonth(today.getMonth() + 1);

    const twoWeeksLater = new Date(today);
    twoWeeksLater.setDate(today.getDate() + 14); 

    const formatDate = (date) => {
        return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    };
    return (
        <div className='membership-container'>
            <div className='member-ship-panel d-flex justify-content-center'>
                <div className='text-center member-ship-item'>
                    <h4 className='text-grey font-weight-bold'>Free Version</h4>
                    <div className='text-white'>
                        <span className='text-warning font-size-24'>-</span> SOL
                        <p className='text-white'>Available token: 1</p> 
                        <p className='text-white'>Available copy trades period: 15 days</p> 
                        <div className='d-flex justify-content-center mx-3'><div className='text-warning'>From <span className='text-white'>{formatDate(today)}</span></div> <div className='text-primary mx-3'>To <span className='text-white'>{formatDate(twoWeeksLater)}</span></div></div>
                        <div className='btn btn-primary mt-3 disabled'>Using Now</div>
                    </div>
                </div>                
                <div className='text-center member-ship-item'>
                    <h4 className='text-primary font-weight-bold'>Pro Version</h4>
                    <div className='text-white'>
                        <span className='text-warning font-size-24'>0.03</span> SOL
                        <p className='text-white'>Available token: 3</p> 
                        <p className='text-white'>Available copy trades period: 1 month</p> 
                        <div className='d-flex justify-content-center mx-3'><div className='text-warning'>From <span className='text-white'>{formatDate(today)}</span></div> <div className='text-primary mx-3'>To <span className='text-white'>{formatDate(oneMonthLater)}</span></div></div>
                        <div className='btn btn-success mt-3'>Buy Now</div>
                    </div>
                </div>                
                <div className='text-center member-ship-item'>
                    <h4 className='text-success font-weight-bold'>VIP Version</h4>
                    <div className='text-white'>
                        <span className='text-warning font-size-24'>0.05</span> SOL
                        <p className='text-white'>Available token: 5</p> 
                        <p className='text-white'>Available copy trades period: 1 month</p> 
                        <div className='d-flex justify-content-center mx-3'><div className='text-warning'>From <span className='text-white'>{formatDate(today)}</span></div> <div className='text-primary mx-3'>To <span className='text-white'>{formatDate(oneMonthLater)}</span></div></div>
                        <div className='btn btn-success mt-3'>Buy Now</div>
                    </div>
                </div>                
            </div>
        </div>
    )
}

export default Membership;