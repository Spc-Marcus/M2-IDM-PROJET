// Types énumérés
type Operator = '+' | '-' | '*' | '/' | '<' | '>' | '==';
type SensorType = 'distance' | 'time' | 'battery';
type MoveDirection = 'Forward' | 'Backward' | 'Left' | 'Right';
type RotateDirection = 'Clock' | 'Counter';
type Unit = 'cm' | 'mm';
type RType = 'number' | 'boolean' | 'void';

// Structure du programme

interface Program {
    functions: FunctionDef[]
}

interface FunctionDef {
    name: string
    parameters: Variable[]
    returnType: RType
    instructions: Instruction[]
}

interface Variable {
    name: string
    ^type: RType
}

interface Instruction {}
interface Expression {}

// Instructions

interface VariableDeclaration extends Instruction {
    variable: Variable
    value: Expression
}

interface Assignment extends Instruction {
    assignee: @Variable
    value: Expression
}

interface Loop extends Instruction {
    condition: Expression
    body: Instruction[]
}

interface Condition extends Instruction {
    condition: Expression
    thenBody: Instruction[]
    elseBody: Instruction[]
}

interface Movement extends Instruction {
    direction: MoveDirection
    distance: Expression
    unit: Unit
}

interface Rotate extends Instruction {
    direction: RotateDirection
    angle: Expression
}

interface SetSpeed extends Instruction {
    unit: Unit
    value: Expression
}

interface Return extends Instruction {
    value: Expression
}

// Expressions

interface BinaryExpression extends Expression {
    left: Expression
    operator: Operator
    right: Expression
}

interface NumberLiteral extends Expression {
    value: number
}

interface BooleanLiteral extends Expression {
    value: string
}

interface VariableRef extends Expression {
    variable: @Variable
}

interface SensorAccess extends Expression {
    sensor: SensorType
}

interface FunctionCall extends Instruction, Expression {
    function: @FunctionDef
    arguments: Expression[]
}
