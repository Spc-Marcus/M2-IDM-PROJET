import { MonacoEditorLanguageClientWrapper, type WrapperConfig } from 'monaco-editor-wrapper';
import { configureWorker, defineVscodeApiConfig, monacoWorkerFactory } from './setupCommon.js';
import monarchSyntax from "./syntaxes/robo-ml.monarch.js";
import { setup } from './web/setup.js';

export const setupConfigClassic = (htmlElement: HTMLElement): WrapperConfig => {
    const editorOptions: any = {
        theme: 'vs-dark',
        'semanticHighlighting.enabled': true
    };

    return {
        $type: 'classic',
        htmlContainer: htmlElement,
        vscodeApiConfig: defineVscodeApiConfig(),
        editorAppConfig: {
            codeResources: {
                modified: {
                    uri: '/workspace/main.robo-ml',
                    text: `// RoboML is running in the web!`,
                    enforceLanguageId: 'robo-ml'
                }
            },
            useDiffEditor: false,
            monacoWorkerFactory,
            languageDef: {
                languageExtensionConfig: {
                    id: 'robo-ml',
                    extensions: ['.robo-ml']
                },
                monarchLanguage: monarchSyntax
            },
            editorOptions
        },
        languageClientConfigs: {
            configs: {
                'robo-ml': configureWorker()
            }
        }
    };
};

export const executeClassic = async (htmlElement: HTMLElement) => {
    const wrapperConfig = setupConfigClassic(htmlElement);
    const wrapper = new MonacoEditorLanguageClientWrapper();
    await wrapper.initAndStart(wrapperConfig);

    // Get the language client and wire up the simulator
    const client = wrapper.getLanguageClient('robo-ml');
    if (!client) {
        throw new Error('Unable to obtain language client!');
    }

    const uri = wrapper.getTextModels()?.modified?.uri.toString() ?? '/workspace/main.robo-ml';
    setup(client as any, uri);
};