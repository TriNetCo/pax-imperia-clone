import {getRandomNum} from './helpers.js'

export class System {
    constructor(id, point, name, radius, c) {
        this.id = id;
        this.name = name;
        this.x = point.x;
        this.y = point.y;
        this.radius = radius;
        this.stars = [this.generateStar(c)]
        this.planets = this.generatePlanets(c)
        this.ships = []
        this.entities = this.stars.concat(this.planets).concat(this.ships)
    }

    generateStar(c){
        let star = {
            "index": 0,
            "atmosphere": "sun",
            "size": getRandomNum(c.minStarSize, c.maxStarSize, 2),
            "distance_from_star": 0,
            "spin_speed": 1,
            "starting_position": 0,
        };
        return star
    }

    generatePlanets(c){
        let planets = []
        let planetCount = getRandomNum(c.minPlanetCount, c.maxPlanetCount, 0)

        for (let i = 0; i < planetCount; i++) {
            let planet = {
                "index": i,
                "atmosphere": "oxygen",
                "size": getRandomNum(c.minPlanetSize, c.maxPlanetSize, 2),
                "distance_from_star": i,
                "spin_speed": 1,
                "starting_position": getRandomNum(0, Math.PI, 2),
            };
            planets.push(planet);
        };
        return planets
    }

}
