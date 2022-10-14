import React from 'react';
import { createRoot } from 'react-dom/client';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

const { VITE_API_URL } = import.meta.env;
const App = () => <SwaggerUI url={`${VITE_API_URL}/schema`} />;

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
createRoot(document.getElementById('swagger-ui')!).render(<App />);
