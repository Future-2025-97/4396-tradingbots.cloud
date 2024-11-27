import React from 'react';
import './App.css';

import { Routes, Route, BrowserRouter } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';

import 'react-notifications/lib/notifications.css';
import '@solana/wallet-adapter-react-ui/styles.css';

import { StoreProvider } from './context/PageStore';
import Header from './components/Layouts/Header';
import Footer from './components/Layouts/Footer';
import Home from './views/Home';
import ContextProvider from './context/ContextProvider';
import { Buffer } from 'buffer';
window.Buffer = Buffer; 

function App() {
  return (
    <ContextProvider>
    <StoreProvider>
      <BrowserRouter>
        <React.Fragment>
          <Header />
          <Routes>
            <Route path="/" element={<Home />} />
          </Routes>
          <Footer />
        </React.Fragment>
      </BrowserRouter>
      <ToastContainer
          className='custom-toast'
          autoClose={3000}
          closeButton={false}
          closeOnClick
          position='bottom-right'
        />
    </StoreProvider>
    </ContextProvider>
  );
}

export default App;
