import { MonacoEditorLanguageClientWrapper, type WrapperConfig } from 'monaco-editor-wrapper';
import { configureWorker, defineVscodeApiConfig, monacoWorkerFactory } from './setupCommon.js';

export const setupConfigExtended = (htmlElement: HTMLElement): WrapperConfig => {
    const extensionFilesOrContents = new Map();
    extensionFilesOrContents.set('/language-configuration.json', new URL('../language-configuration.json', import.meta.url));
    extensionFilesOrContents.set('/robo-ml-grammar.json', new URL('../syntaxes/robo-ml.tmLanguage.json', import.meta.url));

    const editorOptions: any = {
        'semanticHighlighting.enabled': true
    };

    return {
        $type: 'extended',
        htmlContainer: htmlElement,
        vscodeApiConfig: defineVscodeApiConfig(),
        extensions: [{
            config: {
                name: 'robo-ml-web',
                publisher: 'generator-langium',
                version: '1.0.0',
                engines: {
                    vscode: '*'
                },
                contributes: {
                    languages: [{
                        id: 'robo-ml',
                        extensions: [
                            '.robo-ml'
                        ],
                        configuration: './language-configuration.json'
                    }],
                    grammars: [{
                        language: 'robo-ml',
                        scopeName: 'source.robo-ml',
                        path: './robo-ml-grammar.json'
                    }]
                }
            },
            filesOrContents: extensionFilesOrContents
        }],
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
            editorOptions
        },
        languageClientConfigs: {
            configs: {
                'robo-ml': configureWorker()
            }
        }
    };
};

export const executeExtended = async (htmlElement: HTMLElement) => {
    const wrapperConfig = setupConfigExtended(htmlElement);
    const wrapper = new MonacoEditorLanguageClientWrapper();
    await wrapper.initAndStart(wrapperConfig);
};
