import * as THREE from 'three';
import { SpaceViewLoader } from './spaceViewLoader.js';
import { GameStateInterface } from '../../gameStateInterface/gameStateInterface.js';
import CacheMonster from '../../models/cacheMonster.js';
import { Galaxy } from '../../models/galaxy.js';
import { System } from './entities/system.js';
import TimeLord from '../../models/timeLord.js';

export class SpaceViewAnimator {

    /** @type {THREE.WebGLRenderer} */
    renderer;

    /**
     *
     * @param {*} config
     * @param {*} clientObjects
     * @param {System} system
     * @param {Galaxy} galaxy
     * @param {CacheMonster} cacheMonster
     * @param {GameStateInterface} gameStateInterface
     */
    constructor(config, clientObjects, system, galaxy, cacheMonster, gameStateInterface) {
        this.c = config;
        this.clientObjects = clientObjects;
        this.system = system;
        this.galaxy = galaxy;
        this.cacheMonster = cacheMonster;
        this.gameStateInterface = gameStateInterface;

        // unpack clientObjects
        this.scene = clientObjects.scene;
        this.selectionSprite = clientObjects.selectionSprite;
        this.renderer = clientObjects.renderer;
        this.camera = clientObjects.camera;
        this.cx = clientObjects.cx;
        this.mouse = clientObjects.mouse;
        this.clock = clientObjects.gameClock;

        this.cameraDistance = 50;

        THREE.Cache.enabled = true;  // for development,  please set this to false :)

        window.spaceViewAnimator = this;

    }

    stopDrawLoop() {
        this.isDrawLoopEnabled = undefined;

        if (this.requestId) {
            cancelAnimationFrame(this.requestId);
            this.requestId = undefined;
        }
    }

    startDrawLoop() {
        this.isDrawLoopEnabled = true;
        this.drawLoop();
    }

    //
    /**
     * Redraw everything 60 times a second.  If `this.isDrawLoopEnabled` is set
     * to false, this function will simply return, otherwise the function will
     * call `this.animate()` before recurisvely calling itself via
     * the browser's requestAnimationFrame API.
     */
    drawLoop() {
        if (!this.isDrawLoopEnabled) return;
        this.animate();
        this.requestId = requestAnimationFrame(() => {
            this.drawLoop();
        });
    }

    async animate() {
        // TODO: should camera reset every frame??
        // this.resetCamera()
        this.updateObjects()
        const startTime = Date.now()
        this.renderer.render(this.scene, this.camera);
        if (!this.firstRenderTime) {
            this.firstRenderTime = Date.now() - startTime
            console.log(this.firstRenderTime + " ms: theBlack (first render)")
        }
    }

    resetCamera(distance) {

        // cameraPivot.rotation.set(xRotation, yRotation, 0.0);
        this.cameraPivot.rotation.set(-0.6, 0.05, -3);

        this.cameraPivot.position.set(0, 0, distance);
        this.camera.lookAt(this.scene.position);

        // this.headLamp.position.set(0, 0, distance);
        // headLamp.lookAt(this.scene.position);

        this.camera.updateProjectionMatrix();
    }

    /**
     * Since reading and writing to the dom is really expensive, we try to do it only once per second when needed.
     * @param {number} elapsedTime
     */
    updateHtmlClock(elapsedTime) {
        if (Math.round(elapsedTime * 60) / 60 % 1 == 0) { // This check ensures we do something once every second
            document.getElementById("time").innerHTML = elapsedTime.toFixed(0);
        };
    }

    updateConsoleBody(elapsedTime) {
        if (Math.round(elapsedTime * 60) / 60 % 1 == 0 && // This check ensures we do something once every second
            this.gameStateInterface.spaceViewWidget.spaceViewDomManager) {
            const spaceViewDomManager = this.gameStateInterface.spaceViewWidget.spaceViewDomManager;
            if (spaceViewDomManager.selectionSprite.selectionTarget) {
                spaceViewDomManager.populateConsoleBody();
            }
        }
    }


