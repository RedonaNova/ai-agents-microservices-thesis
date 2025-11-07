import nodemailer from "nodemailer";
import {
  NEWS_SUMMARY_EMAIL_TEMPLATE,
  WELCOME_EMAIL_TEMPLATE,
} from "./templates";
export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.NODEMAILER_EMAIL!,
    pass: process.env.NODEMAILER_PASSWORD!,
  },
});
export const sendWelcomeEmail = async ({
  email,
  name,
  intro,
}: WelcomeEmailData) => {
  const htmlTemplate = WELCOME_EMAIL_TEMPLATE.replace("{{name}}", name).replace(
    "{{intro}}",
    intro
  );

  const mailOptions = {
    from: `"AI Агент" <${process.env.NODEMAILER_EMAIL!}>`,
    to: email,
    subject: "Тавтай морилно уу",
    text: "Манай системд нэгдсэнд баярлалаа. Танд хөрөнгийн зах зээлийн хөдөлгөөнийг ухаалгаар харах хэрэглүүртэй боллоо.",
    html: htmlTemplate,
  };
  await transporter.sendMail(mailOptions);
};

export const sendNewsSummaryEmail = async ({
  email,
  date,
  newsContent,
}: {
  email: string;
  date: string;
  newsContent: string;
}): Promise<void> => {
  const htmlTemplate = NEWS_SUMMARY_EMAIL_TEMPLATE.replace(
    "{{date}}",
    date
  ).replace("{{newsContent}}", newsContent);

  const mailOptions = {
    from: `"AI Агент" <${process.env.NODEMAILER_EMAIL!}>`,
    to: email,
    subject: `Өнөөдрийн зах зээлийн мэдээ - ${date}`,
    text: `Раднаабазарын дамжуулсан зах зээлийн мэдээ`,
    html: htmlTemplate,
  };

  await transporter.sendMail(mailOptions);
};
