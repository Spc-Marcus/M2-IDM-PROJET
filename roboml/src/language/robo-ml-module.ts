import { type Module, inject } from 'langium';
import { createDefaultModule, createDefaultSharedModule, type DefaultSharedModuleContext, type LangiumServices, type LangiumSharedServices, type PartialLangiumServices } from 'langium/lsp';
import { RoboMLGeneratedModule, RoboMlGeneratedSharedModule } from './generated/module.js';
import { RoboMlValidator, registerValidationChecks } from './robo-ml-validator.js';
import { RoboMlScopeComputation } from './robo-ml-scope.js';
import { RoboMlAcceptWeaver } from '../semantics/robo-ml-accept-weaver.js';

// Services custom
export type RoboMlAddedServices = {
    validation: {
        RoboMlValidator: RoboMlValidator
    }
}

// Services Langium + custom
export type RoboMlServices = LangiumServices & RoboMlAddedServices

// Module DI : surcharge du scope + validation
export const RoboMlModule: Module<RoboMlServices, PartialLangiumServices & RoboMlAddedServices> = {
    references: {
        ScopeComputation: (services) => new RoboMlScopeComputation(services)
    },
    validation: {
        RoboMlValidator: () => new RoboMlValidator()
    }
};

// Création des services (shared + language-specific)
export function createRoboMlServices(context: DefaultSharedModuleContext): {
    shared: LangiumSharedServices,
    RoboMl: RoboMlServices
} {
    const shared = inject(
        createDefaultSharedModule(context),
        RoboMlGeneratedSharedModule
    );
    const RoboMl = inject(
        createDefaultModule({ shared }),
        RoboMLGeneratedModule,
        RoboMlModule
    );
    shared.ServiceRegistry.register(RoboMl);
    
    // Instancier le Accept Weaver pour ajouter accept() aux nœuds AST
    new RoboMlAcceptWeaver(RoboMl);
    
    registerValidationChecks(RoboMl);
    if (!context.connection) {
        // Pas de language server → init config directement
        shared.workspace.ConfigurationProvider.initialized({});
    }
    return { shared, RoboMl };
}
