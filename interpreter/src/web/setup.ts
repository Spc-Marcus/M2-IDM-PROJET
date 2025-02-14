import { MonacoLanguageClient } from 'monaco-languageclient';
import { Scene } from './web/simulator/scene.js';
import { Wall } from './web/lib/wall.js';
import { Robot } from './web/lib/robot.js';
import p5 from "./web/lib/sketch.js";

// TODO : call it in setupClassic.ts
/**
 * Function to setup the simulator and the different notifications exchanged between the client and the server.
 * @param client the Monaco client, used to send and listen notifications.
 * @param uri the URI of the document, useful for the server to know which document is currently being edited.
 */
export function setup(client: MonacoLanguageClient, uri: string) {
    const win = window as any;

    // Modals for TypeChecking
    var errorModal = document.getElementById("errorModal") as HTMLElement;
    var validModal = document.getElementById("validModal") as HTMLElement;
    var closeError = document.querySelector("#errorModal .close") as HTMLElement;
    var closeValid = document.querySelector("#validModal .close") as HTMLElement;
    closeError.onclick = function() {
        errorModal.style.display = "none";
    }
    closeValid.onclick = function() {
        validModal.style.display = "none";
    }
    window.onclick = function(event) {
        if (event.target == validModal) {
            validModal.style.display = "none";
        }
        if (event.target == errorModal) {
            errorModal.style.display = "none";
        }
    } 


    const parseAndValidate = (async () => {
        console.info('validating current code...');
        // TODO : implement
    });

    const typecheck = (async () => {
        console.info('typechecking current code...');

        // BONUS : Implement new semantics for typechecking
        
        if(errors.length > 0){
            const modal = document.getElementById("errorModal") as HTMLElement;
            modal.style.display = "block";
        } else {
            const modal = document.getElementById("validModal") as HTMLElement;
            modal.style.display = "block";
        }
    });

    const execute = (async () => {
        console.info('running current code...');
        // TODO : implement
    });


    // Listen to custom notifications coming from the server, here to call the parseAndValidate function
    client.onNotification('custom/ParseAndValidate', execute);

    // Listen to the button click to notify the server to parseAndValidate the code
    // win.parseAndValidate is called in the index.html file, line 13
    win.parseAndValidate = () => client.sendNotification('custom/ParseAndValidate');
    // TODO : to adapt
    win.execute = execute;
    win.typecheck = typecheck;
}