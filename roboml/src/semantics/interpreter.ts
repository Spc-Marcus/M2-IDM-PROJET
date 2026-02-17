import {
    Assignment, BinaryExpression, BooleanLiteral, Condition, Expression,
    FunctionCall, FunctionDef, Instruction, Loop, Movement, NumberLiteral,
    Program, Return, RoboMlVisitor, Rotate, SensorAccess, SetSpeed,
    Variable, VariableDeclaration, VariableRef
} from './robo-ml-visitor.js';
import { BaseScene } from '../web/simulator/scene.js';
import { Robot, Timestamp } from '../web/simulator/entities.js';

/**
 * Special sentinel class to signal a return from a function.
 */
class ReturnSignal {
    constructor(public value: any) {}
}

/**
 * Complete interpreter for the RoboML language.
 * Uses the visitor pattern to walk the AST and simulate robot commands,
 * producing a Scene with timestamps for the web simulator.
 */
export class RoboMLInterpreter implements RoboMlVisitor {

    // --- Simulation state ---
    private scene!: BaseScene;
    private currentTime: number = 0;       // simulation time in ms
    private speed: number = 30;            // robot speed in mm/s

    // --- Variable / function environment ---
    private scopeStack: Map<string, number | boolean>[] = [];
    private functions: Map<string, FunctionDef> = new Map();

    // Max iterations to avoid infinite loops
    private static readonly MAX_LOOP_ITERATIONS = 100_000;

    // ─────────────────────────────────────────────────────────
    //  Public entry point
    // ─────────────────────────────────────────────────────────

    /**
     * Interpret a RoboML Program and return a serialisable Scene object
     * that can be sent to the web client for visualisation.
     */
    interpret(model: any): any {
        // Reset state
        this.scene = new BaseScene();
        this.currentTime = 0;
        this.speed = 30;
        this.scopeStack = [new Map()];
        this.functions = new Map();

        const program = model as Program;
        console.log('[RoboML:interpreter] Starting interpretation...');
        console.log('[RoboML:interpreter] Functions found:', program.functions.map(f => f.name));

        // Register all user-defined functions
        for (const fn of program.functions) {
            this.functions.set(fn.name, fn);
        }

        // Find the entry point (a function named "entry")
        const entry = this.functions.get('entry');
        if (!entry) {
            console.warn('[RoboML:interpreter] No "entry" function found – nothing to execute.');
            return this.serializeScene();
        }

        console.log('[RoboML:interpreter] Executing entry function...');
        // Execute the entry function (no args)
        this.executeFunction(entry, []);

        const result = this.serializeScene();
        console.log('[RoboML:interpreter] Interpretation complete.');
        console.log('[RoboML:interpreter] Final scene: timestamps=', result.timestamps.length, 'entities=', result.entities.length);
        console.log('[RoboML:interpreter] Robot final pos:', result.robot.pos, 'rad:', result.robot.rad);
        return result;
    }

    // ─────────────────────────────────────────────────────────
    //  Dispatch helpers ($type-based, avoids weaver dependency)
    // ─────────────────────────────────────────────────────────

    private evalExpr(node: any): any {
        switch (node.$type) {
            case 'BinaryExpression':   return this.visitBinaryExpression(node);
            case 'NumberLiteral':      return this.visitNumberLiteral(node);
            case 'BooleanLiteral':     return this.visitBooleanLiteral(node);
            case 'FunctionCall':       return this.visitFunctionCall(node);
            case 'SensorAccess':       return this.visitSensorAccess(node);
            case 'VariableRef':        return this.visitVariableRef(node);
            default:
                throw new Error(`[RoboML] Unknown expression type: ${node.$type}`);
        }
    }

