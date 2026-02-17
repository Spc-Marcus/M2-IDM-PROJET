import P5 from "p5";
import { Robot } from "./robot.js";
import { CustomWindow } from "./utils.js";
import { Wall } from "./wall.js";

const win = window as CustomWindow;

const sketch = (p: P5) => {
    p.setup = () => {
        console.info('[RoboML:sketch] p5 setup – creating canvas 1000x1000');
        const canvas = p.createCanvas(1000, 1000, document.getElementById("simulator") as HTMLCanvasElement);
        canvas.parent("simulator-wrapper");
        win.entities = [];
        win.time = 0;
        win.lastTimestamp = 0;
        win.scene = undefined;
        win.p5robot = new Robot(1, p.width / 2, p.height / 2, undefined, undefined, undefined, p);
    };

    let loggedOnce = false;

    p.draw = () => {
        p.background(0);
        p.stroke(255);
        p.strokeWeight(1);

        for (var e = 0; e < win.entities.length; e++) {
            (win.entities[e] as unknown as Wall).show();
        }

        if (win.scene !== null && win.scene && win.scene.timestamps.length > win.lastTimestamp + 1) {
            if (!loggedOnce) {
                console.info('[RoboML:sketch] Animation started – timestamps:', win.scene.timestamps.length, 'current:', win.lastTimestamp);
                loggedOnce = true;
            }
            win.time += p.deltaTime;
            updateRobot(p);
        } else if (loggedOnce && win.scene && win.lastTimestamp + 1 >= win.scene.timestamps.length) {
            console.info('[RoboML:sketch] Animation complete – final timestamp:', win.lastTimestamp);
            loggedOnce = false;
        }

        if (win.p5robot !== null && win.p5robot !== undefined) {
            win.p5robot.show();
        }
    };
};

const p5 = new P5(sketch);



function updateRobot(p: P5) {
    const lastKnownState = win.scene!.timestamps[win.lastTimestamp];
    const nextKnownState = win.scene!.timestamps[win.lastTimestamp + 1];

    win.p5robot.x = p.map(win.time, lastKnownState.time, nextKnownState.time, lastKnownState.pos.x, nextKnownState.pos.x, true)
    win.p5robot.y = p.map(win.time, lastKnownState.time, nextKnownState.time, lastKnownState.pos.y, nextKnownState.pos.y, true)
    win.p5robot.angle = p.map(win.time, lastKnownState.time, nextKnownState.time, lastKnownState.rad, nextKnownState.rad, true)

    if (win.time >= nextKnownState.time) {
        win.time = nextKnownState.time;
        win.lastTimestamp++;
    }
}

function resetSimulation() {
    console.info('[RoboML:sketch] resetSimulation called');
    win.time = 0;
    win.lastTimestamp = 0;
}

win.resetSimulation = resetSimulation

export default p5;