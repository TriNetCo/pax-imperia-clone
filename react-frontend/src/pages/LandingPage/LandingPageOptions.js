import React, { useContext } from 'react';
import {Link, useHistory} from 'react-router-dom';
import UserContext from '../../app/UserContext';
import { spoofSignIn } from '../DebugPage/webToolHelpers';
import { Button } from '@mui/material';
import './LandingPageOptions.css';
import { GameDataContext } from 'src/app/GameDataContextProvider';

const LandingPageOptions = () => {
    const userContext = useContext(UserContext);
    const {gameData: data} = useContext(GameDataContext);
    const history = useHistory();

    const handleLoginAsGuest = () => {
        spoofSignIn();
        userContext.fillUserInfoFromLocalStorage();
    };

    const handleLogout = () => {
        userContext.logout();
    };

    const quickplayClicked = () => {
        data.initNewGame();
        data.gameStateInterface.startClock();
        history.push('/systems');
    };


    if (userContext.loginStatus == 'logged_in')
        return (
            <div>
                <ul className='landing-page-options'>
                    <li><Link onClick={quickplayClicked} to="/systems">Quick Play (Singleplayer)</Link></li>
                    {/* <li><span to="/new_game">Multiplayer</span></li> */}
                    <li><Link to="/new_game">New Game</Link></li>
                    <li><Link to="/about">About</Link></li>
                    <li><Link to="/debug">(Dev) Debug</Link></li>
                    <li><Link to="/preferences">(Dev) Preferences</Link></li>
                    <li>
                        <Button onClick={handleLogout}>
                            Logout
                        </Button>
                    </li>
                </ul>
            </div>
        );

    return (
        <div>
            <ul>
                <li><Link to="/login">Login</Link></li>
                <li><Button onClick={handleLoginAsGuest}>(Dev) Login as Guest</Button></li>
                <li><Link to="/debug">(Dev) Debug Page</Link></li>
            </ul>
        </div>
    );
};

export default LandingPageOptions;
