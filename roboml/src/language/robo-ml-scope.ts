import { AstNode, AstNodeDescription, DefaultScopeComputation, LangiumDocument, PrecomputedScopes } from 'langium';
import { isFunctionDef, isVariableDeclaration } from './generated/ast.js';

// Rend les variables (var/params) visibles dans tout le bloc parent
export class RoboMlScopeComputation extends DefaultScopeComputation {

    override processNode(node: AstNode, document: LangiumDocument, scopes: PrecomputedScopes): void {
        if (isVariableDeclaration(node) && node.variable?.name) {
            const container = node.$container;
            if (container) {
                const desc: AstNodeDescription = this.descriptions.createDescription(node.variable, node.variable.name, document);
                scopes.add(container, desc);
            }
        }

        if (isFunctionDef(node)) {
            for (const param of node.parameters) {
                if (param.name) {
                    const desc: AstNodeDescription = this.descriptions.createDescription(param, param.name, document);
                    scopes.add(node, desc);
                }
            }
        }

        if (node.$type === 'Variable') return;
        super.processNode(node, document, scopes);
    }
}
