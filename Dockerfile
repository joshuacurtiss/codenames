FROM node:16-alpine
WORKDIR /var/app
COPY package.json yarn.lock ./
RUN yarn install --production
ADD dist dist/
ADD src/server src/server/
EXPOSE 3000
CMD ["yarn", "start"]