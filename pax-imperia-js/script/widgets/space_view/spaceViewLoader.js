import * as THREE from 'three';
import CacheMonster from '../../models/cacheMonster.js';
import Entity from './entities/entity.js';
import TimeLord from '../../models/timeLord.js';

export class SpaceViewLoader {

    /**
     * This class reads the system data and then loads in the required
     * meshes, textures, etc. into the scene.
     *
     * @param {CacheMonster} cacheMonster
     * @param {*} scene
     * @param {*} system
     * @param {*} renderer
     * @param {*} camera
     */
    constructor(cacheMonster, scene, system, renderer, camera) {
        this.scene = scene;
        this.system = system;
        this.cacheMonster = cacheMonster;
        this.renderer = renderer;
        this.camera = camera;
    }

    async load() {
        const startTime = Date.now()
        const promises = [];

        for (const star of this.system['stars']) {
            promises.push(this.loadStarStuff(star));
        }

        for (const planet of this.system['planets']) {
            promises.push(this.loadPlanetStuff(planet));
        }

        for (const wormhole of this.system['wormholes']) {
            promises.push(this.loadWormholeStuff(wormhole));
        }

        for (const ship of this.system['ships']) {
            promises.push(this.loadShipStuff(ship));
        }

        // Block here until all the parallel async functions are finished
        const object3ds = await Promise.all(promises.flat(Infinity));
        // add to scene after flattening and filtering out nulls
        this.scene.add(...object3ds.flat(Infinity).filter(x => x));

        // TODO: refactor to use OO
        const deltaTime = Date.now() - startTime;
        console.log(deltaTime + " ms: SpaceViewLoader entity loading");
    }

    async loadStarStuff(entity) {
        const groupObj = entity.object3d || new THREE.Group();
        if (groupObj.children.length > 0) { return groupObj; }

        const starObj = await this.loadStarSurface(entity);
        const coronaObjs = await this.loadStarCoronas(entity);
        groupObj.add(starObj, ...coronaObjs);
        entity.setLoadAttributes(groupObj);
        entity.linkObject3d(groupObj);
        return groupObj;
    }

    /**
     *
     * @param {Entity} entity
     * @returns {Promise<THREE.Object3D>}
     */
    async loadStarSurface(entity) {
        const assetPaths = {
            'mesh': '/assets/orbitals/meshes/planetbasemodel.glb',
            'texture': '/assets/orbitals/textures/sun/yellow/YellowSun0001.png'
        }
        const starObj = await this.cacheMonster.retrieveObject3d(
            'YellowSun0001',
            async () => {
                const starMesh = await this.cacheMonster.retrieveAsset(assetPaths.mesh);
                this.replaceMaterialWithBrightener(starMesh);
                await this.applyTextureToSurface(starMesh, assetPaths.texture);
                return starMesh;
            }
        )
        starObj.name = 'star';
        entity.object3ds.star = starObj;
        return starObj;
    }

    /**
     * @param {Entity} entity
     * @returns {Promise<THREE.Object3D[]>}
     */
    async loadStarCoronas(entity) {
        const coronaObj = await this.cacheMonster.retrieveObject3d(
            'corona',
            async () => {
                const coronaPath = '/assets/orbitals/textures/sun/corona/corona.png';
                return await this.loadBillboard(coronaPath);
            }
        );
        const coronaScale = 2.4;
        coronaObj.scale.set(coronaScale, coronaScale, coronaScale);
        coronaObj.name = 'corona';

        // create 3 coronas
        const coronaObjs = [coronaObj, coronaObj.clone(), coronaObj.clone()];
        coronaObjs.forEach(corona => { corona.notClickable = true; })
        entity.object3ds.corona1 = coronaObjs[0];
        entity.object3ds.corona2 = coronaObjs[1];
        entity.object3ds.corona3 = coronaObjs[2];
        return coronaObjs;
    }


    async loadPlanetStuff(entity) {
        const groupObj = entity.object3d || new THREE.Group();
        if (groupObj.children.length > 0) { return groupObj; }

        const planetObj = await this.loadPlanetSurface(entity);
        const cloudObj = await this.loadPlanetCloud(entity);
        groupObj.add(planetObj, cloudObj);
        if (entity.colony) {
            const outlineObj = await this.loadOutline(entity);
            groupObj.add(outlineObj);
        }
        entity.setLoadAttributes(groupObj);
        entity.linkObject3d(groupObj);
        return groupObj;
    }

    /**
     * @param {Entity} entity
     * @returns {Promise<THREE.Object3D>}
     */
    async loadPlanetSurface(entity) {
        const planetAssetPaths = {
            'mesh': '/assets/orbitals/meshes/planetbasemodel.glb',
            'texture': '/assets/orbitals/textures/earthlike/' + entity.atmosphere + '.png'
        }

        const planetObj = await this.cacheMonster.retrieveObject3d(
            entity.atmosphere,
            async () => {
                const obj = await this.cacheMonster.retrieveAsset(planetAssetPaths.mesh);
                this.addMeshStandardMaterial(obj)
                await this.applyTextureToSurface(obj, planetAssetPaths.texture);
                return obj;
            }
        );

        planetObj.name = 'planet';
        entity.object3ds.planet = planetObj;
        return planetObj;
    }

