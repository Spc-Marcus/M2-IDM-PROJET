import type { AstNode, ValidationAcceptor, ValidationChecks } from 'langium';
import {
    type RoboMlAstType, type FunctionCall, type Expression, type RType,
    type Program,
    isBinaryExpression, isBooleanLiteral, isNumberLiteral,
    isFunctionCall, isVariableRef, isSensorAccess,
    isVariableDeclaration, type FunctionDef, isReturn
} from './generated/ast.js';
import type { RoboMlServices } from './robo-ml-module.js';

export function registerValidationChecks(services: RoboMlServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.RoboMlValidator;
    const checks: ValidationChecks<RoboMlAstType> = {
        Program: validator.checkDuplicateFunctions,
        FunctionCall: validator.checkFunctionCall,
        FunctionDef: validator.checkFunctionDef,
    };
    registry.register(checks, validator);
}

// Infère le type d'une expression
function inferType(expr: Expression): RType | undefined {
    if (isNumberLiteral(expr)) return 'number';
    if (isBooleanLiteral(expr)) return 'boolean';
    if (isSensorAccess(expr)) return 'number';
    if (isVariableRef(expr)) return expr.variable?.ref?.type;
    if (isFunctionCall(expr)) return expr.function?.ref?.returnType;
    if (isBinaryExpression(expr)) {
        const op = expr.operator;
        if (op === '<' || op === '>' || op === '==') return 'boolean';
        return 'number';
    }
    return undefined;
}

// Vérifie si un noeud est utilisé comme expression (dans un contexte qui attend une valeur)
function isUsedAsExpression(node: AstNode): boolean {
    const parent = node.$container;
    if (!parent) return false;
    // Si le parent est une VariableDeclaration ou Assignment → valeur attendue
    if (isVariableDeclaration(parent)) return true;
    // Si le parent est une BinaryExpression → c'est un opérande
    if (isBinaryExpression(parent)) return true;
    // Si le parent est un FunctionCall → c'est un argument
    if (isFunctionCall(parent)) return true;
    // Si le parent est un Return → valeur de retour
    if (isReturn(parent)) return true;
    return false;
}

export class RoboMlValidator {

    // Vérifie les noms de fonctions dupliqués + existence de entry
    checkDuplicateFunctions(program: Program, accept: ValidationAcceptor): void {
        const seen = new Map<string, FunctionDef>();
        for (const fn of program.functions) {
            const existing = seen.get(fn.name);
            if (existing) {
                accept('error',
                    `La fonction '${fn.name}' est déjà définie.`,
                    { node: fn, property: 'name' }
                );
            } else {
                seen.set(fn.name, fn);
            }
        }

        const entry = seen.get('entry');
        if (!entry) {
            accept('error',
                `Le programme doit contenir une fonction 'entry'.`,
                { node: program }
            );
        } else if (entry.returnType !== 'void') {
            accept('error',
                `La fonction 'entry' doit retourner 'void'.`,
                { node: entry, property: 'returnType' }
            );
        }
    }

    // Vérifie les appels de fonction
    checkFunctionCall(call: FunctionCall, accept: ValidationAcceptor): void {
        const fn = call.function?.ref;
        if (!fn) return; // linking error, pas notre problème

        // Void dans une expression → erreur
        if (fn.returnType === 'void' && isUsedAsExpression(call)) {
            accept('error',
                `La fonction '${fn.name}' retourne void et ne peut pas être utilisée dans une expression.`,
                { node: call, property: 'function' }
            );
        }

        // Nombre d'arguments
        if (call.arguments.length !== fn.parameters.length) {
            accept('error',
                `'${fn.name}' attend ${fn.parameters.length} argument(s) mais ${call.arguments.length} fourni(s).`,
                { node: call, property: 'function' }
            );
            return;
        }

        // Type des arguments
        for (let i = 0; i < call.arguments.length; i++) {
            const expected = fn.parameters[i].type;
            const actual = inferType(call.arguments[i]);
            if (actual && actual !== expected) {
                accept('error',
                    `Argument ${i + 1} de '${fn.name}' : attendu '${expected}', reçu '${actual}'.`,
                    { node: call.arguments[i] }
                );
            }
        }
    }

    // Vérifie qu'une fonction non-void a bien un return
    checkFunctionDef(fn: FunctionDef, accept: ValidationAcceptor): void {
        if (fn.returnType === 'void') return;

        const hasReturn = fn.instructions.some(i => i.$type === 'Return');
        if (!hasReturn) {
            accept('warning',
                `La fonction '${fn.name}' déclare retourner '${fn.returnType}' mais n'a pas de return.`,
                { node: fn, property: 'name' }
            );
        }
    }
}

