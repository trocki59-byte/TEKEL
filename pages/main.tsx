import {createRoot} from 'react-dom/client';
import BayiApp from '../app/BayiApp';
import {localRequest} from '../lib/local-store.mjs';
import '../app/globals.css';
import '../app/invoices.css';
import '../app/camera.css';

createRoot(document.getElementById('root')!).render(<BayiApp localMode requestState={localRequest}/>);
