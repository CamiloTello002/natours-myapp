const mongoose = require('mongoose');
const dotenv = require('dotenv');
const app = require('./app');

process.on('uncaughtException', (err, reason) => {
  console.log(`Uncaught exception!\nThe reason is ${reason}`);
  console.log('exception: ', err);
  process.exit(1);
});

dotenv.config();

const databaseString = process.env.DATABASE_URL;

mongoose
  .connect(databaseString)
  .then(() => {
    console.log('Connected to database!');
    console.log(process.env.NODE_ENV);
  })
  .catch(() => {
    console.log(`Failed to connect to database :(`);
  });

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

process.on('unhandledRejection', (_, reason, promise) => {
  console.log(`Unhandled rejection at ${promise}\nThe reason is ${reason}`);
  server.close(() => {
    process.exit(1);
  });
});
