import React from 'react';
import { useMediaQuery } from 'react-responsive';
import { StoreContext } from '../../context/PageStore';
import ContentTitle from '../../components/content-title';

const Home = () => {
    const isMobile = useMediaQuery({ query: '(max-width: 600px)' })
    return (
        <div className='container'>
            <ContentTitle />
        </div>
    )
}

export default Home;