    /**
     * @param {Entity} entity
     * @returns {Promise<THREE.Object3D>}
     */
    async loadPlanetCloud(entity) {
        const cloudAssetPaths = {
            'mesh': '/assets/orbitals/meshes/cloudlayer.glb',
            'texture': '/assets/orbitals/textures/clouds/' + entity.cloud_type + '.png'
        }

        const cloudObj = await this.cacheMonster.retrieveObject3d(
            entity.cloud_type,
            async () => {
                const obj = await this.cacheMonster.retrieveAsset(cloudAssetPaths.mesh);
                this.addMeshStandardMaterial(obj)
                await this.applyTextureToCloud(obj, cloudAssetPaths.texture);
                return obj;
            }
        );

        cloudObj.name = 'cloud';
        cloudObj.isClouds = true;
        cloudObj.notClickable = true;
        entity.object3ds.cloud = cloudObj;
        return cloudObj;
    }

    /**
     * @param {Entity} entity
     * @returns {Promise<THREE.Object3D[]>}
     */
    async loadOutline(entity) {
        // enemies are red
        let colorName = 'red';
        let color = 0xff0000;
        if (entity?.playerId == 1 || entity?.colony?.playerId == 1) {
            // you are teal (default color of the circle)
            color = null;
            colorName = 'teal';
        }

        const circlePath = '/assets/planets/teal_circle.png';
        const outlineObj = await this.cacheMonster.retrieveObject3d(
            colorName + 'Circle',
            async () => {
                return await this.loadBillboard(circlePath, color);
            }
        );

        const scale = 2.8;
        outlineObj.scale.set(scale, scale, scale);
        outlineObj.notClickable = true;
        outlineObj.name = 'outline';
        entity.object3ds.outline = outlineObj;
        return outlineObj;
    }

    async loadWormholeStuff(entity) {
        const groupObj = entity.object3d || new THREE.Group();
        if (groupObj.children.length > 0) { return groupObj; }

        const wormholeObj = await this.loadWormhole(entity);
        const textObj = await this.addWormholeText(entity);
        groupObj.add(textObj);
        groupObj.add(wormholeObj);
        entity.setLoadAttributes(groupObj);
        entity.linkObject3d(groupObj);
        return groupObj;
    }

    async loadWormhole(entity) {
        const wormholeObj = await this.cacheMonster.retrieveObject3d(
            'wormhole',
            async () => {
                return await this.loadBillboard('/assets/wormholes/wormhole.png');
            }
        );
        wormholeObj.scale.set(
            entity.wormholeSize,
            entity.wormholeSize,
            entity.wormholeSize
        );
        wormholeObj.name = 'wormhole';
        entity.object3ds.wormhole = wormholeObj;
        return wormholeObj;
    }

    async addWormholeText(entity) {
        let text = entity.name || 'Sector' + entity.id;
        let opts = { fontface: 'Tahoma', fontsize: 28 };
        let sprite = this.makeTextSprite(text, opts);
        sprite.name = 'wormholeText'; // rename to 'text'
        sprite.notClickable = true;
        // offset below (y) wormhole graphic
        sprite.position.set(0, -1.1, 0);
        return sprite;
    }

    async loadShipStuff(entity) {
        const groupObj = entity.object3d || new THREE.Group();
        if (groupObj.children.length > 0) { return groupObj; }

        const shipObj = await this.loadShip(entity);
        const outlineObj = await this.loadOutline(entity);
        groupObj.add(shipObj, outlineObj);
        entity.setLoadAttributes(groupObj);
        entity.linkObject3d(groupObj);
        return groupObj;
    }

    async loadShip(entity) {
        const cacheName = entity.make + entity.model;
        const shipObj = await this.cacheMonster.retrieveObject3d(cacheName, async () => {
            const shipMesh = await this.cacheMonster.retrieveAsset(entity.assetPath);
            this.addMeshStandardMaterial(shipMesh)
            await this.loadAndApplyTexturesToShip(shipMesh, entity);
            return shipMesh;
        });
        // resize the ship instead of the entire three group, since ship models
        // are very large compared to everything else and mess up the camera scaling
        shipObj.scale.set(entity.shipSize, entity.shipSize, entity.shipSize);
        shipObj.name = 'ship';
        entity.object3ds.ship = shipObj;
        return shipObj;
    }

    /**
     * Loads the meshes and textures (via the callback) for the clickable
     * element of the entity (usually the surface mesh of the object).
     *
     * @param {*} entity - This is the entity to which we're loading a clickable mesh
     * @param {*} cb     - This callback is called after the loading of the initial
     *                   mesh so texturing and other operations dedatpendant may be
     *                   performed.
     * @returns
     */
    async loadClickableObject3d(entity, cb) {
        const shipMesh = await this.cacheMonster.retrieveAsset(entity.assetPath);

        entity.setLoadAttributes(shipMesh);
        entity.linkObject3d(shipMesh);

        if (cb) {
            await cb(shipMesh);
        }

        return shipMesh;
    }

