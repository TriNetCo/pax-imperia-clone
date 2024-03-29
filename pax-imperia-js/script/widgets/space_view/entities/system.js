import { Star } from './star.js';
import { Planet } from './planet.js';
import { Ship } from './ship.js';
import { Wormhole } from './wormhole.js';
import { Colony } from './colony.js';

export class System {

    /** @type {Star[]} */
    stars;
    /** @type {Planet[]} */
    planets;
    /** @type {Wormhole[]} */
    wormholes;
    /** @type {Ship[]} */
    ships;
    /** @type {Colony[]} */
    colonies;

    /**
     *
     * @param {Object} systemData
     * @param {string} systemData.name
     * @param {number} systemData.id
     * @param {number} systemData.radius
     *
     * @param {Object} systemData.position
     * @param {number} systemData.position.x
     * @param {number} systemData.position.y
     * @param {number} systemData.position.z
     */
    constructor(systemData) {
        this.name = systemData.name;
        this.id = systemData.id;
        this.position = systemData.position;
        this.radius = systemData.radius;

        // Entities
        this.stars = [];
        this.planets = [];
        this.ships = [];
        this.colonies = [];
        this.wormholes = [];
    }

    toJSON() {
        const systemJson = {
            id: this.id,
            name: this.name,
            position: this.position,
            radius: this.radius,
            wormholes: this.wormholes,
            stars: this.stars,
            planets: this.planets,
            colonies: this.colonies,
            ships: this.ships
        };
        return systemJson;
    }

    getEntity(type, id) {
        let entity = null;
        switch (type) {
            case 'star':
                entity = this.stars.find(x => x.id.toString() === id.toString());
                break;
            case 'planet':
                entity = this.planets.find(x => x.id.toString() === id.toString());
                break;
            case 'ship':
                entity = this.ships.find(x => x.id.toString() === id.toString());
                break;
            case 'wormhole':
                entity = this.wormholes.find(x => x.id.toString() === id.toString());
                break;
            default:
                throw new Error(`Invalid entity type: ${type}`);
        }
        return entity;
    }

    getWormholeTo(toId) {
        return this.wormholes.find(x => x.toId.toString() === toId.toString());
    }

    removeEntity(type, id) {
        switch (type) {
            case 'star':
                this.stars = this.stars.filter(x => x.id.toString() !== id.toString());
                break;
            case 'planet':
                this.planets = this.planets.filter(x => x.id.toString() !== id.toString());
                break;
            case 'ship':
                this.ships = this.ships.filter(x => x.id.toString() !== id.toString());
                break;
            case 'wormhole':
                this.wormholes = this.wormholes.filter(x => x.id.toString() !== id.toString());
                break;
            default:
                throw new Error(`Invalid entity type: ${type}`);
        }

    }

    addEntity(entity) {
        switch (entity.type) {
            case 'star':
                this.stars.push(entity);
                break;
            case 'planet':
                this.planets.push(entity);
                break;
            case 'ship':
                this.ships.push(entity);
                break;
            case 'wormhole':
                this.wormholes.push(entity);
                break;
            default:
                throw new Error(`Invalid entity type: ${entity.type}`);
        }
    }

}