    private execInstr(node: any): any {
        switch (node.$type) {
            case 'VariableDeclaration': return this.visitVariableDeclaration(node);
            case 'Assignment':          return this.visitAssignment(node);
            case 'Loop':                return this.visitLoop(node);
            case 'Condition':           return this.visitCondition(node);
            case 'Movement':            return this.visitMovement(node);
            case 'Rotate':              return this.visitRotate(node);
            case 'SetSpeed':            return this.visitSetSpeed(node);
            case 'Return':              return this.visitReturn(node);
            case 'FunctionCall':        return this.visitFunctionCall(node);
            default:
                throw new Error(`[RoboML] Unknown instruction type: ${node.$type}`);
        }
    }

    /**
     * Execute a list of instructions, stopping early if a Return is encountered.
     * Returns a ReturnSignal if one was raised, otherwise undefined.
     */
    private execBlock(instructions: any[]): any {
        for (const instr of instructions) {
            const result = this.execInstr(instr);
            if (result instanceof ReturnSignal) {
                return result;
            }
        }
        return undefined;
    }

    // ─────────────────────────────────────────────────────────
    //  Scope helpers
    // ─────────────────────────────────────────────────────────

    private pushScope(): void {
        this.scopeStack.push(new Map());
    }

    private popScope(): void {
        this.scopeStack.pop();
    }

    private setVariable(name: string, value: number | boolean): void {
        this.scopeStack[this.scopeStack.length - 1].set(name, value);
    }

    private getVariable(name: string): number | boolean {
        for (let i = this.scopeStack.length - 1; i >= 0; i--) {
            if (this.scopeStack[i].has(name)) {
                return this.scopeStack[i].get(name)!;
            }
        }
        throw new Error(`[RoboML] Undefined variable: ${name}`);
    }

    private updateVariable(name: string, value: number | boolean): void {
        for (let i = this.scopeStack.length - 1; i >= 0; i--) {
            if (this.scopeStack[i].has(name)) {
                this.scopeStack[i].set(name, value);
                return;
            }
        }
        throw new Error(`[RoboML] Cannot assign to undefined variable: ${name}`);
    }

    // ─────────────────────────────────────────────────────────
    //  Unit helpers
    // ─────────────────────────────────────────────────────────

    /** Convert a value in the given unit to mm. */
    private toMm(value: number, unit: string | undefined): number {
        if (unit === 'cm') return value * 10;
        return value; // mm or no unit
    }

    /** Convert a value from mm to the given unit. */
    private fromMm(value: number, unit: string | undefined): number {
        if (unit === 'cm') return value / 10;
        return value; // mm or no unit
    }

    // ─────────────────────────────────────────────────────────
    //  Robot helpers
    // ─────────────────────────────────────────────────────────

    private get robot(): Robot {
        return this.scene.robot;
    }

    /** Record the current robot state as a timestamp. */
    private addTimestamp(): void {
        this.scene.timestamps.push(new Timestamp(this.currentTime, this.robot));
    }

    /**
     * Move the robot by `distMm` millimetres in the given direction
     * and advance the simulation clock accordingly.
     */
    private moveRobot(distMm: number, direction: string): void {
        console.log(`[RoboML:interpreter] moveRobot: direction=${direction} dist=${distMm}mm`);
        switch (direction) {
            case 'Forward':
                this.robot.move(distMm);
                break;
            case 'Backward':
                this.robot.move(-distMm);
                break;
            case 'Left':
                this.robot.side(-distMm);
                break;
            case 'Right':
                this.robot.side(distMm);
                break;
        }
        // Time taken = distance / speed → result in seconds → ×1000 for ms
        const durationMs = (Math.abs(distMm) / this.speed) * 1000;
        this.currentTime += durationMs;
        console.log(`[RoboML:interpreter]   -> robot now at (${this.robot.pos.x.toFixed(1)}, ${this.robot.pos.y.toFixed(1)}) time=${this.currentTime.toFixed(0)}ms`);
        this.addTimestamp();
    }

