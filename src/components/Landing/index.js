import React from 'react';
import './index.css';
import hand from '../../source/img/content/hand.png';
import coin from '../../source/img/content/coin-up.png';

import { Timeline, TimelineItem }  from 'vertical-timeline-component-for-react';

import { FaCheckCircle } from 'react-icons/fa';
import { MdOutlineSecurity } from "react-icons/md";
import { GiReceiveMoney } from "react-icons/gi";
import { IoIosTimer } from "react-icons/io";

import logo from '../../source/img/content/icon.png';

import pengiun from '../../source/img/content/coins/penguin.png';
import brett from '../../source/img/content/coins/brett.png';
import bonk from '../../source/img/content/coins/bonk.png';
import doge from '../../source/img/content/coins/doge.png';
import shiba from '../../source/img/content/coins/shiba.png';
import pepe from '../../source/img/content/coins/pepe.png';

import Slider from 'react-slick';
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const LandingComponent = () => {

    const settings = {
        dots: true,
        infinite: true,
        speed: 500,
        slidesToShow: 1,
        slidesToScroll: 1,
    };

    return (
        <div className='pt-match-header'>
            <div className='landing-container-main'>
                <div className='landing-container text-white'>
                    <div className='landing-content'>
                        <div>
                            <img src={coin} alt="logo" width={300} height={300} />
                        </div>
                    <div className='landing-content-text'>
                        <h1 className='text-4xl text-white font-bold'>Welcome to <span className='text-main font-weight-bold'>Copy Trading Bot</span></h1>
                        <h2 className='text-lg mt-5'>Join Future Of Algorithmic Crypto Trading Strategies</h2>
                        </div>
                        <div className='landing-content-image'>
                            <img src={hand} alt="hand"/>
                        </div>
                    </div>
                    <div className='banner-shape-wrapper'>
                        <div className='banner-shape-1'><img className='img-one' src={bonk} alt="pengiun"/></div>
                        <div className='banner-shape-2'><img className='img-two' src={brett} alt="brett"/></div>
                        <div className='banner-shape-3'><img className='img-three' src={pengiun} alt="bonk"/></div>
                        <div className='banner-shape-4'><img className='img-four' src={doge} alt="doge"/></div>
                        <div className='banner-shape-5'><img className='img-five' src={shiba} alt="shiba"/></div>
                        <div className='banner-shape-6'><img className='img-six' src={pepe} alt="pepe"/></div>
                    </div>
                    <div className='landing-content-button'>
                        <button className='btn btn-main' onClick={() => {
                            window.location.href = '/app';
                        }}>Get Started</button>
                    </div>
                </div>
            </div>
            <hr className='hr-main'/>
            <div className='container'>
                <div className='container-token d-flex justify-content-center align-items-center'>
                    <div className='landing-content-token'>
                        <img src={logo} className='img-fluid' alt="hand"/>
                    </div>
                    <div className='landing-content-token-text'>
                        <h5 className='text-4xl text-white font-weight-bold sub-title text-left'>Who we are</h5>
                        <h1 className=' text-white font-weight-bold text-lg mt-5'>The World’s 1st ICO Platform That Offers Rewards</h1>
                        <div className='description mt-5'>
                            <p className='text-grey-main'>The World’s 1st ICO Platform That Offers Rewards and The platform helps investors to make easy to purchase and sell their tokens</p>
                        </div>
                        <div className='btn-app btn-outline-start mt-5'>Purchase Tokens</div>
                    </div>
                </div>
                <div className='mt-5 choose-us'>
                    <h5 className='text-white font-weight-bold sub-title'>Why choose us</h5>
                    <h1 className='text-white font-weight-bold text-lg mt-3'>Why choose our copy <br /><span className='text-main'>Trading Bot</span></h1>
                    <div className='card-why-choose-us mt-5 d-flex justify-content-center align-items-center'>
                        <Slider 
                            dots={true}
                            infinite={true}
                            speed={1500}
                            className='w-75'
                            // rows={2}
                            direction="rtl"
                            autoplay={true}
                            slidesToShow={2}
                            slidesToScroll={1}
                        >
                            <div className='card-why-choose-us-item bg-easy-to-use d-flex flex-column justify-content-center align-items-center'>
                                <h2 className='text-white'>Easy To use</h2>
                                <div className='card-why-choose-us-item-icon'><FaCheckCircle className='text-white text-lg'/></div>
                                <p className='text-white'>You can easily use our bot to trade your crypto</p>
                            </div>
                            <div className='card-why-choose-us-item bg-success d-flex flex-column justify-content-center align-items-center'>
                                <h2 className='text-white'>Highly Secure and Reliable</h2>
                                <div className='card-why-choose-us-item-icon'><MdOutlineSecurity className='text-white text-lg'/></div>
                                <p className='text-white'>Our bot is highly secure and reliable, you can trust it to trade your crypto</p>
                            </div>
                            <div className='card-why-choose-us-item bg-danger d-flex flex-column justify-content-center align-items-center'>
                                <h2 className='text-white'>To get a lot of profit in short time</h2>
                                <div className='card-why-choose-us-item-icon'><GiReceiveMoney className='text-white text-lg'/></div>
                                <p className='text-white'>Our bot is designed to get a lot of profit in short time</p>
                            </div>
                            <div className='card-why-choose-us-item bg-realtime-trading d-flex flex-column justify-content-center align-items-center'>
                                <h2 className='text-white'>Realtime Trading</h2>
                                <div className='card-why-choose-us-item-icon'><IoIosTimer className='text-white text-lg'/></div>
                                <p className='text-white'>Our bot will follow target trader in realtime</p>
                            </div>
                        </Slider>
                    </div>
                </div>
            </div>
            <div className='road-map'>
                
                <div className='container'>
                    <h5 className='text-white font-weight-bold sub-title'>Road Map</h5>
                    <h1 className='text-white font-weight-bold text-lg mt-3'>Our <span className='text-main'>Copy Trading Bot</span> Roadmap</h1>
                    <Timeline lineColor={'#ddd'}>
                        <TimelineItem
                            key="001"
                            dateText="11/2010 – Present"
                            style={{ color: '#e86971' }}
                        >
                            <h3 className='text-danger font-weight-bold'>Title, Company</h3>
                            <h4 className='text-grey'>Subtitle</h4>
                            <p className='text-white'>
                            Est incididunt sint eu minim dolore mollit velit velit commodo ex nulla
                            exercitation. Veniam velit adipisicing anim excepteur nostrud magna
                            nostrud aliqua dolor. Sunt aute est duis ut nulla officia irure
                            reprehenderit laborum fugiat dolore in elit. Adipisicing do qui duis Lorem
                            est.
                            </p>
                            <p className='text-white'>
                            Est incididunt sint eu minim dolore mollit velit velit commodo ex nulla
                            exercitation. Veniam velit adipisicing anim excepteur nostrud magna
                            nostrud aliqua dolor. Sunt aute est duis ut nulla officia irure
                            reprehenderit laborum fugiat dolore in elit. Adipisicing do qui duis Lorem
                            est.
                            </p>
                            <p className='text-white'>
                            Est incididunt sint eu minim dolore mollit velit velit commodo ex nulla
                            exercitation. Veniam velit adipisicing anim excepteur nostrud magna
                            nostrud aliqua dolor. Sunt aute est duis ut nulla officia irure
                            reprehenderit laborum fugiat dolore in elit. Adipisicing do qui duis Lorem
                            est.
                            </p>
                        </TimelineItem>
                        <TimelineItem
                            key="002"
                            dateText="04/2009 – 11/2010"
                            dateInnerStyle={{ background: '#61b8ff', color: '#000' }}
                            bodyContainerStyle={{
                            background: '#ddd',
                            padding: '20px',
                            borderRadius: '8px',
                            boxShadow: '0.5rem 0.5rem 2rem 0 rgba(0, 0, 0, 0.2)',
                            }}
                        >
                            <h3 className='text-main font-weight-bold'>Title, Company</h3>
                            <h4 className='text-grey'>Subtitle</h4>
                            <p className='text-grey'>
                            Est incididunt sint eu minim dolore mollit velit velit commodo ex nulla
                            exercitation. Veniam velit adipisicing anim excepteur nostrud magna
                            nostrud aliqua dolor. Sunt aute est duis ut nulla officia irure
                            reprehenderit laborum fugiat dolore in elit. Adipisicing do qui duis Lorem
                            est.
                            </p>
                            <p className='text-grey'>
                            Est incididunt sint eu minim dolore mollit velit velit commodo ex nulla
                            exercitation. Veniam velit adipisicing anim excepteur nostrud magna
                            nostrud aliqua dolor. Sunt aute est duis ut nulla officia irure
                            reprehenderit laborum fugiat dolore in elit. Adipisicing do qui duis Lorem
                            est.
                            </p>
                        </TimelineItem>
                        <TimelineItem
                            key="003"
                            dateComponent={(
                            <div
                                style={{
                                display: 'block',
                                float: 'left',
                                padding: '10px',
                                background: 'rgb(150, 150, 150)',
                                color: '#fff',
                                }}
                            >
                                11/2008 – 04/2009
                            </div>
                            )}
                        >
                            <h3 className='text-grey font-weight-bold'>Title, Company</h3>
                            <h4 className='text-grey'>Subtitle</h4>
                            <p className='text-white'>
                            Est incididunt sint eu minim dolore mollit velit velit commodo ex nulla
                            exercitation. Veniam velit adipisicing anim excepteur nostrud magna
                            nostrud aliqua dolor. Sunt aute est duis ut nulla officia irure
                            reprehenderit laborum fugiat dolore in elit. Adipisicing do qui duis Lorem
                            est.
                            </p>
                            <p className='text-white'>
                            Est incididunt sint eu minim dolore mollit velit velit commodo ex nulla
                            exercitation. Veniam velit adipisicing anim excepteur nostrud magna
                            nostrud aliqua dolor. Sunt aute est duis ut nulla officia irure
                            reprehenderit laborum fugiat dolore in elit. Adipisicing do qui duis Lorem
                            est.
                            </p>
                            <p className='text-white'>
                            Est incididunt sint eu minim dolore mollit velit velit commodo ex nulla
                            exercitation. Veniam velit adipisicing anim excepteur nostrud magna
                            nostrud aliqua dolor. Sunt aute est duis ut nulla officia irure
                            reprehenderit laborum fugiat dolore in elit. Adipisicing do qui duis Lorem
                            est.
                            </p>
                        </TimelineItem>
                        <TimelineItem
                            key="004"
                            dateText="08/2008 – 11/2008"
                            dateInnerStyle={{ background: '#76bb7f' }}
                        >
                            <h3 className='text-success font-weight-bold'>Title, Company</h3>
                            <h4 className='text-grey'>Subtitle</h4>
                            <p className='text-white'>
                            Est incididunt sint eu minim dolore mollit velit velit commodo ex nulla
                            exercitation. Veniam velit adipisicing anim excepteur nostrud magna
                            nostrud aliqua dolor. Sunt aute est duis ut nulla officia irure
                            reprehenderit laborum fugiat dolore in elit. Adipisicing do qui duis Lorem
                            est.
                            </p>
                            <p className='text-white'>
                            Est incididunt sint eu minim dolore mollit velit velit commodo ex nulla
                            exercitation. Veniam velit adipisicing anim excepteur nostrud magna
                            nostrud aliqua dolor. Sunt aute est duis ut nulla officia irure
                            reprehenderit laborum fugiat dolore in elit. Adipisicing do qui duis Lorem
                            est.
                            </p>
                        </TimelineItem>
                    </Timeline>
                </div>
            </div>
            <div className='contact-us'>
                <div>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 154.79" class='bg'>
                        <g id="06bfc7e1-b704-4078-98ce-2308fc1c2fe9" data-name="Layer 2">
                            <g id="c0153062-95a7-412f-be95-4bccb94029e9" data-name="Layer 1">
                                <path class="stars-bg__star stars-bg__blink-1" d="M4.84,3.53A1.18,1.18,0,1,0,3.66,2.35,1.17,1.17,0,0,0,4.84,3.53"/>
                                <path class="stars-bg__star stars-bg__blink-2" d="M512.9,145.88a1.18,1.18,0,1,0-1.18-1.18,1.18,1.18,0,0,0,1.18,1.18"/>
                                <path class="stars-bg__star stars-bg__blink-3" d="M411,55.7a1.18,1.18,0,1,0,1.18,1.18A1.17,1.17,0,0,0,411,55.7"/>
                                <path class="stars-bg__star stars-bg__blink-2" d="M135.79,27.52A1.18,1.18,0,1,0,137,28.7a1.18,1.18,0,0,0-1.18-1.18"/>
                                <path class="stars-bg__star stars-bg__blink-1" d="M100.53,94.49a1.18,1.18,0,1,0,1.18,1.18,1.18,1.18,0,0,0-1.18-1.18"/>
                                <path class="stars-bg__star stars-bg__blink-1" d="M16.85,131.35A1.18,1.18,0,1,0,18,132.53a1.18,1.18,0,0,0-1.18-1.18"/>
                                <path class="stars-bg__star stars-bg__blink-3" d="M533.24,0a1.18,1.18,0,1,0,1.18,1.18A1.18,1.18,0,0,0,533.24,0"/>
                                <path class="stars-bg__star stars-bg__blink-1" d="M340.44,48.52a1.18,1.18,0,1,0-1.18,1.18,1.18,1.18,0,0,0,1.18-1.18"/>
                                <path class="stars-bg__star stars-bg__blink-2" d="M159.9,151.18a1.18,1.18,0,1,0-1.18-1.18,1.18,1.18,0,0,0,1.18,1.18"/>
                                <path class="stars-bg__star stars-bg__blink-3" d="M34.65,223.73a1.18,1.18,0,1,0-1.18-1.18,1.18,1.18,0,0,0,1.18,1.18"/>
                                <path class="stars-bg__star stars-bg__blink-3" d="M135.79,188.61a1.18,1.18,0,1,0,1.18,1.18,1.18,1.18,0,0,0-1.18-1.18"/>
                                <path class="stars-bg__star stars-bg__blink-1" d="M1.18,292.44a1.18,1.18,0,1,0,1.18,1.18,1.18,1.18,0,0,0-1.18-1.18"/>
                                <path class="stars-bg__star stars-bg__blink-2" d="M478.61,171a1.18,1.18,0,1,0-1.18-1.18,1.18,1.18,0,0,0,1.18,1.18"/>
                                <path class="stars-bg__star stars-bg__blink-1" d="M340.44,209.6a1.18,1.18,0,1,0-1.18,1.18,1.18,1.18,0,0,0,1.18-1.18"/>
                                <path class="stars-bg__star stars-bg__blink-3" d="M200.35,225.15a1.18,1.18,0,1,0,1.18,1.18,1.17,1.17,0,0,0-1.18-1.18"/>
                                <path class="stars-bg__star stars-bg__blink-1" d="M413.82,115.21a1.18,1.18,0,1,0-1.18-1.18,1.18,1.18,0,0,0,1.18,1.18"/>
                                <path class="stars-bg__star stars-bg__blink-2" d="M100.53,255.58a1.18,1.18,0,1,0,1.18,1.18,1.18,1.18,0,0,0-1.18-1.18"/>
                                <path class="stars-bg__star stars-bg__blink-3" d="M34.65,223.73a1.18,1.18,0,1,0-1.18-1.18,1.18,1.18,0,0,0,1.18,1.18"/> 
                            </g>
                        </g>
                    </svg>
                </div>
                <div className='container'>
                    <div className='mt-5 contact-form'>
                        <div>
                            <h5 className='text-white font-weight-bold sub-title'>Contact us</h5>
                            <h1 className='text-white font-weight-bold text-lg mt-3'>Get regular updates with our working</h1>
                            <div className='contact-us-form-wrapper mt-5'>
                                <div className='contact-us-form d-flex justify-content-between'>
                                    <input type="text" placeholder='Name' className='w-48 form-control-contact-us'/>
                                    <input type="text" placeholder='Email' className='w-48 form-control-contact-us'/>
                                </div>                    
                                <div className="contact-us-message mt-3">
                                    <textarea placeholder='Message' className='w-100 form-control-contact-us' rows={5}></textarea>
                                </div>
                                <div className="contact-us-button">
                                    <button className='btn btn-main'>Subscribe</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>    
        )
}

export default LandingComponent;