    async loadBackground() {
        const path = '/assets/backgrounds/space_view_background_tmp.png'
        const texture = await this.cacheMonster.retrieveAsset(path);
        this.scene.background = texture;
    }

    // This makes it so the star doesn't have a shadow and is always lit
    replaceMaterialWithBrightener(object3d) {
        const firstChild = object3d.children[0];
        const texture = firstChild.material.map;
        firstChild.material = new THREE.MeshBasicMaterial();
        firstChild.material.map = texture;
        firstChild.material.needsUpdate = true;
    }

    addMeshStandardMaterial(object3d) {
        const material = new THREE.MeshStandardMaterial();
        material.roughness = 0.9;
        material.metalness = 0.1;
        material.color = new THREE.Color(0x9999cc);
        material.needsUpdate = true;
        object3d.children[0].material = material;
    }

    async loadBillboard(assetPath, color = null) {
        const texture = await this.cacheMonster.retrieveAsset(assetPath);
        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            color: color,
        });
        return new THREE.Sprite(spriteMaterial);
    }

    /**
     *
     * @param {THREE.Object3D} object3d
     * @param {string} texturePath
     * @param {boolean} transparent
     * @param {number} roughness
     */
    async applyTextureToSurface(object3d, texturePath) {
        const texture = await this.cacheMonster.retrieveAsset(texturePath);
        texture.flipY = false; // fixes Blender export bug
        // texture.generateMipmaps = false;

        object3d.traverse(function (child) {
            if (child.isMesh) {
                /** @type {THREE.MeshBasicMaterial} */
                const material = child.material;
                material.map = texture;
                material.roughness = 0.9;
                material.needsUpdate = true;
            }
        });
    }

    async applyTextureToCloud(object3d, texturePath) {
        const texture = await this.cacheMonster.retrieveAsset(texturePath);
        texture.flipY = false; // fixes Blender export bug
        // texture.generateMipmaps = false;

        object3d.traverse(function (child) {
            if (child.isMesh) {
                /** @type {THREE.MeshBasicMaterial} */
                const material = child.material;
                material.alphaMap = texture;
                material.alphaTest = 0.1;
                material.transparent = true;
                material.roughness = 0.9;
                material.needsUpdate = true;
            }
        });
    }

    async loadAndApplyTexturesToShip(object3d, entity) {
        const texture = this.cacheMonster.retrieveAsset(entity.texturePath);
        const normalMap = this.cacheMonster.retrieveAsset(entity.normalMapPath);
        const metallicSmoothnessMap = this.cacheMonster.retrieveAsset(entity.metallicSmoothnessMapPath);
        // const emissiveMap = this.cacheMonster.retrieveAsset(entity.emissionMapPath);
        const emissiveMap = Promise.resolve();

        await Promise.all([texture, normalMap, metallicSmoothnessMap, emissiveMap])
            .then(([texture, normalMap, metallicSmoothnessMap, emissiveMap]) => {
                texture.flipY = false; // fixes Blender export bug

                const material = new THREE.MeshStandardMaterial();
                material.metalnessMap = texture;
                material.map = texture;
                material.normalMap = normalMap;
                // material.emissiveMap = emissiveMap;
                material.metallicSmoothnessMap = metallicSmoothnessMap;
                material.needsUpdate = true;

                object3d.children[0].material = material;
            });
    }

    async addAndCompile(obj) {
        if (this.scene && this.renderer) {
            await this.scene.add(obj);
            await this.renderer.compile(this.scene, this.camera);
        }
    }

    makeTextSprite(text, opts) {
        var parameters = opts || {};
        var fontface = parameters.fontface || 'Tahoma';
        var fontsize = parameters.fontsize || 20;
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');
        context.font = fontsize + "px " + fontface;

        // get size data (height depends only on font size)
        var metrics = context.measureText(text);
        var textWidth = metrics.width;

        // text color
        context.fillStyle = 'rgba(255, 255, 255, 1.0)';
        context.fillText(text, 0, fontsize);

        // canvas contents will be used for a texture
        var texture = new THREE.Texture(canvas)
        texture.minFilter = THREE.LinearFilter;
        texture.needsUpdate = true;

        var spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        var sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(10, 5, 1.0);
        sprite.center.set(textWidth / canvas.width / 2, 1);
        return sprite;
    }

    /**
     *
     * @param {string} msg       - This message gets printed to the screen
     * @param {number} startTime - Begin timing performance by creating a
     *                             Date.now() timestamp before executing the
     *                             code you would like timed.
     */
    reportPerformance(msg, startTime) {
        const deltaTime = (Date.now() - startTime);
        console.log(msg + ' loaded in ' + deltaTime + ' ms');
    }

}
