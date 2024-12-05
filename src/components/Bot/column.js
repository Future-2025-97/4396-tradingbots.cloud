import { walletAddress } from '../../actions/wallet';

export const columns = [
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