const mergeArraysWithDuplicates = (copyToken, pasteToken, positionValue) => {
    try{
        const result = [];
        const idSet = new Set(pasteToken.map(item => item.address)); // Track ids from array2

        copyToken.forEach(item => {
            if (idSet.has(item.address)) {
                // If the id exists in pasteToken, add the corresponding item from pasteToken
                const correspondingItem = pasteToken.find(i => i.address === item.address);
                let type = 0;
                let swapAmount = 0;
                if(item.balance / positionValue > correspondingItem.balance) {
                    type = 0;
                    swapAmount = correspondingItem.balance - item.balance * positionValue;
                } else {
                    type = 1;
                    swapAmount = correspondingItem.balance - item.balance / positionValue;
                }
                result.push({ 
                    address: item.address,
                    balance: correspondingItem.balance, 
                    info: correspondingItem.info, 
                    symbol: correspondingItem.symbol, 
                    tokenNativePrice: correspondingItem.tokenNativePrice,
                    tokenPrice: correspondingItem.tokenPrice,
                    type: type,
                    swapAmount: swapAmount
                });
            } else {
                type = 0;
                swapAmount = item.balance;
                // If the id does not exist in pasteToken, add with undefined name
                result.push({ 
                    address: item.address, 
                    balance: undefined, 
                    info: item.info,
                    type: type,
                    swapAmount: swapAmount,
                    symbol: item.symbol,
                    tokenNativePrice: item.tokenNativePrice,
                    tokenPrice: item.tokenPrice,
                });
            }
        });
        
        const idSet2 = new Set(copyToken.map(item => item.address));

        // Add items from pastToken that are not in array1
        pasteToken.forEach(item => {
            if (!idSet2.has(item.address)) {
                type = 1;
                swapAmount = item.balance;
                result.push({
                    address: item.address,
                    balance: item.balance,
                    info: item.info,
                    symbol: item.symbol,
                    tokenNativePrice: item.tokenNativePrice,
                    tokenPrice: item.tokenPrice,
                    type: type,
                    swapAmount: swapAmount,
                });
            }
        });
        result.sort((a, b) => b.type - a.type);
        return result;
    } catch (error) {
        console.error('Error merging arrays with duplicates:', error);
        return null;
    }
};

module.exports = {
    mergeArraysWithDuplicates
}