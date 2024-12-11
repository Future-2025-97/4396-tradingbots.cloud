import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import {
    UnsafeBurnerWalletAdapter
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { useCallback, useMemo } from 'react';
import { AutoConnectProvider, useAutoConnect } from './AutoConnectProvider';
import { NetworkConfigurationProvider, useNetworkConfiguration } from './NetworkConfigurationProvider';
import {
    WalletModalProvider
} from '@solana/wallet-adapter-react-ui';
const WalletContextProvider = ({ children }) => {
    const { autoConnect } = useAutoConnect();
    const { networkConfiguration } = useNetworkConfiguration();
    const network = networkConfiguration;
    const endpoint = useMemo(() => clusterApiUrl(network), [network]);

    const wallets = useMemo(
        () => [
            new UnsafeBurnerWalletAdapter(),
        ],
        [network]
    );
    const onError = useCallback(
        (error) => {
            console.error(error);
        },
        []
    );
    return (
        // TODO: updates needed for updating and referencing endpoint: wallet adapter rework
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} onError={onError} autoConnect={autoConnect}>
                <WalletModalProvider>
                    {children}
                </WalletModalProvider>
			</WalletProvider>
        </ConnectionProvider>
    );
};

const ContextProvider = ({ children }) => {
    return (
        <>
            <NetworkConfigurationProvider>
                <AutoConnectProvider>
                    <WalletContextProvider>{children}</WalletContextProvider>
                </AutoConnectProvider>
            </NetworkConfigurationProvider>
        </>
    );
};

export default ContextProvider;
