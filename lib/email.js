import { Resend } from "resend";

export async function enviarCorreo({ asunto, html, xlsxBuffer, nombreArchivo }) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: process.env.MAIL_FROM,
    to: process.env.MAIL_TO.split(",").map((s) => s.trim()),
    subject: asunto,
    html,
    attachments: [{ filename: nombreArchivo, content: xlsxBuffer }],
  });
  if (error) throw new Error("Resend falló: " + JSON.stringify(error));
  return data;
}
