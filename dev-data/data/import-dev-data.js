const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const Tour = require('../../models/tourModel');
const Review = require('../../models/reviewModel');
const User = require('../../models/userModel');

dotenv.config({ path: './../../.env' });

const databaseString = process.env.DATABASE_URL;

// Connecting to the database
mongoose.connect(databaseString).then((con) => {
  console.log('Successful :)');
});

const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, 'utf-8')); // parse it to JSON
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, 'utf-8')); // parse it to JSON
const reviews = JSON.parse(
  fs.readFileSync(`${__dirname}/reviews.json`, 'utf-8'),
); // parse it to JSON

// Upload JSON to the model
const importData = async () => {
  try {
    await Tour.create(tours);
    await User.create(users, { validateBeforeSave: false });
    await Review.create(reviews);
    console.log('Data has been successfully added :)');
    // console.log(`Tours added: ${fileJson.length}`);
    process.exit();
  } catch (err) {
    console.log("Data couldn't be added :(");
    console.log(err);
  }
};

// Delete all tours
const deleteData = async () => {
  try {
    await Tour.deleteMany({});
    await User.deleteMany({});
    await Review.deleteMany({});
    console.log('Data has been successfully deleted :)');
    process.exit();
  } catch (err) {
    console.log("Data couldn't be added :(");
    console.log(err);
  }
};

if (process.argv[2] === '--import') {
  importData();
} else if (process.argv[2] === '--delete') {
  deleteData();
}
