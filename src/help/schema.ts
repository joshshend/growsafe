// Help & Support directory schema. Pure (no React). Entries live in resources.json.
import { z } from "zod";

export const HELP_CATEGORIES = [
  "emergency",
  "car_seat",
  "sleep",
  "home_safety_gear",
  "health_coverage",
  "food",
  "caregiver_support",
  "child_care",
] as const;
export type HelpCategory = (typeof HELP_CATEGORIES)[number];

const httpsUrl = z
  .string()
  .url()
  .refine((u) => u.startsWith("https://"), "must be an https URL");
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD");

const translation = z.object({
  title: z.string().min(1),
  what: z.string().min(1),
  who: z.string().min(1),
});

export const HelpEntrySchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "id must be kebab-case"),
    title: z.string().min(1),
    what: z.string().min(1),
    who: z.string().min(1),
    cost: z.enum(["Free", "Low cost", "Varies"]),
    category: z.enum(HELP_CATEGORIES),
    // "national", "texas", or a county slug such as "travis".
    scope: z.string().regex(/^(national|texas|[a-z]+(-[a-z]+)*)$/),
    url: httpsUrl,
    apply_url: httpsUrl.optional(),
    phone: z
      .string()
      .regex(/^\+?\d{3,11}$/, "digits only, e.g. 18002221222")
      .optional(),
    source_publisher: z.string().min(1),
    // Date the official page was opened and read. null when never opened.
    last_verified: isoDate.nullable(),
    verified: z.boolean(),
    es: translation.optional(),
  })
  .superRefine((e, ctx) => {
    if (e.verified && !e.last_verified)
      ctx.addIssue({ code: "custom", message: "verified:true needs last_verified" });
    if (!e.verified && e.last_verified)
      ctx.addIssue({ code: "custom", message: "verified:false must have last_verified null" });
  });
export type HelpEntry = z.infer<typeof HelpEntrySchema>;

export const HelpFileSchema = z.array(HelpEntrySchema).min(1);

export interface HelpIssue {
  id: string;
  message: string;
}

// Returns a readable list of problems (empty when valid). Also checks duplicate ids.
export function validateHelp(data: unknown): HelpIssue[] {
  const parsed = HelpFileSchema.safeParse(data);
  if (!parsed.success)
    return parsed.error.issues.map((i) => {
      const idx = typeof i.path[0] === "number" ? i.path[0] : -1;
      const id = Array.isArray(data) && idx >= 0 ? String((data[idx] as { id?: string })?.id) : "?";
      return { id, message: `${i.path.slice(1).join(".") || "(entry)"}: ${i.message}` };
    });
  const seen = new Set<string>();
  const issues: HelpIssue[] = [];
  for (const e of parsed.data) {
    if (seen.has(e.id)) issues.push({ id: e.id, message: "duplicate id" });
    seen.add(e.id);
  }
  return issues;
}
