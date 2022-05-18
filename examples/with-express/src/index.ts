/* eslint-disable @typescript-eslint/no-misused-promises */
import cors from 'cors';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { createOpenApiExpressMiddleware } from 'trpc-openapi';

import { openApiDocument } from './openapi';
import { appRouter, createContext } from './router';

const app = express();

app.use(cors());

// Respond with our OpenAPI schema
app.get('/api/openapi.json', (req, res) => res.status(200).json(openApiDocument));

// Handle incoming OpenAPI requests
app.use('/api', createOpenApiExpressMiddleware({ router: appRouter, createContext }));

// Serve Swagger UI with our OpenAPI schema
app.use('/', swaggerUi.serve);
app.get('/', swaggerUi.setup(openApiDocument));

app.listen(3001, () => {
  console.log('Server started on http://localhost:3001');
});