    /**
     * Rotate the robot by `angleDeg` degrees.
     * Clock = clockwise (+), Counter = counter-clockwise (−).
     */
    private rotateRobot(angleDeg: number, direction: string): void {
        console.log(`[RoboML:interpreter] rotateRobot: direction=${direction} angle=${angleDeg}deg`);
        const angleRad = (angleDeg * Math.PI) / 180;
        if (direction === 'Clock') {
            this.robot.turn(angleRad);
        } else {
            this.robot.turn(-angleRad);
        }
        // Small duration proportional to angle
        const durationMs = Math.abs(angleDeg) * 5;
        this.currentTime += durationMs;
        console.log(`[RoboML:interpreter]   -> robot now at rad=${this.robot.rad.toFixed(3)} time=${this.currentTime.toFixed(0)}ms`);
        this.addTimestamp();
    }

    /**
     * Get the distance from the robot to the nearest obstacle (in mm).
     */
    private getDistanceMm(): number {
        const ray = this.robot.getRay();
        const poi = ray.intersect(this.scene.entities);
        if (poi) {
            return this.robot.pos.minus(poi).norm();
        }
        return 10000; // fallback: max scene size
    }

    // ─────────────────────────────────────────────────────────
    //  Function call helper
    // ─────────────────────────────────────────────────────────

    private executeFunction(fn: FunctionDef, args: any[]): any {
        this.pushScope();

        // Bind parameters
        const params = fn.parameters;
        for (let i = 0; i < params.length; i++) {
            this.setVariable(params[i].name, args[i]);
        }

        // Execute body
        const result = this.execBlock(fn.instructions as any[]);

        this.popScope();

        if (result instanceof ReturnSignal) {
            return result.value;
        }
        return undefined;
    }

    // ─────────────────────────────────────────────────────────
    //  Visitor: Expressions
    // ─────────────────────────────────────────────────────────

    visitExpression(node: Expression): any {
        return this.evalExpr(node);
    }

    visitBinaryExpression(node: BinaryExpression): any {
        const left = this.evalExpr(node.left);
        const right = this.evalExpr(node.right);

        switch (node.operator) {
            case '+':  return (left as number) + (right as number);
            case '-':  return (left as number) - (right as number);
            case '*':  return (left as number) * (right as number);
            case '/':
                if (right === 0) throw new Error('[RoboML] Division by zero');
                return (left as number) / (right as number);
            case '<':  return (left as number) < (right as number);
            case '>':  return (left as number) > (right as number);
            case '==': return left === right;
            default:
                throw new Error(`[RoboML] Unknown operator: ${node.operator}`);
        }
    }

    visitNumberLiteral(node: NumberLiteral): number {
        return node.value;
    }

    visitBooleanLiteral(node: BooleanLiteral): boolean {
        return node.value === 'true';
    }

    visitFunctionCall(node: FunctionCall): any {
        const fnRef = node.function;
        const fnDef = fnRef.ref;
        if (!fnDef) {
            throw new Error(`[RoboML] Unresolved function reference`);
        }

        // Evaluate arguments
        const args = (node.arguments as any[]).map((arg: any) => this.evalExpr(arg));

        // Execute
        return this.executeFunction(fnDef as unknown as FunctionDef, args);
    }

    visitSensorAccess(node: SensorAccess): any {
        switch (node.sensor) {
            case 'getDistance':
                return this.getDistanceMm();
            case 'getTimestamp':
                return this.currentTime;
            default:
                throw new Error(`[RoboML] Unknown sensor: ${node.sensor}`);
        }
    }

    visitVariableRef(node: VariableRef): any {
        const varRef = node.variable;
        const varDef = varRef.ref;
        if (!varDef) {
            throw new Error(`[RoboML] Unresolved variable reference`);
        }
        return this.getVariable(varDef.name);
    }

    // ─────────────────────────────────────────────────────────
    //  Visitor: Instructions
    // ─────────────────────────────────────────────────────────

