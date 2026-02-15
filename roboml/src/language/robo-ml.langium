grammar RoboML

import 'Terminals'
import 'roboML-types'

// Programme = liste de fonctions
entry Program returns Program:
    (functions+=FunctionDef)*
;

// let <type> <nom>(<params>) { <instructions> }
FunctionDef returns FunctionDef:
    'let' returnType=RType name=ID '(' (parameters+=Parameter (',' parameters+=Parameter)*)? ')' '{'
        (instructions+=Instruction)*
    '}'
;

Parameter returns Variable:
    ^type=RType name=ID
;

RType returns RType:
    'number' | 'boolean' | 'void'
;

Instruction returns Instruction:
    VariableDeclaration | Loop | Condition | Movement | Rotate | SetSpeed | Return | AssignmentOrCall
;

// var <type> <nom> = <expr>
VariableDeclaration returns VariableDeclaration:
    'var' variable=InlineVariable '=' value=Expression
;

InlineVariable returns Variable:
    ^type=RType name=ID
;

// <var> = <expr>  |  <fn>(<args>)
AssignmentOrCall returns Instruction:
    {Assignment} assignee=[Variable:ID] '=' value=Expression
    | {FunctionCall} function=[FunctionDef:ID] '(' (arguments+=Expression (',' arguments+=Expression)*)? ')'
;

// loop <cond> { ... }
Loop returns Loop:
    'loop' condition=Expression '{'
        (body+=Instruction)*
    '}'
;

// if <cond> { ... } else { ... }
Condition returns Condition:
    'if' condition=Expression '{'
        (thenBody+=Instruction)*
    '}' ('else' '{'
        (elseBody+=Instruction)*
    '}')?
;

// Forward/Backward/Left/Right <dist> in cm|mm
Movement returns Movement:
    direction=MoveDirection distance=Expression 'in' unit=Unit
;

MoveDirection returns MoveDirection:
    'Forward' | 'Backward' | 'Left' | 'Right'
;

// Clock/Counter <angle>
Rotate returns Rotate:
    direction=RotateDirection angle=Expression
;

RotateDirection returns RotateDirection:
    'Clock' | 'Counter'
;

// setSpeed(<val> in cm|mm)
SetSpeed returns SetSpeed:
    'setSpeed' '(' value=Expression 'in' unit=Unit ')'
;

Unit returns Unit:
    'cm' | 'mm'
;

Return returns Return:
    'return' value=Expression
;

// Précédence opérateurs : * / > + - > < > ==

Expression returns Expression:
    Comparison
;

Comparison returns Expression:
    Addition ({BinaryExpression.left=current} operator=('<' | '>' | '==') right=Addition)*
;

Addition returns Expression:
    Multiplication ({BinaryExpression.left=current} operator=('+' | '-') right=Multiplication)*
;

Multiplication returns Expression:
    PrimaryExpression ({BinaryExpression.left=current} operator=('*' | '/') right=PrimaryExpression)*
;

PrimaryExpression returns Expression:
    '(' Expression ')'
    | {NumberLiteral} value=INT
    | {BooleanLiteral} value=('true' | 'false')
    | {SensorAccess} 'sensor' '.' sensor=SensorType
    | {FunctionCall} function=[FunctionDef:ID] '(' (arguments+=Expression (',' arguments+=Expression)*)? ')'
    | {VariableRef} variable=[Variable:ID]
;

SensorType returns SensorType:
    'distance' | 'time' | 'battery'
;
