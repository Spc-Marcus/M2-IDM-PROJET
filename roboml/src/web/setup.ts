import { MonacoLanguageClient } from 'monaco-languageclient';
import { Scene } from './simulator/scene.js';
import { Wall } from './lib/wall.js';
import { Robot } from './lib/robot.js';
import p5 from "./lib/sketch.js";

/**
 * Function to setup the simulator and the different notifications exchanged between the client and the server.
 * @param client the Monaco client, used to send and listen notifications.
 * @param uri the URI of the document, useful for the server to know which document is currently being edited.
 */
export function setup(client: MonacoLanguageClient, uri: string) {
    const win = window as any;
    console.info('[RoboML:setup] Initializing simulator with uri:', uri);

    // Modals for TypeChecking
    const errorModal = document.getElementById("errorModal")! as HTMLElement;
    const validModal = document.getElementById("validModal")! as HTMLElement;
    const closeError = document.querySelector("#errorModal .close")! as HTMLElement;
    const closeValid = document.querySelector("#validModal .close")! as HTMLElement;
    closeError.onclick = function() {
        errorModal.style.display = "none";
    }
    closeValid.onclick = function() {
        validModal.style.display = "none";
    }
    window.onclick = function(event) {
        if (event.target == validModal) {
            validModal.style.display = "none";
        }
        if (event.target == errorModal) {
            errorModal.style.display = "none";
        }
    } 

    // ── Notification handler: receive the interpreted scene from the server ──
    client.onNotification('custom/executeResult', (scene: Scene) => {
        console.info('[RoboML:setup] Received scene from server:', JSON.stringify(scene, null, 2));
        console.info('[RoboML:setup] Scene size:', scene.size);
        console.info('[RoboML:setup] Robot:', scene.robot);
        console.info('[RoboML:setup] Entities count:', scene.entities?.length);
        console.info('[RoboML:setup] Timestamps count:', scene.timestamps?.length);
        setupSimulator(scene);
    });

    // ── Typecheck result handler ──
    client.onNotification('custom/typecheckResult', (result: { errors: string[] }) => {
        if (result.errors && result.errors.length > 0) {
            const body = errorModal.querySelector('.modal-body');
            if (body) {
                body.innerHTML = result.errors.map(e => `<p>${e}</p>`).join('');
            }
            errorModal.style.display = "block";
        } else {
            validModal.style.display = "block";
        }
    });

    function setupSimulator(scene: Scene) {
        console.info('[RoboML:simulator] Setting up simulator...');

        // Reset simulation state
        win.time = 0;
        win.lastTimestamp = 0;
        win.entities = [];

        const wideSide = Math.max(scene.size.x, scene.size.y);
        const factor = 1000 / wideSide;
        console.info('[RoboML:simulator] Scale factor:', factor, '(wideSide:', wideSide, ')');

        win.scene = scene;

        scene.entities.forEach((entity: any, idx: number) => {
            console.info(`[RoboML:simulator] Entity[${idx}]: type=${entity.type} pos=(${entity.pos.x},${entity.pos.y}) size=(${entity.size.x},${entity.size.y})`);
            if (entity.type === "Wall") {
                // Wall entities have pos and size as two endpoints of a line segment
                win.entities.push(new Wall(
                    (entity.pos.x) * factor,
                    (entity.pos.y) * factor,
                    (entity.size.x) * factor,
                    (entity.size.y) * factor,
                    p5
                ));
            }
            if (entity.type === "Block") {
                win.entities.push(new Wall(
                    (entity.pos.x) * factor,
                    (entity.pos.y) * factor,
                    (entity.size.x) * factor,
                    (entity.size.y) * factor,
                    p5
                ));
            }
        });

        console.info(`[RoboML:simulator] Robot: pos=(${scene.robot.pos.x},${scene.robot.pos.y}) size=(${scene.robot.size.x},${scene.robot.size.y}) rad=${scene.robot.rad}`);
        win.p5robot = new Robot(
            factor,
            scene.robot.pos.x,
            scene.robot.pos.y,
            scene.robot.size.x * factor,
            scene.robot.size.y * factor,
            scene.robot.rad,
            p5
        );

        console.info('[RoboML:simulator] Timestamps:');
        scene.timestamps.forEach((ts: any, i: number) => {
            console.info(`  [${i}] time=${ts.time} pos=(${ts.pos.x},${ts.pos.y}) rad=${ts.rad}`);
        });
        console.info('[RoboML:simulator] Setup complete. Total entities:', win.entities.length);
    }

    // ── Button actions exposed on window ──

    // "Parse and Validate" button → sends a hello / validate notification
    win.hello = () => {
        console.info('[RoboML:button] Sending parse & validate request for:', uri);
        client.sendNotification('custom/hello', uri);
    };

    // "Execute Simulation" button → asks the server to interpret and send back the scene
    win.execute = () => {
        console.info('[RoboML:button] Sending execute request for:', uri);
        win.time = 0;
        win.lastTimestamp = 0;
        client.sendNotification('custom/execute', uri);
    };

    // "Restart Simulation" button → resets time without clearing scene
    win.resetSimulation = () => {
        console.info('[RoboML:button] Resetting simulation (replaying from start)...');
        win.time = 0;
        win.lastTimestamp = 0;
    };

    // "Clear Data" button → clears scene and entities
    win.setup = () => {
        console.info('[RoboML:button] Clearing all simulation data...');
        win.time = 0;
        win.lastTimestamp = 0;
        win.entities = [];
        win.scene = undefined;
        win.p5robot = new Robot(1, p5.width / (2 * 1), p5.height / (2 * 1), undefined, undefined, undefined, p5);
    };

    // "Typecheck" button
    win.typecheck = () => {
        console.info('[RoboML:button] Sending typecheck request for:', uri);
        client.sendNotification('custom/typecheck', uri);
    };

    console.info('[RoboML:setup] All button handlers registered.');
}