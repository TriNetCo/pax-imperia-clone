import * as THREE from 'three';
import { SpaceViewAnimator } from './spaceViewAnimator.js';
import { SpaceViewDomManager } from './spaceViewDomManager.js';
import { SpaceViewInputHandler } from './spaceViewInputHandler.js';
import { SelectionSprite } from '../../models/selectionSprite.js'
import { System } from './entities/system.js';
import { getBasePath } from '../../models/helpers.js';
import CacheMonster from '../../models/cacheMonster.js';

/**
 * Encapsulates all of the logic related to rendering the SpaceView canvas
 * elements and supporting HTML.
 *
 * @constructor
 * @param {object} config             - The configurations defined in gameSettings.js.
 * @param {object} clientObjects      - clientObjects, or rather dom elements that are used by
 *                                      the widget to render the game or controls.
 * @param {object} gameStateInterface - The gameStateInterface exposes system data and
 *                                      the gameClock data to the widget.
 */
export class SpaceViewWidget {

    /** @type {SpaceViewAnimator} */
    spaceViewAnimator;
    /** @type {SpaceViewDomManager} */
    spaceViewDomManager;
    /** @type {SpaceViewInputHandler} */
    spaceViewInputHandler;
    /** @type {System} */
    system;
    /** @type {THREE.WebGLRenderer} */
    renderer;
    /** @type {CacheMonster} */
    cacheMonster;

    constructor(config, clientObjects, gameStateInterface, renderer) {
        this.c = config;
        this.clientObjects = clientObjects;
        this.gameStateInterface = gameStateInterface;
        this.galaxy = gameStateInterface.galaxy;
        gameStateInterface.spaceViewWidget = this;

        this.basePath = getBasePath();
        this.clientObjects.mouse = new THREE.Vector2(0, 0);
        this.clientObjects.gameClock = gameStateInterface.gameClock;

        // TODO: Float these up possibly
        this.renderer = renderer ? renderer : new THREE.WebGLRenderer({ antialias: true });
        this.cacheMonster = new CacheMonster();

        this.resetThreeObjects = () => {
            this.c.canvasWidth  = document.body.clientWidth;
            this.c.canvasHeight = document.body.clientHeight;

            this.setupSelectionSprite();

            this.setupRenderer();

            this.clientObjects.scene = new THREE.Scene();
            this.clientObjects.camera = new THREE.PerspectiveCamera(15, this.c.canvasWidth / this.c.canvasHeight, 1, 40000);
            this.renderer.compile(this.clientObjects.scene, this.clientObjects.camera);
            this.clientObjects.selectionSprite.loadGraphics(this.clientObjects.scene);

            if (this.spaceViewAnimator) {
                this.clientObjects.camera = this.spaceViewAnimator.resetCamera();
            }

            return this.clientObjects.camera;
        }

    }

    loadWidget(systemIndex, systemClickHandler) {
        console.log("LOADWIDGET");
        this.systemClickHandler = systemClickHandler;
        this.system = this.galaxy.getSystem(systemIndex);

        this.setupSelectionSprite();
        this.resetThreeObjects();

        return this.buildSystemClasses();
    }

    setupSelectionSprite() {
        this.clientObjects.selectionSprite = new SelectionSprite(
            this.system,
            this.basePath + '/assets/sprite_sheets/selection_sprite_sheet.png',
            1,  // nCols in sprite sheet
            10, // nRows in sprite sheet
            0.04); // loopFrameDuration
    }


    changeSystem(systemIndex) {
        const newSystem = this.galaxy.getSystem(systemIndex);
        console.log(">>> CHANGING SYSTEM <<<",
            this.system.id, this.system.name,
            "to", systemIndex, newSystem.name);
        this.spaceViewDomManager.detachFromDom();
        this.spaceViewAnimator.stopDrawLoop();
        this.system = newSystem;

        this.setupSelectionSprite();
        this.resetThreeObjects();

        return this.buildSystemClasses()
    }

    async buildSystemClasses() {

        this.spaceViewInputHandler = new SpaceViewInputHandler(
            this.system
        );

        // create new instances of the 3 classes
        this.spaceViewDomManager = new SpaceViewDomManager(
            this.c,
            this.clientObjects,
            this.system,
            this.systemClickHandler,
            this.gameStateInterface,
            this.spaceViewInputHandler,
        );

        this.spaceViewAnimator = new SpaceViewAnimator(
            this.c,
            this.clientObjects,
            this.system,
            this.galaxy,
            this.cacheMonster,
            this.gameStateInterface,
        );

        // link classes together
        this.spaceViewAnimator.spaceViewDomManager = this.spaceViewDomManager;
        this.spaceViewAnimator.spaceViewInputHandler = this.spaceViewInputHandler;

        this.spaceViewDomManager.spaceViewAnimator = this.spaceViewAnimator;

        this.spaceViewInputHandler.spaceViewAnimator = this.spaceViewAnimator;
        this.spaceViewInputHandler.spaceViewDomManager = this.spaceViewDomManager;

        if (typeof window === 'undefined') return; // return if we're just testing

        // populate sidebar
        this.spaceViewDomManager.attachDomEventsToCode(this.resetThreeObjects);
        this.spaceViewDomManager.populateHtml();

        // start drawing
        await this.spaceViewAnimator.populateScene();
        this.spaceViewAnimator.startDrawLoop();
    }

    setupRenderer() {
        const renderer = this.renderer;
        renderer.resetState();
        this.clientObjects.renderer = renderer;
        this.clientObjects.cx = renderer.getContext();
        this.renderer = renderer;

        renderer.setSize(this.c.canvasWidth, this.c.canvasHeight);
        renderer.setPixelRatio(renderer.domElement.devicePixelRatio);
        document.getElementById("canvas-div").appendChild(renderer.domElement);
    }

    detachFromDom() {
        this.spaceViewDomManager.detachFromDom();
        this.spaceViewAnimator.stopDrawLoop();
    }

}
