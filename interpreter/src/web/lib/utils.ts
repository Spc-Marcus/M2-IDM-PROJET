import { Entities } from "../simulator/entities.js";
import { Scene } from "../simulator/scene.js";
import { Robot } from "./robot.js";

export type CustomWindow = typeof window & {
    entities: Entities[],
    time: number,
    lastTimestamp: number,
    scene: Scene | undefined,
    p5robot: Robot,
    deltaTime: number
    setup: () => void
    resetSimulation: () => void
};