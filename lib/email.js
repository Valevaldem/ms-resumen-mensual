// lib/email.js — envía el correo con Resend (cuerpo HTML + Excel adjunto).
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function enviarCorreo({ asunto, html, xlsxBuffer, nombreArchivo }) {
  const { data, error } = await resend.emails.send({
    from: process.env.MAIL_FROM,                 // "Reportes María Salinas <valeria@mariasalinas.mx>"
    to: process.env.MAIL_TO.split(",").map((s) => s.trim()),
    subject: asunto,
    html,
    attachments: [{ filename: nombreArchivo, content: xlsxBuffer }],
  });
  if (error) throw new Error("Resend falló: " + JSON.stringify(error));
  return data;
}
