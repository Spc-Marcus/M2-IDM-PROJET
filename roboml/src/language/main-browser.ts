import { EmptyFileSystem, DocumentState } from 'langium';
import { startLanguageServer } from 'langium/lsp';
import { BrowserMessageReader, BrowserMessageWriter, createConnection } from 'vscode-languageserver/browser.js';
import { createRoboMlServices } from './robo-ml-module.js';
import { Program } from './generated/ast.js';
import { URI } from 'vscode-uri';
import { RoboMLInterpreter } from '../semantics/interpreter.js';

declare const self: DedicatedWorkerGlobalScope;

const messageReader = new BrowserMessageReader(self);
const messageWriter = new BrowserMessageWriter(self);

const connection = createConnection(messageReader, messageWriter);

const { shared } = createRoboMlServices({ connection, ...EmptyFileSystem });

startLanguageServer(shared);

async function getModelFromUri(uri: string): Promise<Program | undefined> {
    console.log('[RoboML:server] getModelFromUri:', uri);
    const document = shared.workspace.LangiumDocuments.getDocument(URI.parse(uri));
    if (!document) {
        console.warn('[RoboML:server] No document found for URI:', uri);
        return undefined;
    }
    
    // Attendre que le document soit au moins dans l'état "IndexedReferences"
    // afin que le weaver ait ajouté les méthodes accept()
    console.log('[RoboML:server] Document state:', document.state);
    if (document.state < DocumentState.IndexedReferences) {
        console.log('[RoboML:server] Waiting for document to be processed...');
        await shared.workspace.DocumentBuilder.build([document], { validation: true });
    }
    
    const diagnostics = document.diagnostics;
    const errors = diagnostics?.filter((i) => i.severity === 1) ?? [];
    console.log('[RoboML:server] Document diagnostics: total=', diagnostics?.length ?? 0, 'errors=', errors.length);
    console.log('[RoboML:server] Document final state:', document.state);
    
    if (diagnostics === undefined || errors.length === 0) {
        console.log('[RoboML:server] Model is valid, returning AST');
        return document.parseResult.value as Program;
    }
    console.warn('[RoboML:server] Model has errors:', errors.map(e => e.message));
    return undefined;
}

// ── "Execute Simulation" button handler ──
connection.onNotification("custom/execute", async (uri: string) => {
    console.log('[RoboML:server] Received custom/execute for:', uri);
    const model = await getModelFromUri(uri);
    if (model) {
        try {
            const interpreter = new RoboMLInterpreter();
            const scene = interpreter.interpret(model);
            console.log('[RoboML:server] Interpretation succeeded, sending scene with', scene.timestamps.length, 'timestamps');
            connection.sendNotification("custom/executeResult", scene);
        } catch (err: any) {
            console.error('[RoboML:server] Interpretation error:', err);
            connection.sendNotification("custom/typecheckResult", {
                errors: [`Interpretation error: ${err.message || err}`]
            });
        }
    } else {
        console.warn('[RoboML:server] Cannot execute: parse/validation errors');
        connection.sendNotification("custom/typecheckResult", {
            errors: ['Cannot execute: the program has parse or validation errors.']
        });
    }
});

// ── "Parse and Validate" button handler ──
connection.onNotification("custom/hello", async (uri: string) => {
    console.log('[RoboML:server] Received custom/hello for:', uri);
    const model = await getModelFromUri(uri);
    if (model) {
        console.log('[RoboML:server] Validation OK');
        connection.sendNotification("custom/typecheckResult", { errors: [] });
    } else {
        console.warn('[RoboML:server] Validation failed');
        connection.sendNotification("custom/typecheckResult", {
            errors: ['The program has parse or validation errors.']
        });
    }
});