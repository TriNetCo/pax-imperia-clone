import { GalaxyWidget } from './models/galaxyWidget.js';
import { GameSettings } from './gameSettings.js';

const canvas = document.getElementById("galaxy-canvas-large");
const regenButton = document.getElementById("galaxy-regenerate-button");
const systemCountSlider = document.getElementById("system-count-slider");
const systemBufferSlider = document.getElementById("system-buffer-slider");

let galaxyWidgetSettings = GameSettings.galaxyWidget;

systemCountSlider.value = galaxyWidgetSettings.systemCount;
systemBufferSlider.value = galaxyWidgetSettings.systemBuffer;

let galaxyWidget;
function generateGalaxy() {
    galaxyWidgetSettings.systemCount = systemCountSlider.value;
    galaxyWidgetSettings.systemBuffer = systemBufferSlider.value;
    galaxyWidget = new GalaxyWidget(galaxyWidgetSettings);
    galaxyWidget.beginGame(canvas);
}

generateGalaxy();

regenButton.onclick = function() { generateGalaxy(); }

function draw() {
    galaxyWidget.draw();
    window.requestAnimationFrame(draw);
}

draw();
