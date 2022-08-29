FROM node:16

# Create bot directory.
WORKDIR /usr/src/bot

# Install dependencies.
COPY package.json .
RUN npm install

# Build the code.
COPY . ./
RUN npm run build

# Start the bot.
CMD ["npm", "start"]