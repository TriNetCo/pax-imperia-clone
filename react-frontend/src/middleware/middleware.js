import * as actions from '../modules/websocket';
// import { updateGame, } from '../modules/game';

const socketMiddleware = () => {
  let socket = null;

  const onOpen = store => (event) => {
    console.log('websocket open', event.target.url);
    store.dispatch(actions.wsConnected(event.target.url));
  };

  const onClose = (store, host) => (event) => {
    store.dispatch(actions.wsDisconnected(host));
  };

  const onMessage = store => (event) => {
    const payload = JSON.parse(event.data);
    console.log('receiving server message');

    switch (payload.type) {
      case 'update_game_players':
        // store.dispatch(actions.updateGame(payload.game, payload.current_player));
        break;
      default:
        break;
    }
  };

  // the middleware part of this function
  return store => next => action => {
    switch (action.type) {
      case 'WS_CONNECT':
        if (socket !== null) {
          socket.close();
        }

        // connect to the remote host
        socket = new WebSocket(action.host);

        // websocket handlers
        socket.onmessage = onMessage(store);
        socket.onclose = onClose(store, action.host);
        socket.onopen = onOpen(store);

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
      case 'NEW_MESSAGE':
        console.log('sending a message', action.msg);
        socket.send(JSON.stringify({ command: 'NEW_MESSAGE', message: action.msg }));
        break;
      default:
        console.log('the next action:', action);
        return next(action);
    }
  };
};

export default socketMiddleware();