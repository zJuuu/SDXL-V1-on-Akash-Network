
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
# Automatic1111 SD XL on Akash Network v1.0 

This repository contains the middleware that the user connected to in the first version of sdxl.akash.network.

The entire deployment consists of three main components, along with a log Database:

- SD XL Frontend - A1111-FE
- Automatic1111 WS the websocket server the user connects to
- Automatic1111 GPU Loadbalancer to balance API requests to Automatic1111 instances

Additionally, an NGINX Load Balancer was placed in front of each deployment to prevent outages.

## Environment Variables

To run this project, you will need to set environment variables. See the .env.examples or deploy.yml files 

## Deploy locally

You can easily deploy this locally. First you need a Automatic1111 instance. I used this sdl to deploy on akash: [SDL](A1111-sdxl.yml). Also you need a mysql database for logs. Then run `yarn` or `npm install` in each subdirectory and start each project. The frontend will be hosted on `localhost:3000`, WS Server on `localhost:3001` and the gpu loadbalancer on `localhost:3002`.

## Deploy on Akash Network

In each folder is a Dockerfile you can use to build the docker image. Please make sure to run `npm run build` or `yarn build` before building the image to compile the source code which is used by the docker image.

## Known Issues

This is the first version which was the start of whats now sdxl.akash.network it's functionality is limited and not very optimized. In later versions this was completely rewritten and therefore is only a example on how a basic image generation service could look like. 

A1111-GPU-LB:

Requests are always forwarded to a random A1111 instance, means that updating the options doesn't guarantee that they are correctly set on the Instance that generates the images