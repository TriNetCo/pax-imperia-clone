import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { SpaceViewLoader } from './spaceViewLoader.js';

export class SpaceViewAnimator {

    constructor(config, clientObjects, system) {
        this.c = config;
        this.clientObjects = clientObjects;
        this.system = system;
        this.galaxy = galaxy;

        this.scene = clientObjects.scene;
        this.selectionSprite = clientObjects.selectionSprite;
        this.renderer = clientObjects.renderer;
        this.camera = clientObjects.camera;
        this.cx = clientObjects.cx;
        this.mouse = clientObjects.mouse;
        this.clock = clientObjects.gameClock;
        THREE.Cache.enabled = true  // for development,  please set this to false :)
    }

    drawLoop() {
        // Redraw everything 60 times a second
        // this.drawBackground();
        this.animate();
    }

    drawBackground() {
        // disabled
        let cx = this.cx;
        cx.fillStyle = "Black";
        cx.fillRect(0, 0, cx.canvas.width, cx.canvas.height);
    }

    async animate() {
        this.resetCamera()
        this.updateObjects()
        this.renderer.render(this.scene, this.camera);
    }

    resetCamera() {
        // Reset camera in real time
        //////////////////////////////

        let distance = parseFloat(this.clientObjects.distanceSlider.value);

        // cameraPivot.rotation.set(xRotation, yRotation, 0.0);
        this.cameraPivot.rotation.set(-0.6, 0.05, -3);

        this.cameraPivot.position.set(0, 0, distance);
        this.camera.lookAt(this.scene.position);

        this.headLamp.position.set(0, 0, distance);
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

    updateObjects() {
        // seconds since clock reset
        let deltaTime = this.clock.getDelta();
        // seconds since clock started (avoiding getElapsedTime() which resets clock)
        let elapsedTime = this.clock.elapsedTime;

        this.updateHtmlClock(elapsedTime);

        // TODO: use elapsedTime instead of deltaTime
        this.selectionSprite.update(deltaTime);

        for (const star of this.system['stars']) {
            star.update(elapsedTime);
        }

        for (const planet of this.system['planets']) {
            planet.update(elapsedTime);
        }

        for (const ship of this.system['ships']) {
            ship.update(elapsedTime, deltaTime, this.system, this.galaxy);
        }

    }

    async populateScene() {
        const scene = this.scene;
        const system = this.system;

        // Add Lights

        var sunLight = new THREE.PointLight(new THREE.Color(), .7, 1000);
        scene.add(sunLight);

        var ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
        scene.add(ambientLight);

        var keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
        keyLight.position.set(35, 38, 15);
        scene.add(keyLight);

        this.headLamp = new THREE.DirectionalLight(0xffffff, 0);
        this.headLamp.position.set(22, 22, 25);
        scene.add(this.headLamp);

        // Add Camera

        let camera = this.camera;
        scene.add(camera);

        var cameraLight = new THREE.PointLight(new THREE.Color(), 0, 10000);
        scene.add(cameraLight);
        camera.add(cameraLight);

        this.cameraPivot = new THREE.Group();
        camera.position.set(0, 0, 50);
        camera.lookAt(scene.position);
        this.cameraPivot.add(camera);
        scene.add(this.cameraPivot);

        // Load Models

        await this.loadBackground(scene);

        // await this.loadParallelModels(scene);

        const spaceViewLoader = new SpaceViewLoader(scene, system);
        await spaceViewLoader.load();

        // spaceViewLoader.loadStars();
        // spaceViewLoader.loadPlanets();
        // spaceViewLoader.loadWormholes();
        // spaceViewLoader.loadShips();

    }

    async loadBackground(scene) {
        let basePath = '';
        if (typeof (window) !== 'undefined' && window.location.hash.includes("#")) {
            basePath = "/pax-imperia-clone";
        }
        const backgroundPath = basePath + "/assets/backgrounds/space_view_background_tmp.png"
        const loader = new THREE.TextureLoader();
        new Promise(function (resolve, reject) {
            loader.load(backgroundPath, function (input) {
                scene.background = input;
            }, function (xhr) {
            }, function (error) {
                console.error(error);
            });
        });
    }

}