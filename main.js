import { startApp } from './ui/appController.js';

const APP_VERSION = '0.2.0';
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
startApp(APP_VERSION);
