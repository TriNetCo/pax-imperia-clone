import {Actor} from './actor.js';
export class PlayerActor extends Actor {

    constructor(gameStateInterface) {
        super(gameStateInterface);
    }

    handle(action) {
        switch(action.verb) {
            case "defeat":
                // TODO: handle removing this player from the game
                break;
            case "trade":
                // TODO: handle 1 player trading with another
                break;
        }
    }

}
