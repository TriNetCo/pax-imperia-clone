import * as actions from './websocket';
import {actionTable, extractActionKey, act} from './websocket';

////////////////
// MIDDLEWARE //
////////////////

const socketMiddleware = (websocketFactory) => {
    let socket = null;

    const onOpen = (store, authData) => (event) => {
        store.dispatch(actions.wsConnected(event.target.url));

        if (authData) {
            store.dispatch(act('AUTHENTICATE')(authData.email, authData.displayName, authData.token));
        }
    };

    // If we ever close our connection, in production, this represents
    // a connection problem so we should attempt a reconnection.
    // For development we don't always start the backend service, so
    // no such reconnect code is defined yet
    const onClose = (store, host) => (event) => {
        store.dispatch(actions.wsDisconnected(host));
    };

    const onMessage = store => (event) => {
        const message = JSON.parse(event.data);
        console.debug('receiving server message ' + message.type);

        const middlewareRecieve = actionTable[extractActionKey(message.type)]?.middlewareRecieve;

        if (middlewareRecieve) {
            middlewareRecieve(store, message);
            return;
        }
    };

    // the 'middleware' part of this function
    return store => next => action => {

        const hasActionToSend = actionTable[action.type]?.action;

        if (hasActionToSend) {
            console.debug('Middleware Sending: ', action.type);

            // check if the action is a largePayload message, if so, send it as a string
            if (action.largePayload) {
                socket.send(action.largePayload);
            } else {
                socket.send(JSON.stringify(action));
            }

            const hasActionToReduce = actionTable[action.type]?.actionReducer;
            if (!hasActionToReduce) {
                return;
            }
        }

        switch (action.type) {
            case 'WS_CONNECT':
                if (socket !== null) {
                    socket.close();
                }

                socket           = websocketFactory(action.host);
                socket.onmessage = onMessage(store);
                socket.onclose   = onClose(store, action.host);
                socket.onopen    = onOpen(store, action.authData);

                // this interupts the dispatch event for WS_CONNECT completly, so it never hits a reducer...
                // But the onopen callback should be fired, where the store will be set to update
                break;
            case 'WS_DISCONNECT':
                if (socket !== null) {
                    socket.close();
                }
                socket = null;
                console.log('websocket closed');
                break;
            default:
                console.debug('the next action:', action);
                return next(action);
        }
    };
};

export default socketMiddleware;
