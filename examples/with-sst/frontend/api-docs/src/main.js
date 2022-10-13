/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/* eslint-disable @typescript-eslint/no-unsafe-call */
import SwaggerUI from 'swagger-ui';
import 'swagger-ui/dist/swagger-ui.css';

const { VITE_API_URL } = import.meta.env;

SwaggerUI({
  url: `${VITE_API_URL}/schema`,
  dom_id: '#swagger-ui',
  deepLinking: true,
  presets: [SwaggerUI.presets.apis, SwaggerUI.presets.SwaggerUIStandalonePreset],
});
