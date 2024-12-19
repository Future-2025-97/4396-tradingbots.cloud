import './index.css';
import { FaFacebookF, FaInstagram, FaTwitter, FaLinkedin, FaTelegram } from 'react-icons/fa';
const Footer = () => {
    return (
        <div className='footer'>
            <div className='container d-flex align-items-center justify-content-between'>
                <div className='footer-content'>
                    @<span className='fw-bold'>2025</span>Copy Trading Bot
                </div>
                <div className='footer-social d-flex align-items-center'>
                    <a href='https://www.facebook.com/profile.php?id=100093111888184'><FaFacebookF/></a>
                    <a href='https://www.instagram.com/solanacopytradingbot/'><FaInstagram/></a>
                    <a href='https://twitter.com/solanacopytradingbot'><FaTwitter/></a>
                    <a href='https://www.linkedin.com/company/solanacopytradingbot/'><FaLinkedin/></a>
                    <a href='https://t.me/solanacopytradingbot'><FaTelegram/></a>
                </div>
            </div>
        </div>
    )
}

export default Footer;