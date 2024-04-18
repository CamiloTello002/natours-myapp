const mongoose = require('mongoose');
const dotenv = require('dotenv');
const app = require('./app');

// Catches global exceptions :)
process.on('uncaughtException', (err, reason) => {
  console.log(`Uncaught exception!\nThe reason is ${reason}`);
  process.exit(1);
});

dotenv.config();

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);

// Connect to database
mongoose
  .connect(DB)
  .then((con) => {
    console.log('Connected to database!');
    console.log(process.env.NODE_ENV);
  })
  .catch(() => {
    console.log(`Failed to connect to database :(`);
  });

const port = process.env.PORT || 3000;
// 3) STARTS SERVER now
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

// Unhandled rejections
process.on('unhandledRejection', (err, reason, promise) => {
  console.log(`Unhandled rejection at ${promise}\nThe reason is ${reason}`);
  server.close((err) => {
    process.exit(1);
  });
});
