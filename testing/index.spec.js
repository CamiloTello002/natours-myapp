const request = require('supertest');
const app = require('../app');

describe('GET /', () => {
  test('Should respond with a 200 status code', async () => {
    const response = await request(app).get('/').send();
    expect(response.statusCode).toBe(200);
  });

  test('Should respond with an object', async () => {
    const response = await request(app).get('/').send();
    console.log(response.header);
  });
});
