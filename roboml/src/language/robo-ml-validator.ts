import type { ValidationChecks } from 'langium';
import type { RoboMlAstType } from './generated/ast.js';
import type { RoboMlServices } from './robo-ml-module.js';

export function registerValidationChecks(services: RoboMlServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.RoboMlValidator;
    const checks: ValidationChecks<RoboMlAstType> = {};
    registry.register(checks, validator);
}

export class RoboMlValidator {
}

