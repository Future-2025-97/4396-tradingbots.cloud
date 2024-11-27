   // src/context/PageStore.js
   import React, { createContext, useState } from 'react';

   const StoreContext = createContext();

   const StoreProvider = ({ children }) => {
       const [account, setAccount] = useState(null);
       return (
           <StoreContext.Provider value={{ account, setAccount }}>
               {children}
           </StoreContext.Provider>
       );
   };

   export { StoreContext, StoreProvider };