const nodemailer = require('nodemailer');
const pug = require('pug');
const htmltoText = require('html-to-text');

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `Camilo Tello <${process.env.EMAIL_FROM}>`;
  }

  newTransport() {
    // depending on the environment, the transport method
    // will change
    if (process.env.NODE_ENV === 'production') {
      // Sendgrid
      return 1;
    }
    // nodemailer (for development)
    return nodemailer.createTransport({
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
      port: process.env.EMAIL_PORT,
      host: process.env.EMAIL_HOST,
    });
  }

  // Send an email with an ALREADY DEFINED template
  async send(template, subject) {
    // 1) Render HTML based on a pug template
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject,
    });

    // 2) Define email options
    const mailOptions = {
      from: this.from, // sender address
      to: this.to,
      subject,
      html,
      text: htmltoText.convert(html),
    };

    // 3) Create a transport and send email
    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send('welcome', 'Welcome to the Natours family!');
  }

  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your password reset token (valid for only 10 minutes)',
    );
  }
};
