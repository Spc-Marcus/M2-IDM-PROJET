import getKeybindingsServiceOverride from '@codingame/monaco-vscode-keybindings-service-override';
import type { LanguageClientConfig } from 'monaco-editor-wrapper';
import { configureDefaultWorkerFactory } from 'monaco-editor-wrapper/workers/workerLoaders';

export const configureMonacoWorkers = configureDefaultWorkerFactory;

export const defineVscodeApiConfig = (): any => {
    return {
        serviceOverrides: {
            ...getKeybindingsServiceOverride()
        }
    };
};

export const monacoWorkerFactory = configureDefaultWorkerFactory;

export const configureWorker = (): LanguageClientConfig => {
    // vite does not extract the worker properly if it is URL is a variable
    const lsWorker = new Worker(new URL('./language/main-browser', import.meta.url), {
        type: 'module',
        name: 'RoboMl Language Server'
    });

    return {
        name: 'RoboML',
        connection: {
            options: {
                $type: 'WorkerDirect',
                worker: lsWorker
            }
        },
        clientOptions: {
            documentSelector: [{ scheme: '*', language: 'robo-ml' }]
        }
    };
};
