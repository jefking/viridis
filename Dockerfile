FROM mcr.microsoft.com/azure-functions/node:4-node16-slim

ENV AzureWebJobsScriptRoot=/home/site/wwwroot

COPY . .