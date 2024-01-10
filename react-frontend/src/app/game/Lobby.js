import {act, joinChatLobby, setChatLobbyId} from '../../modules/websocket';

export default class Lobby {

    chatLobbyId;

    createOrJoinLobby(chatLobbyId) {
        const userContext = this.userContext;
        const dispatch = this.dispatch;

        if (this.websocket.status !== 'WS_CONNECTED') {
            alert('Not connected to websocket.  Is the server running?  This is here for development, catch this error upstream plz.');
            return;
        }

        const {displayName, email, token} = this.getValidFields(userContext);

        dispatch(setChatLobbyId(chatLobbyId));
        dispatch(act('AUTHENTICATE')(email, displayName, token));
        dispatch(joinChatLobby(email, chatLobbyId));

        this.chatLobbyId = chatLobbyId;
    };

    getValidFields(userContext) {
        const displayName = userContext.displayName ? userContext.displayName : 'Anonymous';
        const email = userContext.email ? userContext.email : 'none@email.atall';
        const token = userContext.token ? userContext.token : 'anonymous';

        return { displayName, email, token };
    }

}
