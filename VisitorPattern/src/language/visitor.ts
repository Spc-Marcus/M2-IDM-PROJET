import * as ASTInterfaces from '../language/generated/ast.js';
import { Reference } from 'langium';

export interface RoboMLVisitor{
    // TODO : create one visit method for each concept of the language
    // Take a look at tour abstract syntax for that
    visitConcept(node : Concept) : any;
}

// TODO : create one concrete class for each concept
export class Concept implements ASTInterfaces.Concept {
    // the constructor must take all attribute of the implemented interface 
    // simply copy-paste the interface fields as public parameters
    // you can find them in generated/ast.ts
    constructor(public $type: 'Type'){}
    accept (visitor: RoboMLVisitor) : any {}
}