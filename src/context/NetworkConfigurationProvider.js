import { useLocalStorage } from '@solana/wallet-adapter-react';
import { createContext, FC, ReactNode, useContext } from 'react';

export const NetworkConfigurationContext = createContext();

export function useNetworkConfiguration() {
    return useContext(NetworkConfigurationContext);
}

export const NetworkConfigurationProvider = ({ children }) => {
    const [networkConfiguration, setNetworkConfiguration] = useLocalStorage("network", "mainnet-beta");

    return (
        <NetworkConfigurationContext.Provider value={{ networkConfiguration, setNetworkConfiguration }}>{children}</NetworkConfigurationContext.Provider>
    );
};
export default NetworkConfigurationProvider;