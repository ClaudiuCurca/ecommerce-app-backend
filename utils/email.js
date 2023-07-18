const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  // create transporter
  const transport = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 2525,
    auth: {
      user: "d26b9bf8eb9cd3",
      pass: "41c0ee42a5b349",
    },
  });

  // define optins for email
  const mailOptions = {
    from: "Claudiu Curca <hello@claudiu.com>",
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  await transport.sendMail(mailOptions);
};

module.exports = sendEmail;