    updateObjects() {
        // seconds since clock reset
        const deltaTime = this.clock.getDelta();
        // seconds since clock started (avoiding getElapsedTime() which resets clock)
        const elapsedTime = this.clock.elapsedTime;

        // these happen once per second
        this.updateHtmlClock(elapsedTime);
        this.updateConsoleBody(elapsedTime);

        const actions = [];
        const logs = [];

        // TODO: use elapsedTime instead of deltaTime
        this.selectionSprite.update(deltaTime);

        for (const star of this.system['stars']) {
            star.update(elapsedTime);
        }

        for (const planet of this.system['planets']) {
            const planetLogs = planet.update(elapsedTime);
            logs.push(...planetLogs);
        }

        for (const ship of this.system['ships']) {
            const shipActions = ship.update(elapsedTime, deltaTime, this.system, this.galaxy);
            actions.push(...shipActions);
        }

        for (const action of actions) {
            this.gameStateInterface.performAction(action);
        }

        this.gameStateInterface.addEventLogEntries(logs);
    }

    async populateScene() {
        const timeLord = new TimeLord();
        const scene = this.scene;
        const system = this.system;

        // Add Camera

        this.addCameraToScene();

        // Add Lights
        this.addLightsToScene();

        // this.headLamp.position.set(0, 0, distance);
        // headLamp.lookAt(this.scene.position);

        //this.camera.updateProjectionMatrix();


        // Load Models
        const spaceViewLoader = new SpaceViewLoader(
            this.cacheMonster,
            scene,
            system,
            this.renderer,
            this.camera
        );
        this.spaceViewLoader = spaceViewLoader;

        await spaceViewLoader.loadBackground();
        this.renderer.render(this.scene, this.camera);
        timeLord.endAndReset('background')

        await spaceViewLoader.load();
        this.renderer.compile(this.scene, this.camera);
        timeLord.endAndReset('compile')

        await this.animate();
        timeLord.end('first animation')
    }

    addCameraToScene() {
        const distance = 50;

        this.scene.add(this.camera);

        var cameraLight = new THREE.PointLight(new THREE.Color(), 0, 10000);
        this.scene.add(cameraLight);
        this.camera.add(cameraLight);

        this.cameraPivot = new THREE.Group();
        this.camera.position.set(0, 0, distance);
        this.camera.lookAt(this.scene.position);
        this.cameraPivot.add(this.camera);
        this.scene.add(this.cameraPivot);

        // this.resetCamera();
        this.cameraPivot.rotation.set(-0.6, 0.05, -3);

        this.cameraPivot.position.set(0, 0, distance);
        this.camera.lookAt(this.scene.position);
    }

    addLightsToScene() {
        var sunLight = new THREE.PointLight(new THREE.Color(), .7, 1000);
        this.scene.add(sunLight);

        var ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
        this.scene.add(ambientLight);

        var keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
        keyLight.position.set(35, 38, 15);
        this.scene.add(keyLight);

        this.headLamp = new THREE.DirectionalLight(0xffffff, 0);
        this.headLamp.position.set(0, 0, this.cameraDistance);
        this.scene.add(this.headLamp);

        var cameraLight = new THREE.PointLight(new THREE.Color(), 0, 10000);
        this.scene.add(cameraLight);
        this.camera.add(cameraLight);
    }

    async redrawWormholeText(wormhole) {
        // remove old wormhole text from scene
        const oldTextSprite = wormhole.textSprite;
        this.scene.remove(oldTextSprite);

        // redraw wormhole text in scene
        const newTextSprite = await this.spaceViewLoader.addWormholeText(wormhole);
        this.scene.add(newTextSprite);
    }

    async addOutline(entity) {
        // redraw wormhole text in scene
        console.log('addOutline');
        const outline = await this.spaceViewLoader.loadOutline(entity);
        this.scene.add(outline);
    }

}