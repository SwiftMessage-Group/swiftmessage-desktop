// controls.js
const { ipcRenderer } = require('electron');

document.querySelector('.minimize').addEventListener('click', () => {
    ipcRenderer.send('minimize');
});

document.querySelector('.maximize').addEventListener('click', () => {
    ipcRenderer.send('maximize');
});

document.querySelector('.close').addEventListener('click', () => {
    ipcRenderer.send('close');
});
