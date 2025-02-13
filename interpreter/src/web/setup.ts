
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

win.parseAndValidate = parseAndValidate;
win.typecheck = typecheck;
win.execute = execute;