    visitVariableDeclaration(node: VariableDeclaration): any {
        let value = this.evalExpr(node.value);

        // If a unit is specified, convert the raw value (assumed mm) to the target unit
        if (node.unit) {
            value = this.fromMm(value as number, node.unit);
        }

        const varNode = node.variable;
        this.setVariable(varNode.name, value);
        return undefined;
    }

    visitAssignment(node: Assignment): any {
        const value = this.evalExpr(node.value);
        const varRef = node.assignee;
        const varDef = varRef.ref;
        if (!varDef) {
            throw new Error(`[RoboML] Unresolved variable in assignment`);
        }
        this.updateVariable(varDef.name, value);
        return undefined;
    }

    visitCondition(node: Condition): any {
        const cond = this.evalExpr(node.condition);
        if (cond) {
            return this.execBlock(node.thenBody as any[]);
        } else if (node.elseBody && node.elseBody.length > 0) {
            return this.execBlock(node.elseBody as any[]);
        }
        return undefined;
    }

    visitLoop(node: Loop): any {
        let iterations = 0;
        while (true) {
            const cond = this.evalExpr(node.condition);
            if (!cond) break;

            const result = this.execBlock(node.body as any[]);
            if (result instanceof ReturnSignal) {
                return result;
            }

            iterations++;
            if (iterations > RoboMLInterpreter.MAX_LOOP_ITERATIONS) {
                console.warn('[RoboML] Max loop iterations reached – breaking out.');
                break;
            }
        }
        return undefined;
    }

    visitMovement(node: Movement): any {
        const rawDist = this.evalExpr(node.distance) as number;
        const distMm = this.toMm(rawDist, node.unit);
        this.moveRobot(distMm, node.direction);
        return undefined;
    }

    visitRotate(node: Rotate): any {
        const angleDeg = this.evalExpr(node.angle) as number;
        this.rotateRobot(angleDeg, node.direction);
        return undefined;
    }

    visitSetSpeed(node: SetSpeed): any {
        const rawSpeed = this.evalExpr(node.value) as number;
        this.speed = this.toMm(rawSpeed, node.unit); // store internally in mm/s
        return undefined;
    }

    visitReturn(node: Return): any {
        const value = this.evalExpr(node.value);
        return new ReturnSignal(value);
    }

    // ─────────────────────────────────────────────────────────
    //  Visitor: Structural nodes (Program, FunctionDef, Variable)
    // ─────────────────────────────────────────────────────────

    visitProgram(node: Program): any {
        return this.interpret(node);
    }

    visitFunctionDef(node: FunctionDef): any {
        return this.executeFunction(node, []);
    }

    visitInstruction(node: Instruction): any {
        return this.execInstr(node);
    }

    visitVariable(node: Variable): any {
        return this.getVariable(node.name);
    }

    // ─────────────────────────────────────────────────────────
    //  Serialisation – produces a plain JSON-safe object
    // ─────────────────────────────────────────────────────────

    private serializeScene(): any {
        return {
            size: { x: this.scene.size.x, y: this.scene.size.y },
            entities: this.scene.entities.map(e => ({
                type: (e as any).type ?? 'Wall',
                pos: { x: e.pos.x, y: e.pos.y },
                size: { x: e.size.x, y: e.size.y }
            })),
            robot: {
                type: 'Robot',
                pos: { x: this.scene.robot.pos.x, y: this.scene.robot.pos.y },
                size: { x: this.scene.robot.size.x, y: this.scene.robot.size.y },
                rad: this.scene.robot.rad,
                speed: this.scene.robot.speed
            },
            time: this.currentTime,
            timestamps: this.scene.timestamps.map(ts => ({
                type: 'Robot',
                pos: { x: ts.pos.x, y: ts.pos.y },
                size: { x: ts.size.x, y: ts.size.y },
                rad: ts.rad,
                speed: ts.speed,
                time: ts.time
            }))
        };
    }
}