# SST + tRPC + Dynamo + Vite OpenAPI Docs 🚀

This example uses [SST](https://sst.dev/) to deploy both tRPC and OpenAPI API lambdas to AWS with DynamoDB for storage and a static Vite site with OpenAPI Docs.

First make sure your [AWS Credentials are configured](https://docs.sst.dev/advanced/iam-credentials)

First run `npm i` from the repo root
Then from within the the `with-sst` folder run the following to deploy your application in live lambda dev mode

```bash
npm start
```

You will be prompted for a stage, enter whatever you like here. Generally your name works well.

If you are using VSCode, once deployed you can use the `api.http` file in this example to send requests using the [VSCode Rest Client Extension](https://marketplace.visualstudio.com/items?itemName=humao.rest-client). Simply replace the url variable at the top with the newly generated OpenAPI URL from your SST deploy.

To run the OpenAPI Docs site navigate to `frontend/api-docs` and run

```bash
npm run dev
```