import { z } from "zod";

export const payoutMethodSchema = z.enum(["zelle", "cash_app"]);
export type PayoutMethod = z.infer<typeof payoutMethodSchema>;
const email = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,63}$/;
const phone = /^\+1[2-9][0-9]{2}[2-9][0-9]{6}$/;
const cashtag = /^\$[A-Za-z][A-Za-z0-9]{0,19}$/;

export const withdrawalRequestSchema = z.object({
  amount: z.number().finite().positive().max(100000).multipleOf(0.01),
  payoutMethod: payoutMethodSchema,
  payoutIdentifier: z.string().trim().min(3).max(254).transform((value) => {
    if (!/^[+0-9() .-]+$/.test(value)) return value;
    const compact = value.replace(/[() .-]/g, "");
    if (/^[2-9][0-9]{9}$/.test(compact)) return `+1${compact}`;
    if (/^1[2-9][0-9]{9}$/.test(compact)) return `+${compact}`;
    return compact;
  }),
}).superRefine((data, ctx) => {
  if (!email.test(data.payoutIdentifier) && !phone.test(data.payoutIdentifier) && !(data.payoutMethod === "cash_app" && cashtag.test(data.payoutIdentifier))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["payoutIdentifier"], message: "Indica correo, teléfono válido de EE. UU. o $cashtag de Cash App; nunca un número de cuenta." });
  }
});